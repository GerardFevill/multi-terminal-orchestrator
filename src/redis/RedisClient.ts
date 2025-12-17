/**
 * Client Redis Singleton
 * Single Responsibility (S) - Gestion de la connexion Redis uniquement
 */

import Redis from 'ioredis';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

export class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private subscriber: Redis;
  private isConnected: boolean = false;

  private constructor(config: RedisConfig = {}) {
    const url = config.url || process.env.REDIS_URL || 'redis://localhost:6379';

    this.client = new Redis(url, {
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[RedisClient] Max retries reached');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3
    });

    // Separate connection for subscriptions (required by Redis)
    this.subscriber = new Redis(url);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('[RedisClient] Connected to Redis');
    });

    this.client.on('error', (err) => {
      console.error('[RedisClient] Redis error:', err.message);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('[RedisClient] Redis connection closed');
    });
  }

  /**
   * Récupère l'instance singleton
   */
  static getInstance(config?: RedisConfig): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient(config);
    }
    return RedisClient.instance;
  }

  /**
   * Client principal pour les opérations standard
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Client dédié aux subscriptions Pub/Sub
   */
  getSubscriber(): Redis {
    return this.subscriber;
  }

  /**
   * Vérifie si connecté
   */
  connected(): boolean {
    return this.isConnected;
  }

  /**
   * Ping pour vérifier la connexion
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Ferme les connexions
   */
  async disconnect(): Promise<void> {
    await this.subscriber.quit();
    await this.client.quit();
    this.isConnected = false;
    console.log('[RedisClient] Disconnected from Redis');
  }

  /**
   * Reset l'instance (pour tests)
   */
  static resetInstance(): void {
    if (RedisClient.instance) {
      RedisClient.instance.disconnect();
      RedisClient.instance = null as any;
    }
  }
}
