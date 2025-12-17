/**
 * Interface Segregation Principle (I)
 * Séparer les responsabilités d'envoi et réception
 */

import { IMessage } from './IMessage';

// Interface pour envoyer des messages
export interface IMessageSender {
  send(message: IMessage): Promise<void>;
  broadcast(message: IMessage): Promise<void>;
}

// Interface pour recevoir des messages
export interface IMessageReceiver {
  receive(agentId: string): Promise<IMessage[]>;
  subscribe(agentId: string, callback: (message: IMessage) => void): void;
  unsubscribe(agentId: string): void;
}

// Interface combinée pour le broker complet
export interface IMessageBroker extends IMessageSender, IMessageReceiver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
