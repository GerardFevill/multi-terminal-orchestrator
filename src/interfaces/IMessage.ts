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
