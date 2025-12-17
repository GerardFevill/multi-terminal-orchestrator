/**
 * Liskov Substitution Principle (L) - Peut remplacer Agent
 * Single Responsibility Principle (S) - Exécute des tâches
 */

import { Agent } from './Agent';
import { ITaskExecutor } from '../interfaces/IAgent';
import { AgentRole, AgentStatus } from '../interfaces/IAgent';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage, ITask, IResult, MessageType, IRetryPolicy, DEFAULT_RETRY_POLICY } from '../interfaces/IMessage';
import { IStateStore, IAgentState } from '../interfaces/IStateStore';
import { ICache } from '../interfaces/ICache';
import { IRetryStrategy, ExponentialBackoffStrategy, withRetry } from '../tasks/RetryStrategy';

// Strategy Pattern pour les exécuteurs de tâches
export interface ITaskHandler {
  canHandle(taskType: string): boolean;
  handle(task: ITask): Promise<unknown>;
}

export interface WorkerAgentConfig {
  messageBroker: IMessageBroker;
  id?: string;
  stateStore?: IStateStore;
  cache?: ICache;
  retryPolicy?: IRetryPolicy;
}

export class WorkerAgent extends Agent implements ITaskExecutor {
  private taskHandlers: ITaskHandler[] = [];
  private currentTask: ITask | null = null;
  private cache?: ICache;
  private retryStrategy: IRetryStrategy;
  private executedTaskCount: number = 0;
  private failedTaskCount: number = 0;

  constructor(config: WorkerAgentConfig);
  constructor(messageBroker: IMessageBroker, id?: string);
  constructor(
    configOrBroker: WorkerAgentConfig | IMessageBroker,
    id?: string
  ) {
    // Extract parameters before super() call
    const isConfig = typeof configOrBroker === 'object' && 'messageBroker' in configOrBroker;
    const broker = isConfig ? configOrBroker.messageBroker : configOrBroker;
    const agentId = isConfig ? configOrBroker.id : id;
    const stateStore = isConfig ? configOrBroker.stateStore : undefined;

    super(AgentRole.WORKER, broker, agentId, stateStore);

    if (isConfig) {
      this.cache = configOrBroker.cache;
      this.retryStrategy = new ExponentialBackoffStrategy(configOrBroker.retryPolicy);
    } else {
      this.retryStrategy = new ExponentialBackoffStrategy(DEFAULT_RETRY_POLICY);
    }
  }

  /**
   * Configure le cache
   */
  setCache(cache: ICache): void {
    this.cache = cache;
  }

  /**
   * Configure la stratégie de retry
   */
  setRetryStrategy(strategy: IRetryStrategy): void {
    this.retryStrategy = strategy;
  }

  // Open/Closed - Ajouter des handlers sans modifier la classe
  registerHandler(handler: ITaskHandler): void {
    this.taskHandlers.push(handler);
  }

  canExecute(task: ITask): boolean {
    return this.taskHandlers.some(h => h.canHandle(task.content));
  }

  async execute(task: ITask): Promise<IResult> {
    this.status = AgentStatus.BUSY;
    this.currentTask = task;

    try {
      // Vérifie le cache d'abord
      const cacheKey = this.getCacheKey(task);
      if (this.cache) {
        const cachedResult = await this.cache.get<IResult>(cacheKey);
        if (cachedResult) {
          console.log(`[${this.id}] Cache hit pour tâche ${task.id}`);
          this.executedTaskCount++;
          return this.createResult(task, true, cachedResult.data);
        }
      }

      // Exécute avec retry
      const data = await withRetry(
        () => this.executeTask(task),
        this.retryStrategy,
        (attempt, error, delay) => {
          console.log(`[${this.id}] Retry ${attempt + 1} pour ${task.id} dans ${delay}ms: ${error.message}`);
        }
      );

      const result = this.createResult(task, true, data);

      // Met en cache le résultat
      if (this.cache) {
        await this.cache.set(cacheKey, result, {
          ttl: 3600, // 1 heure
          tags: ['task-result', `task-${task.id}`]
        });
      }

      await this.messageBroker.send(result);
      this.executedTaskCount++;
      return result;

    } catch (error) {
      this.failedTaskCount++;
      const errorResult = this.createResult(
        task,
        false,
        null,
        error instanceof Error ? error.message : String(error)
      );

      await this.messageBroker.send(errorResult);
      return errorResult;

    } finally {
      this.currentTask = null;
      this.status = AgentStatus.IDLE;
    }
  }

  /**
   * Exécute la tâche (sans retry)
   */
  private async executeTask(task: ITask): Promise<unknown> {
    const handler = this.taskHandlers.find(h => h.canHandle(task.content));

    if (!handler) {
      throw new Error(`Pas de handler pour: ${task.content}`);
    }

    return handler.handle(task);
  }

  /**
   * Crée un objet IResult
   */
  private createResult(
    task: ITask,
    success: boolean,
    data: unknown,
    errorMessage?: string
  ): IResult {
    return {
      id: `result-${Date.now()}`,
      from: this.id,
      to: task.from,
      content: success ? 'Tâche terminée' : `Erreur: ${errorMessage}`,
      timestamp: new Date(),
      type: MessageType.RESULT,
      taskId: task.id,
      success,
      data
    };
  }

  /**
   * Génère une clé de cache pour une tâche
   */
  private getCacheKey(task: ITask): string {
    // Hash simple du contenu de la tâche
    const hash = task.content
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
    return `task-result:${Math.abs(hash)}`;
  }

  protected async handleMessage(message: IMessage): Promise<void> {
    if (message.type === MessageType.TASK) {
      await this.execute(message as ITask);
    } else if (message.type === MessageType.BROADCAST) {
      console.log(`[${this.id}] Broadcast reçu: ${message.content}`);
    }
  }

  protected async onStart(): Promise<void> {
    console.log(`[${this.id}] Worker prêt avec ${this.taskHandlers.length} handlers`);
  }

  protected async onStop(): Promise<void> {
    if (this.currentTask) {
      console.log(`[${this.id}] Arrêt avec tâche en cours: ${this.currentTask.id}`);
    }
    console.log(`[${this.id}] Stats: ${this.executedTaskCount} exécutées, ${this.failedTaskCount} échouées`);
  }

  protected onStatusChange(status: AgentStatus): void {
    console.log(`[${this.id}] Status: ${status}`);
  }

  protected getCurrentTaskId(): string | undefined {
    return this.currentTask?.id;
  }

  protected getMetadata(): Record<string, unknown> {
    return {
      role: this.role,
      handlerCount: this.taskHandlers.length,
      executedTasks: this.executedTaskCount,
      failedTasks: this.failedTaskCount
    };
  }

  protected async onStateRestored(state: IAgentState): Promise<void> {
    // Restaure les compteurs si disponibles
    if (state.metadata.executedTasks) {
      this.executedTaskCount = state.metadata.executedTasks as number;
    }
    if (state.metadata.failedTasks) {
      this.failedTaskCount = state.metadata.failedTasks as number;
    }
  }

  /**
   * Récupère les statistiques du worker
   */
  getStats(): { executed: number; failed: number; successRate: number } {
    const total = this.executedTaskCount + this.failedTaskCount;
    return {
      executed: this.executedTaskCount,
      failed: this.failedTaskCount,
      successRate: total > 0 ? this.executedTaskCount / total : 1
    };
  }

  /**
   * Invalide le cache pour une tâche
   */
  async invalidateCache(taskId: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidateByTag(`task-${taskId}`);
    }
  }
}
