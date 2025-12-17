/**
 * Registry singleton pour les domaines
 * Single Responsibility (S) - Gestion des domaines uniquement
 */

import { IDomainConfig, IDomainRegistry, IDomainRole } from '../interfaces/IDomainConfig';

export class DomainRegistry implements IDomainRegistry {
  private static instance: DomainRegistry;
  private domains: Map<string, IDomainConfig> = new Map();

  private constructor() {}

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): DomainRegistry {
    if (!DomainRegistry.instance) {
      DomainRegistry.instance = new DomainRegistry();
    }
    return DomainRegistry.instance;
  }

  /**
   * Enregistre un domaine
   */
  register(config: IDomainConfig): void {
    if (this.domains.has(config.domainId)) {
      console.warn(`[DomainRegistry] Domain ${config.domainId} already registered, overwriting`);
    }
    this.domains.set(config.domainId, config);
    console.log(`[DomainRegistry] Registered domain: ${config.name} (${config.domainId})`);
  }

  /**
   * Récupère un domaine par son ID
   */
  get(domainId: string): IDomainConfig | undefined {
    return this.domains.get(domainId);
  }

  /**
   * Récupère tous les domaines
   */
  getAll(): IDomainConfig[] {
    return Array.from(this.domains.values());
  }

  /**
   * Récupère les rôles d'un domaine
   */
  getRoles(domainId: string): IDomainRole[] {
    const domain = this.domains.get(domainId);
    return domain?.roles || [];
  }

  /**
   * Vérifie si un rôle existe dans un domaine
   */
  hasRole(domainId: string, roleId: string): boolean {
    const domain = this.domains.get(domainId);
    return domain?.roles.some(r => r.id === roleId) || false;
  }

  /**
   * Vérifie si un domaine existe
   */
  hasDomain(domainId: string): boolean {
    return this.domains.has(domainId);
  }

  /**
   * Supprime un domaine
   */
  unregister(domainId: string): boolean {
    const existed = this.domains.has(domainId);
    this.domains.delete(domainId);
    if (existed) {
      console.log(`[DomainRegistry] Unregistered domain: ${domainId}`);
    }
    return existed;
  }

  /**
   * Vide le registry (pour tests)
   */
  clear(): void {
    this.domains.clear();
  }

  /**
   * Reset l'instance singleton (pour tests)
   */
  static resetInstance(): void {
    if (DomainRegistry.instance) {
      DomainRegistry.instance.clear();
    }
    DomainRegistry.instance = null as any;
  }

  /**
   * Liste les noms de tous les domaines
   */
  listDomains(): string[] {
    return Array.from(this.domains.keys());
  }

  /**
   * Récupère le nombre de domaines enregistrés
   */
  count(): number {
    return this.domains.size;
  }
}
