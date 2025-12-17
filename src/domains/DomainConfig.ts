/**
 * Configuration de domaine avec pattern Builder
 * Open/Closed (O) - Extensible sans modification
 */

import { IDomainConfig, IDomainRole, IRoutingRule } from '../interfaces/IDomainConfig';

export class DomainConfig implements IDomainConfig {
  constructor(
    public readonly domainId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly roles: IDomainRole[],
    public readonly routingRules: IRoutingRule[],
    public readonly defaultRole: string,
    public readonly pipelineSteps?: string[]
  ) {}

  /**
   * Crée un builder pour construire une config
   */
  static builder(domainId: string): DomainConfigBuilder {
    return new DomainConfigBuilder(domainId);
  }

  /**
   * Récupère un rôle par son ID
   */
  getRole(roleId: string): IDomainRole | undefined {
    return this.roles.find(r => r.id === roleId);
  }

  /**
   * Récupère le rôle de lead
   */
  getLeadRole(): IDomainRole | undefined {
    return this.roles.find(r => r.canLead);
  }

  /**
   * Vérifie si un rôle existe
   */
  hasRole(roleId: string): boolean {
    return this.roles.some(r => r.id === roleId);
  }

  /**
   * Récupère les règles de routage pour un rôle
   */
  getRoutingRulesForRole(roleId: string): IRoutingRule[] {
    return this.routingRules.filter(r => r.targetRoles.includes(roleId));
  }
}

/**
 * Builder pour créer des DomainConfig
 */
export class DomainConfigBuilder {
  private name: string = '';
  private description: string = '';
  private roles: IDomainRole[] = [];
  private routingRules: IRoutingRule[] = [];
  private defaultRole: string = '';
  private pipelineSteps: string[] = [];

  constructor(private domainId: string) {}

  /**
   * Définit le nom du domaine
   */
  withName(name: string): this {
    this.name = name;
    return this;
  }

  /**
   * Définit la description
   */
  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * Ajoute un rôle
   */
  addRole(role: IDomainRole): this {
    this.roles.push(role);
    return this;
  }

  /**
   * Ajoute plusieurs rôles
   */
  addRoles(roles: IDomainRole[]): this {
    this.roles.push(...roles);
    return this;
  }

  /**
   * Ajoute une règle de routage
   */
  addRoutingRule(rule: IRoutingRule): this {
    this.routingRules.push(rule);
    return this;
  }

  /**
   * Ajoute plusieurs règles de routage
   */
  addRoutingRules(rules: IRoutingRule[]): this {
    this.routingRules.push(...rules);
    return this;
  }

  /**
   * Définit le rôle par défaut
   */
  withDefaultRole(roleId: string): this {
    this.defaultRole = roleId;
    return this;
  }

  /**
   * Définit les étapes du pipeline
   */
  withPipeline(steps: string[]): this {
    this.pipelineSteps = steps;
    return this;
  }

  /**
   * Construit la configuration
   */
  build(): DomainConfig {
    if (!this.name) {
      throw new Error('Domain name is required');
    }
    if (this.roles.length === 0) {
      throw new Error('At least one role is required');
    }
    if (!this.defaultRole) {
      this.defaultRole = this.roles[0].id;
    }

    return new DomainConfig(
      this.domainId,
      this.name,
      this.description,
      this.roles,
      this.routingRules,
      this.defaultRole,
      this.pipelineSteps.length > 0 ? this.pipelineSteps : undefined
    );
  }
}
