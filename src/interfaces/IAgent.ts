/**
 * Interface Segregation Principle (I)
 * Dependency Inversion Principle (D) - Dépend des abstractions
 */

import { ITask, IResult } from './IMessage';

export enum AgentRole {
  COORDINATOR = 'coordinator',
  WORKER = 'worker',
  MONITOR = 'monitor'
}

export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ERROR = 'error'
}

export interface IAgent {
  readonly id: string;
  readonly role: AgentRole;
  status: AgentStatus;

  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): AgentStatus;
}

// Interface pour les agents qui exécutent des tâches
export interface ITaskExecutor {
  execute(task: ITask): Promise<IResult>;
  canExecute(task: ITask): boolean;
}

// Interface pour les agents qui distribuent des tâches
export interface ITaskDistributor {
  assignTask(task: ITask, agentId: string): Promise<void>;
  getAvailableWorkers(): Promise<string[]>;
}
