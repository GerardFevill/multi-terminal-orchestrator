/**
 * Queue de tâches avec dépendances et priorités
 * Single Responsibility (S) - Gestion de la queue uniquement
 */

import { ITask, IResult } from './IMessage';

export enum QueuedTaskStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export interface IQueuedTask extends ITask {
  dependencies: string[];
  status: QueuedTaskStatus;
  retryCount: number;
  maxRetries: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ITaskQueue {
  /**
   * Ajoute une tâche à la queue
   */
  enqueue(task: ITask, dependencies?: string[]): Promise<string>;

  /**
   * Retire et retourne la prochaine tâche prête
   */
  dequeue(): Promise<IQueuedTask | null>;

  /**
   * Regarde la prochaine tâche sans la retirer
   */
  peek(): Promise<IQueuedTask | null>;

  /**
   * Marque une tâche comme terminée
   */
  markComplete(taskId: string, result: IResult): Promise<void>;

  /**
   * Marque une tâche comme échouée
   */
  markFailed(taskId: string, error: Error): Promise<void>;

  /**
   * Récupère toutes les tâches prêtes à être exécutées
   */
  getReadyTasks(): Promise<IQueuedTask[]>;

  /**
   * Récupère le statut d'une tâche
   */
  getTaskStatus(taskId: string): Promise<QueuedTaskStatus | undefined>;

  /**
   * Nombre de tâches dans la queue
   */
  size(): Promise<number>;

  /**
   * Vide la queue
   */
  clear(): Promise<void>;
}
