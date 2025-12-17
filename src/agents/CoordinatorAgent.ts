/**
 * Liskov Substitution Principle (L) - Peut remplacer Agent
 * Single Responsibility Principle (S) - Distribue les tâches
 */

import { Agent } from './Agent';
import { ITaskDistributor, AgentRole, AgentStatus } from '../interfaces/IAgent';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage, ITask, IResult, MessageType } from '../interfaces/IMessage';

// Registry pour suivre les workers
interface WorkerInfo {
  id: string;
  status: AgentStatus;
  lastSeen: Date;
  taskCount: number;
}

export class CoordinatorAgent extends Agent implements ITaskDistributor {
  private workers: Map<string, WorkerInfo> = new Map();
  private pendingTasks: ITask[] = [];
  private results: Map<string, IResult> = new Map();

  constructor(
    messageBroker: IMessageBroker,
    id?: string
  ) {
    super(AgentRole.COORDINATOR, messageBroker, id);
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

  // Enregistrer un worker
  registerWorker(workerId: string): void {
    this.workers.set(workerId, {
      id: workerId,
      status: AgentStatus.IDLE,
      lastSeen: new Date(),
      taskCount: 0
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

    // Trouver un worker disponible (load balancing simple)
    const available = await this.getAvailableWorkers();

    if (available.length === 0) {
      this.pendingTasks.push(task);
      console.log(`[${this.id}] Pas de worker dispo, tâche en attente`);
      return task.id;
    }

    // Round-robin simple
    const targetWorker = available[0];
    await this.assignTask(task, targetWorker);

    return task.id;
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

  protected async handleMessage(message: IMessage): Promise<void> {
    if (message.type === MessageType.RESULT) {
      const result = message as IResult;
      this.results.set(result.taskId, result);

      // Marquer le worker comme disponible
      const worker = this.workers.get(message.from);
      if (worker) {
        worker.status = AgentStatus.IDLE;
        worker.lastSeen = new Date();
      }

      console.log(`[${this.id}] Résultat reçu pour ${result.taskId}: ${result.success ? 'OK' : 'ERREUR'}`);

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
}
