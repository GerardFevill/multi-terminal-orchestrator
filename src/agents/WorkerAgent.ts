/**
 * Liskov Substitution Principle (L) - Peut remplacer Agent
 * Single Responsibility Principle (S) - Exécute des tâches
 */

import { Agent } from './Agent';
import { ITaskExecutor } from '../interfaces/IAgent';
import { AgentRole, AgentStatus } from '../interfaces/IAgent';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage, ITask, IResult, MessageType } from '../interfaces/IMessage';

// Strategy Pattern pour les exécuteurs de tâches
export interface ITaskHandler {
  canHandle(taskType: string): boolean;
  handle(task: ITask): Promise<unknown>;
}

export class WorkerAgent extends Agent implements ITaskExecutor {
  private taskHandlers: ITaskHandler[] = [];
  private currentTask: ITask | null = null;

  constructor(
    messageBroker: IMessageBroker,
    id?: string
  ) {
    super(AgentRole.WORKER, messageBroker, id);
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
      const handler = this.taskHandlers.find(h => h.canHandle(task.content));

      if (!handler) {
        throw new Error(`Pas de handler pour: ${task.content}`);
      }

      const data = await handler.handle(task);

      const result: IResult = {
        id: `result-${Date.now()}`,
        from: this.id,
        to: task.from,
        content: 'Tâche terminée',
        timestamp: new Date(),
        type: MessageType.RESULT,
        taskId: task.id,
        success: true,
        data
      };

      await this.messageBroker.send(result);
      return result;

    } catch (error) {
      const errorResult: IResult = {
        id: `result-${Date.now()}`,
        from: this.id,
        to: task.from,
        content: `Erreur: ${error}`,
        timestamp: new Date(),
        type: MessageType.RESULT,
        taskId: task.id,
        success: false,
        data: null
      };

      await this.messageBroker.send(errorResult);
      return errorResult;

    } finally {
      this.currentTask = null;
      this.status = AgentStatus.IDLE;
    }
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
  }

  protected onStatusChange(status: AgentStatus): void {
    console.log(`[${this.id}] Status: ${status}`);
  }
}
