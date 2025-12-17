/**
 * Configuration de domaine pour équipes génériques
 * Interface Segregation (I) - Interfaces spécialisées
 */

export interface IDomainRole {
  id: string;
  name: string;
  skills: string[];
  canLead: boolean;
}

export interface IRoutingRule {
  keywords: string[];
  targetRoles: string[];
  priority: number;
}

export interface IDomainConfig {
  domainId: string;
  name: string;
  description: string;
  roles: IDomainRole[];
  routingRules: IRoutingRule[];
  defaultRole: string;
  pipelineSteps?: string[];
}

export interface IDomainRegistry {
  register(config: IDomainConfig): void;
  get(domainId: string): IDomainConfig | undefined;
  getAll(): IDomainConfig[];
  getRoles(domainId: string): IDomainRole[];
  hasRole(domainId: string, roleId: string): boolean;
}
