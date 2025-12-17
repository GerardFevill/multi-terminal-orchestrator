/**
 * Message Broker basé sur Redis Pub/Sub
 * Liskov Substitution (L) - Peut remplacer FileMessageBroker
 */

import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage } from '../interfaces/IMessage';
import { RedisClient } from './RedisClient';
import Redis from 'ioredis';

export class RedisMessageBroker implements IMessageBroker {
  private client: Redis;
  private subscriber: Redis;
  private subscriptions: Map<string, (message: IMessage) => void> = new Map();
  private redisClient: RedisClient;
  private connected: boolean = false;

  constructor(redisClient?: RedisClient) {
    this.redisClient = redisClient || RedisClient.getInstance();
    this.client = this.redisClient.getClient();
    this.subscriber = this.redisClient.getSubscriber();
  }

  /**
   * Connecte le broker (idempotent)
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    // Setup message handler for subscriber (only once)
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleIncomingMessage(channel, message);
    });

    // Subscribe to broadcast channel
    await this.subscriber.subscribe('broadcast:all');
    this.connected = true;
    console.log('[RedisMessageBroker] Connected and listening');
  }

  /**
   * Déconnecte le broker
   */
  async disconnect(): Promise<void> {
    for (const agentId of this.subscriptions.keys()) {
      await this.subscriber.unsubscribe(`agent:${agentId}`);
    }
    await this.subscriber.unsubscribe('broadcast:all');
    this.subscriptions.clear();
    console.log('[RedisMessageBroker] Disconnected');
  }

  /**
   * Envoie un message à un agent spécifique
   */
  async send(message: IMessage): Promise<void> {
    const channel = `agent:${message.to}`;
    const timestamp = message.timestamp instanceof Date
      ? message.timestamp.toISOString()
      : message.timestamp || new Date().toISOString();
    const serialized = JSON.stringify({
      ...message,
      timestamp
    });

    await this.client.publish(channel, serialized);

    // Store in list for persistence (in case agent is offline)
    await this.client.lpush(`inbox:${message.to}`, serialized);
    // Keep only last 100 messages
    await this.client.ltrim(`inbox:${message.to}`, 0, 99);
  }

  /**
   * Broadcast un message à tous les agents
   */
  async broadcast(message: IMessage): Promise<void> {
    const timestamp = message.timestamp instanceof Date
      ? message.timestamp.toISOString()
      : message.timestamp || new Date().toISOString();
    const serialized = JSON.stringify({
      ...message,
      timestamp
    });

    await this.client.publish('broadcast:all', serialized);

    // Store broadcast history
    await this.client.lpush('broadcasts', serialized);
    await this.client.ltrim('broadcasts', 0, 99);
  }

  /**
   * Récupère les messages en attente (pour agents qui se reconnectent)
   */
  async receive(agentId: string): Promise<IMessage[]> {
    const messages: IMessage[] = [];

    // Get all pending messages
    const pending = await this.client.lrange(`inbox:${agentId}`, 0, -1);

    for (const raw of pending) {
      try {
        const parsed = JSON.parse(raw);
        parsed.timestamp = new Date(parsed.timestamp);
        messages.push(parsed);
      } catch (err) {
        console.error('[RedisMessageBroker] Failed to parse message:', err);
      }
    }

    // Clear inbox after reading
    if (messages.length > 0) {
      await this.client.del(`inbox:${agentId}`);
    }

    return messages;
  }

  /**
   * Souscrit aux messages pour un agent
   */
  subscribe(agentId: string, callback: (message: IMessage) => void): void {
    const channel = `agent:${agentId}`;
    this.subscriptions.set(agentId, callback);

    this.subscriber.subscribe(channel);
    console.log(`[RedisMessageBroker] Agent ${agentId} subscribed`);
  }

  /**
   * Annule la souscription
   */
  unsubscribe(agentId: string): void {
    const channel = `agent:${agentId}`;
    this.subscriber.unsubscribe(channel);
    this.subscriptions.delete(agentId);
    console.log(`[RedisMessageBroker] Agent ${agentId} unsubscribed`);
  }

  /**
   * Gère les messages entrants
   */
  private handleIncomingMessage(channel: string, rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage);
      message.timestamp = new Date(message.timestamp);

      if (channel === 'broadcast:all') {
        // Broadcast to all subscribers
        for (const callback of this.subscriptions.values()) {
          callback(message);
        }
      } else {
        // Direct message to specific agent
        const agentId = channel.replace('agent:', '');
        const callback = this.subscriptions.get(agentId);
        if (callback) {
          callback(message);
        }
      }
    } catch (err) {
      console.error('[RedisMessageBroker] Failed to handle message:', err);
    }
  }

  /**
   * Publie sur un canal custom
   */
  async publishToChannel(channel: string, data: unknown): Promise<void> {
    await this.client.publish(channel, JSON.stringify(data));
  }

  /**
   * Souscrit à un canal custom
   */
  async subscribeToChannel(channel: string, callback: (data: unknown) => void): Promise<void> {
    this.subscriber.on('message', (ch: string, message: string) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(message));
        } catch {
          callback(message);
        }
      }
    });
    await this.subscriber.subscribe(channel);
  }
}
