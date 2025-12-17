/**
 * Stratégies de retry avec backoff exponentiel
 * Strategy Pattern - Différentes politiques de retry
 */

import { IRetryPolicy, DEFAULT_RETRY_POLICY } from '../interfaces/IMessage';

export interface IRetryStrategy {
  /**
   * Détermine si on doit réessayer
   */
  shouldRetry(attempt: number, error: Error): boolean;

  /**
   * Calcule le délai avant le prochain essai
   */
  getDelay(attempt: number): number;

  /**
   * Récupère la politique de retry
   */
  getPolicy(): IRetryPolicy;
}

/**
 * Stratégie avec backoff exponentiel
 */
export class ExponentialBackoffStrategy implements IRetryStrategy {
  private policy: IRetryPolicy;

  constructor(policy?: Partial<IRetryPolicy>) {
    this.policy = { ...DEFAULT_RETRY_POLICY, ...policy };
  }

  shouldRetry(attempt: number, error: Error): boolean {
    // Ne pas réessayer sur certaines erreurs
    const fatalErrors = ['FATAL', 'INVALID', 'UNAUTHORIZED', 'NOT_FOUND'];
    if (fatalErrors.some(fatal => error.message.includes(fatal))) {
      return false;
    }

    return attempt < this.policy.maxRetries;
  }

  getDelay(attempt: number): number {
    // Calcul du délai avec backoff exponentiel
    const delay = this.policy.baseDelayMs * Math.pow(this.policy.backoffMultiplier, attempt);

    // Ajoute du jitter (10% de variation aléatoire)
    const jitter = delay * 0.1 * Math.random();

    // Limite au max delay
    return Math.min(delay + jitter, this.policy.maxDelayMs);
  }

  getPolicy(): IRetryPolicy {
    return this.policy;
  }
}

/**
 * Stratégie avec délai fixe
 */
export class FixedDelayStrategy implements IRetryStrategy {
  private policy: IRetryPolicy;

  constructor(delayMs: number = 1000, maxRetries: number = 3) {
    this.policy = {
      maxRetries,
      baseDelayMs: delayMs,
      maxDelayMs: delayMs,
      backoffMultiplier: 1
    };
  }

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < this.policy.maxRetries;
  }

  getDelay(_attempt: number): number {
    return this.policy.baseDelayMs;
  }

  getPolicy(): IRetryPolicy {
    return this.policy;
  }
}

/**
 * Stratégie sans retry
 */
export class NoRetryStrategy implements IRetryStrategy {
  shouldRetry(_attempt: number, _error: Error): boolean {
    return false;
  }

  getDelay(_attempt: number): number {
    return 0;
  }

  getPolicy(): IRetryPolicy {
    return {
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      backoffMultiplier: 0
    };
  }
}

/**
 * Exécute une fonction avec retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  strategy: IRetryStrategy,
  onRetry?: (attempt: number, error: Error, delay: number) => void
): Promise<T> {
  let lastError: Error;
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!strategy.shouldRetry(attempt, lastError)) {
        throw lastError;
      }

      const delay = strategy.getDelay(attempt);

      if (onRetry) {
        onRetry(attempt, lastError, delay);
      }

      await sleep(delay);
      attempt++;
    }
  }
}

/**
 * Utilitaire de sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
