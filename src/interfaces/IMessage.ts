/**
 * Interface Segregation Principle (I)
 * Petites interfaces focalisées
 */

export interface IMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  type: MessageType;
}

export enum MessageType {
  TASK = 'TASK',
  RESULT = 'RESULT',
  BROADCAST = 'BROADCAST',
  STATUS = 'STATUS'
}

export interface ITask extends IMessage {
  type: MessageType.TASK;
  priority: number;
  deadline?: Date;
}

export interface IResult extends IMessage {
  type: MessageType.RESULT;
  taskId: string;
  success: boolean;
  data: unknown;
}

/**
 * Politique de retry avec backoff exponentiel
 */
export interface IRetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Tâche avec dépendances pour exécution parallèle
 */
export interface ITaskWithDeps extends ITask {
  dependencies: string[];
  retryPolicy?: IRetryPolicy;
}

/**
 * Politique de retry par défaut
 */
export const DEFAULT_RETRY_POLICY: IRetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};
