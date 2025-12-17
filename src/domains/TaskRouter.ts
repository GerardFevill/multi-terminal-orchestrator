/**
 * Routeur de tâches utilisant les stratégies
 * Strategy Pattern - Compose plusieurs stratégies
 */

import { ITask } from '../interfaces/IMessage';
import { ITeamMember } from '../interfaces/ITeam';
import { IDomainConfig } from '../interfaces/IDomainConfig';
import { IRoutingStrategy } from './strategies/IRoutingStrategy';
import { KeywordRoutingStrategy } from './strategies/KeywordRoutingStrategy';
import { SkillMatchingStrategy } from './strategies/SkillMatchingStrategy';

export class TaskRouter {
  private strategies: IRoutingStrategy[] = [];
  private domainConfig: IDomainConfig;

  constructor(domainConfig: IDomainConfig) {
    this.domainConfig = domainConfig;

    // Stratégies par défaut
    this.addStrategy(new KeywordRoutingStrategy());
    this.addStrategy(new SkillMatchingStrategy());
  }

  /**
   * Ajoute une stratégie de routage
   */
  addStrategy(strategy: IRoutingStrategy): void {
    this.strategies.push(strategy);
    console.log(`[TaskRouter] Added strategy: ${strategy.name}`);
  }

  /**
   * Retire une stratégie par son nom
   */
  removeStrategy(name: string): boolean {
    const index = this.strategies.findIndex(s => s.name === name);
    if (index !== -1) {
      this.strategies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Définit les stratégies (remplace toutes les existantes)
   */
  setStrategies(strategies: IRoutingStrategy[]): void {
    this.strategies = strategies;
  }

  /**
   * Trouve le meilleur membre pour une tâche
   */
  findBestMember(task: ITask, members: ITeamMember[]): ITeamMember | undefined {
    // Filtre les membres du bon domaine
    const domainMembers = members.filter(m => m.domainId === this.domainConfig.domainId);

    if (domainMembers.length === 0) {
      console.log(`[TaskRouter] No members found for domain ${this.domainConfig.domainId}`);
      return undefined;
    }

    // Essaie chaque stratégie dans l'ordre
    for (const strategy of this.strategies) {
      const member = strategy.route(task, domainMembers, this.domainConfig);
      if (member) {
        console.log(`[TaskRouter] Strategy ${strategy.name} found member: ${member.agent.id}`);
        return member;
      }
    }

    // Fallback: retourne le membre avec le rôle par défaut
    const defaultMember = domainMembers.find(m =>
      m.roleId === this.domainConfig.defaultRole &&
      m.availability > 0
    );

    if (defaultMember) {
      console.log(`[TaskRouter] Fallback to default role: ${defaultMember.agent.id}`);
      return defaultMember;
    }

    // Dernier recours: n'importe quel membre disponible
    const anyAvailable = domainMembers.find(m => m.availability > 0);
    if (anyAvailable) {
      console.log(`[TaskRouter] Fallback to any available: ${anyAvailable.agent.id}`);
    }

    return anyAvailable;
  }

  /**
   * Route une tâche vers un rôle spécifique
   */
  findMemberByRole(roleId: string, members: ITeamMember[]): ITeamMember | undefined {
    return members.find(m =>
      m.roleId === roleId &&
      m.domainId === this.domainConfig.domainId &&
      m.availability > 0
    );
  }

  /**
   * Récupère tous les membres disponibles pour un rôle
   */
  getMembersByRole(roleId: string, members: ITeamMember[]): ITeamMember[] {
    return members.filter(m =>
      m.roleId === roleId &&
      m.domainId === this.domainConfig.domainId &&
      m.availability > 0
    );
  }

  /**
   * Récupère la configuration du domaine
   */
  getDomainConfig(): IDomainConfig {
    return this.domainConfig;
  }

  /**
   * Met à jour la configuration du domaine
   */
  setDomainConfig(config: IDomainConfig): void {
    this.domainConfig = config;
  }
}
