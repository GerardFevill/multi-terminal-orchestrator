/**
 * Cache Redis pour réponses et données
 * Single Responsibility (S) - Cache uniquement
 */

import { ICache, ICacheOptions } from '../interfaces/ICache';
import { RedisClient } from './RedisClient';
import Redis from 'ioredis';

export class RedisCache implements ICache {
  private client: Redis;
  private readonly PREFIX = 'cache:';
  private readonly TAG_PREFIX = 'tag:';
  private readonly DEFAULT_TTL = 3600; // 1 heure

  constructor(redisClient?: RedisClient) {
    const rc = redisClient || RedisClient.getInstance();
    this.client = rc.getClient();
  }

  /**
   * Récupère une valeur du cache
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(`${this.PREFIX}${key}`);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  /**
   * Stocke une valeur dans le cache
   */
  async set<T>(key: string, value: T, options?: ICacheOptions): Promise<void> {
    const ttl = options?.ttl || this.DEFAULT_TTL;
    const fullKey = `${this.PREFIX}${key}`;
    const serialized = JSON.stringify(value);

    await this.client.setex(fullKey, ttl, serialized);

    // Associe les tags pour invalidation groupée
    if (options?.tags) {
      const pipeline = this.client.pipeline();
      for (const tag of options.tags) {
        pipeline.sadd(`${this.TAG_PREFIX}${tag}`, fullKey);
        // TTL sur le set de tags aussi
        pipeline.expire(`${this.TAG_PREFIX}${tag}`, ttl + 60);
      }
      await pipeline.exec();
    }
  }

  /**
   * Supprime une valeur du cache
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(`${this.PREFIX}${key}`);
    return result > 0;
  }

  /**
   * Vérifie si une clé existe
   */
  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(`${this.PREFIX}${key}`);
    return exists === 1;
  }

  /**
   * Invalide toutes les entrées avec un tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = `${this.TAG_PREFIX}${tag}`;
    const keys = await this.client.smembers(tagKey);

    if (keys.length > 0) {
      const pipeline = this.client.pipeline();
      for (const key of keys) {
        pipeline.del(key);
      }
      pipeline.del(tagKey);
      await pipeline.exec();
    }
  }

  /**
   * Vide tout le cache
   */
  async clear(): Promise<void> {
    const keys = await this.client.keys(`${this.PREFIX}*`);
    const tagKeys = await this.client.keys(`${this.TAG_PREFIX}*`);

    const allKeys = [...keys, ...tagKeys];
    if (allKeys.length > 0) {
      await this.client.del(...allKeys);
    }
  }

  /**
   * Récupère ou calcule une valeur (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: ICacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Incrémente un compteur
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    return this.client.incrby(`${this.PREFIX}${key}`, amount);
  }

  /**
   * Récupère le TTL restant d'une clé
   */
  async getTTL(key: string): Promise<number> {
    return this.client.ttl(`${this.PREFIX}${key}`);
  }

  /**
   * Met à jour le TTL d'une clé existante
   */
  async touch(key: string, ttl?: number): Promise<boolean> {
    const newTtl = ttl || this.DEFAULT_TTL;
    const result = await this.client.expire(`${this.PREFIX}${key}`, newTtl);
    return result === 1;
  }
}
