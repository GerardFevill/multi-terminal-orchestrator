/**
 * Open/Closed Principle (O) - Ouvert à l'extension, fermé à la modification
 * Single Responsibility Principle (S) - Gère uniquement le cycle de vie de l'agent
 * Dependency Inversion Principle (D) - Dépend de IMessageBroker, pas d'une implémentation
 */

import { IAgent, AgentRole, AgentStatus } from '../interfaces/IAgent';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage } from '../interfaces/IMessage';
import { IStateStore, IAgentState } from '../interfaces/IStateStore';
import { generateId } from '../utils/generateId';

export abstract class Agent implements IAgent {
  readonly id: string;
  readonly role: AgentRole;
  protected _status: AgentStatus = AgentStatus.OFFLINE;
  protected messageBroker: IMessageBroker;
  protected stateStore?: IStateStore;
  protected heartbeatInterval?: NodeJS.Timeout;
  protected readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 secondes

  constructor(
    role: AgentRole,
    messageBroker: IMessageBroker,
    id?: string,
    stateStore?: IStateStore
  ) {
    this.id = id || generateId();
    this.role = role;
    this.messageBroker = messageBroker;
    this.stateStore = stateStore;
  }

  get status(): AgentStatus {
    return this._status;
  }

  set status(value: AgentStatus) {
    this._status = value;
    this.onStatusChange(value);
    // Sauvegarde l'état si le store est disponible
    this.persistState().catch(err =>
      console.error(`[${this.id}] Failed to persist state:`, err)
    );
  }

  async start(): Promise<void> {
    await this.messageBroker.connect();
    this.messageBroker.subscribe(this.id, this.handleMessage.bind(this));
    this._status = AgentStatus.IDLE;

    // Restaure l'état précédent si disponible
    await this.restoreState();

    // Démarre le heartbeat
    this.startHeartbeat();

    await this.onStart();
    console.log(`[${this.id}] Agent ${this.role} démarré`);
  }

  async stop(): Promise<void> {
    // Arrête le heartbeat
    this.stopHeartbeat();

    this.messageBroker.unsubscribe(this.id);
    await this.messageBroker.disconnect();
    this._status = AgentStatus.OFFLINE;

    // Sauvegarde l'état final
    await this.persistState();

    await this.onStop();
    console.log(`[${this.id}] Agent ${this.role} arrêté`);
  }

  getStatus(): AgentStatus {
    return this._status;
  }

  /**
   * Configure le state store
   */
  setStateStore(store: IStateStore): void {
    this.stateStore = store;
  }

  /**
   * Sauvegarde l'état de l'agent dans Redis
   */
  protected async persistState(): Promise<void> {
    if (!this.stateStore) return;

    const state: IAgentState = {
      agentId: this.id,
      status: this._status,
      currentTaskId: this.getCurrentTaskId(),
      lastSeen: new Date(),
      metadata: this.getMetadata()
    };

    await this.stateStore.saveAgentState(state);
  }

  /**
   * Restaure l'état de l'agent depuis Redis
   */
  protected async restoreState(): Promise<void> {
    if (!this.stateStore) return;

    const state = await this.stateStore.getAgentState(this.id);
    if (state) {
      console.log(`[${this.id}] État restauré (dernier status: ${state.status})`);
      await this.onStateRestored(state);
    }
  }

  /**
   * Démarre le heartbeat pour signaler que l'agent est vivant
   */
  protected startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      if (this.stateStore) {
        await this.stateStore.updateHeartbeat(this.id);
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Arrête le heartbeat
   */
  protected stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Récupère l'ID de la tâche en cours (à override)
   */
  protected getCurrentTaskId(): string | undefined {
    return undefined;
  }

  /**
   * Récupère les métadonnées de l'agent (à override)
   */
  protected getMetadata(): Record<string, unknown> {
    return {
      role: this.role
    };
  }

  /**
   * Appelé quand l'état est restauré (à override)
   */
  protected async onStateRestored(_state: IAgentState): Promise<void> {
    // Override dans les sous-classes si nécessaire
  }

  // Template Method Pattern - Les sous-classes implémentent ces méthodes
  protected abstract handleMessage(message: IMessage): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onStatusChange(status: AgentStatus): void;
}
