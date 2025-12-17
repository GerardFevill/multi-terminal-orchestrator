/**
 * Liskov Substitution Principle (L) - Peut remplacer Agent
 * Single Responsibility Principle (S) - Distribue les tâches
 */

import { Agent } from './Agent';
import { ITaskDistributor, AgentRole, AgentStatus } from '../interfaces/IAgent';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage, ITask, IResult, MessageType, ITaskWithDeps } from '../interfaces/IMessage';
import { IStateStore, IAgentState } from '../interfaces/IStateStore';
import { ITaskQueue, QueuedTaskStatus } from '../interfaces/ITaskQueue';

// Registry pour suivre les workers
interface WorkerInfo {
  id: string;
  status: AgentStatus;
  lastSeen: Date;
  taskCount: number;
  successRate: number;
}

export interface CoordinatorAgentConfig {
  messageBroker: IMessageBroker;
  id?: string;
  stateStore?: IStateStore;
  taskQueue?: ITaskQueue;
}

export class CoordinatorAgent extends Agent implements ITaskDistributor {
  private workers: Map<string, WorkerInfo> = new Map();
  private pendingTasks: ITask[] = [];
  private results: Map<string, IResult> = new Map();
  private taskQueue?: ITaskQueue;
  private pendingPromises: Map<string, {
    resolve: (result: IResult) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(config: CoordinatorAgentConfig);
  constructor(messageBroker: IMessageBroker, id?: string);
  constructor(
    configOrBroker: CoordinatorAgentConfig | IMessageBroker,
    id?: string
  ) {
    // Extract parameters before super() call
    const isConfig = typeof configOrBroker === 'object' && 'messageBroker' in configOrBroker;
    const broker = isConfig ? configOrBroker.messageBroker : configOrBroker;
    const agentId = isConfig ? configOrBroker.id : id;
    const stateStore = isConfig ? configOrBroker.stateStore : undefined;

    super(AgentRole.COORDINATOR, broker, agentId, stateStore);

    if (isConfig && configOrBroker.taskQueue) {
      this.taskQueue = configOrBroker.taskQueue;
    }
  }

  /**
   * Configure la task queue
   */
  setTaskQueue(queue: ITaskQueue): void {
    this.taskQueue = queue;
  }

  async assignTask(task: ITask, agentId: string): Promise<void> {
    const worker = this.workers.get(agentId);

    if (!worker) {
      throw new Error(`Worker inconnu: ${agentId}`);
    }

    if (worker.status !== AgentStatus.IDLE) {
      // Mettre en file d'attente
      this.pendingTasks.push(task);
      console.log(`[${this.id}] Tâche mise en attente: ${task.id}`);
      return;
    }

    const taskMessage: ITask = {
      ...task,
      from: this.id,
      to: agentId
    };

    await this.messageBroker.send(taskMessage);
    worker.status = AgentStatus.BUSY;
    worker.taskCount++;

    console.log(`[${this.id}] Tâche ${task.id} assignée à ${agentId}`);
  }

  async getAvailableWorkers(): Promise<string[]> {
    return Array.from(this.workers.entries())
      .filter(([_, info]) => info.status === AgentStatus.IDLE)
      .map(([id]) => id);
  }

  /**
   * Récupère les workers triés par performance
   */
  async getWorkersByPerformance(): Promise<string[]> {
    return Array.from(this.workers.entries())
      .filter(([_, info]) => info.status === AgentStatus.IDLE)
      .sort((a, b) => b[1].successRate - a[1].successRate)
      .map(([id]) => id);
  }

  // Enregistrer un worker
  registerWorker(workerId: string): void {
    this.workers.set(workerId, {
      id: workerId,
      status: AgentStatus.IDLE,
      lastSeen: new Date(),
      taskCount: 0,
      successRate: 1
    });
    console.log(`[${this.id}] Worker enregistré: ${workerId}`);
  }

  // Créer et distribuer une tâche
  async createTask(content: string, priority: number = 1): Promise<string> {
    const task: ITask = {
      id: `task-${Date.now()}`,
      from: this.id,
      to: '',
      content,
      timestamp: new Date(),
      type: MessageType.TASK,
      priority
    };

    // Si task queue disponible, utilise-la
    if (this.taskQueue) {
      return this.taskQueue.enqueue(task);
    }

    // Sinon, comportement legacy
    const available = await this.getAvailableWorkers();

    if (available.length === 0) {
      this.pendingTasks.push(task);
      console.log(`[${this.id}] Pas de worker dispo, tâche en attente`);
      return task.id;
    }

    const targetWorker = available[0];
    await this.assignTask(task, targetWorker);

    return task.id;
  }

  /**
   * Exécute plusieurs tâches en parallèle
   */
  async executeTasksInParallel(tasks: ITask[]): Promise<Map<string, IResult>> {
    const results = new Map<string, IResult>();

    // Groupe les tâches par leurs dépendances
    const taskMap = new Map<string, ITask>();
    const dependencyGraph = new Map<string, string[]>();

    for (const task of tasks) {
      taskMap.set(task.id, task);
      const deps = (task as ITaskWithDeps).dependencies || [];
      dependencyGraph.set(task.id, deps);
    }

    // Exécute par vagues (wave execution)
    const remainingTasks = new Set(taskMap.keys());

    while (remainingTasks.size > 0) {
      // Trouve les tâches sans dépendances en attente
      const readyTasks: ITask[] = [];

      for (const taskId of remainingTasks) {
        const deps = dependencyGraph.get(taskId) || [];
        const pendingDeps = deps.filter(d => !results.has(d));

        if (pendingDeps.length === 0) {
          readyTasks.push(taskMap.get(taskId)!);
        }
      }

      if (readyTasks.length === 0 && remainingTasks.size > 0) {
        throw new Error('Dépendance circulaire détectée ou tâches non résolvables');
      }

      // Exécute les tâches prêtes en parallèle
      const promises = readyTasks.map(async (task) => {
        const workers = await this.getWorkersByPerformance();

        if (workers.length === 0) {
          throw new Error(`Pas de worker disponible pour la tâche ${task.id}`);
        }

        // Assigne et attend le résultat
        await this.assignTask(task, workers[0]);
        return this.waitForResult(task.id);
      });

      // Attend que toutes les tâches de cette vague soient terminées
      const waveResults = await Promise.all(promises);

      // Stocke les résultats et retire de la queue
      for (const result of waveResults) {
        results.set(result.taskId, result);
        remainingTasks.delete(result.taskId);
      }

      console.log(`[${this.id}] Vague terminée: ${waveResults.length} tâches`);
    }

    return results;
  }

  /**
   * Attend le résultat d'une tâche
   */
  private waitForResult(taskId: string, timeoutMs: number = 60000): Promise<IResult> {
    return new Promise((resolve, reject) => {
      // Vérifie si le résultat existe déjà
      const existingResult = this.results.get(taskId);
      if (existingResult) {
        resolve(existingResult);
        return;
      }

      // Configure le timeout
      const timeout = setTimeout(() => {
        this.pendingPromises.delete(taskId);
        reject(new Error(`Timeout en attendant la tâche ${taskId}`));
      }, timeoutMs);

      // Enregistre la promesse pour résolution future
      this.pendingPromises.set(taskId, {
        resolve: (result: IResult) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Traite les tâches depuis la queue Redis
   */
  async processTaskQueue(): Promise<void> {
    if (!this.taskQueue) {
      console.log(`[${this.id}] Pas de task queue configurée`);
      return;
    }

    const readyTasks = await this.taskQueue.getReadyTasks();
    const workers = await this.getAvailableWorkers();

    const tasksToProcess = Math.min(readyTasks.length, workers.length);

    for (let i = 0; i < tasksToProcess; i++) {
      const task = await this.taskQueue.dequeue();
      if (task) {
        await this.assignTask(task, workers[i]);
      }
    }

    if (tasksToProcess > 0) {
      console.log(`[${this.id}] ${tasksToProcess} tâches distribuées depuis la queue`);
    }
  }

  // Broadcast à tous les workers
  async broadcastToWorkers(content: string): Promise<void> {
    const message: IMessage = {
      id: `broadcast-${Date.now()}`,
      from: this.id,
      to: 'all',
      content,
      timestamp: new Date(),
      type: MessageType.BROADCAST
    };

    await this.messageBroker.broadcast(message);
  }

  // Obtenir les résultats
  getResults(): IResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Récupère le résultat d'une tâche spécifique
   */
  getResult(taskId: string): IResult | undefined {
    return this.results.get(taskId);
  }

  protected async handleMessage(message: IMessage): Promise<void> {
    if (message.type === MessageType.RESULT) {
      const result = message as IResult;
      this.results.set(result.taskId, result);

      // Marquer le worker comme disponible
      const worker = this.workers.get(message.from);
      if (worker) {
        worker.status = AgentStatus.IDLE;
        worker.lastSeen = new Date();

        // Met à jour le taux de succès
        const totalTasks = worker.taskCount;
        const successCount = result.success
          ? worker.successRate * (totalTasks - 1) + 1
          : worker.successRate * (totalTasks - 1);
        worker.successRate = totalTasks > 0 ? successCount / totalTasks : 1;
      }

      console.log(`[${this.id}] Résultat reçu pour ${result.taskId}: ${result.success ? 'OK' : 'ERREUR'}`);

      // Marque comme complété dans la task queue
      if (this.taskQueue) {
        if (result.success) {
          await this.taskQueue.markComplete(result.taskId, result);
        } else {
          await this.taskQueue.markFailed(result.taskId, new Error(result.content));
        }
      }

      // Résout la promesse en attente si elle existe
      const pending = this.pendingPromises.get(result.taskId);
      if (pending) {
        pending.resolve(result);
        this.pendingPromises.delete(result.taskId);
      }

      // Distribuer les tâches en attente
      await this.processPendingTasks();

    } else if (message.type === MessageType.STATUS) {
      this.updateWorkerStatus(message.from, message.content as AgentStatus);
    }
  }

  private async processPendingTasks(): Promise<void> {
    while (this.pendingTasks.length > 0) {
      const available = await this.getAvailableWorkers();
      if (available.length === 0) break;

      const task = this.pendingTasks.shift()!;
      await this.assignTask(task, available[0]);
    }
  }

  private updateWorkerStatus(workerId: string, status: AgentStatus): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = status;
      worker.lastSeen = new Date();
    }
  }

  protected async onStart(): Promise<void> {
    console.log(`[${this.id}] Coordinator prêt`);
  }

  protected async onStop(): Promise<void> {
    console.log(`[${this.id}] Coordinator arrêté. Tâches en attente: ${this.pendingTasks.length}`);
  }

  protected onStatusChange(status: AgentStatus): void {
    console.log(`[${this.id}] Status: ${status}`);
  }

  protected getMetadata(): Record<string, unknown> {
    return {
      role: this.role,
      workerCount: this.workers.size,
      pendingTaskCount: this.pendingTasks.length,
      resultCount: this.results.size
    };
  }

  protected async onStateRestored(state: IAgentState): Promise<void> {
    console.log(`[${this.id}] État restauré avec ${state.metadata.workerCount || 0} workers`);
  }

  /**
   * Récupère les statistiques du coordinator
   */
  getStats(): {
    workers: number;
    activeWorkers: number;
    pendingTasks: number;
    completedTasks: number;
  } {
    const activeWorkers = Array.from(this.workers.values())
      .filter(w => w.status === AgentStatus.BUSY).length;

    return {
      workers: this.workers.size,
      activeWorkers,
      pendingTasks: this.pendingTasks.length,
      completedTasks: this.results.size
    };
  }
}
