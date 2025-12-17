/**
 * Open/Closed Principle (O) - Ouvert à l'extension, fermé à la modification
 * Single Responsibility Principle (S) - Gère uniquement le cycle de vie de l'agent
 * Dependency Inversion Principle (D) - Dépend de IMessageBroker, pas d'une implémentation
 */

import { IAgent, AgentRole, AgentStatus } from '../interfaces/IAgent';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage } from '../interfaces/IMessage';
import { generateId } from '../utils/generateId';

export abstract class Agent implements IAgent {
  readonly id: string;
  readonly role: AgentRole;
  protected _status: AgentStatus = AgentStatus.OFFLINE;
  protected messageBroker: IMessageBroker;

  constructor(
    role: AgentRole,
    messageBroker: IMessageBroker,  // Injection de dépendance
    id?: string
  ) {
    this.id = id || generateId();
    this.role = role;
    this.messageBroker = messageBroker;
  }

  get status(): AgentStatus {
    return this._status;
  }

  set status(value: AgentStatus) {
    this._status = value;
    this.onStatusChange(value);
  }

  async start(): Promise<void> {
    await this.messageBroker.connect();
    this.messageBroker.subscribe(this.id, this.handleMessage.bind(this));
    this._status = AgentStatus.IDLE;
    await this.onStart();
    console.log(`[${this.id}] Agent ${this.role} démarré`);
  }

  async stop(): Promise<void> {
    this.messageBroker.unsubscribe(this.id);
    await this.messageBroker.disconnect();
    this._status = AgentStatus.OFFLINE;
    await this.onStop();
    console.log(`[${this.id}] Agent ${this.role} arrêté`);
  }

  getStatus(): AgentStatus {
    return this._status;
  }

  // Template Method Pattern - Les sous-classes implémentent ces méthodes
  protected abstract handleMessage(message: IMessage): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onStatusChange(status: AgentStatus): void;
}
