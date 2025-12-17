/**
 * Interface de cache pour réponses et données
 * Interface Segregation (I) - Cache uniquement
 */

export interface ICacheOptions {
  /** Durée de vie en secondes */
  ttl?: number;
  /** Tags pour invalidation groupée */
  tags?: string[];
}

export interface ICache {
  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stocke une valeur dans le cache
   */
  set<T>(key: string, value: T, options?: ICacheOptions): Promise<void>;

  /**
   * Supprime une valeur du cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Vérifie si une clé existe
   */
  has(key: string): Promise<boolean>;

  /**
   * Invalide toutes les entrées avec un tag
   */
  invalidateByTag(tag: string): Promise<void>;

  /**
   * Vide tout le cache
   */
  clear(): Promise<void>;
}
