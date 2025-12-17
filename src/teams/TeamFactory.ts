/**
 * Factory pour créer des équipes préconfigurées
 * Single Responsibility (S) - Crée des équipes
 * Open/Closed (O) - Extensible via DomainRegistry
 */

import { Team, TeamConfig } from './Team';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { WorkerAgent } from '../agents/WorkerAgent';
import { createDefaultHandlers } from '../tasks/TaskHandlers';
import { DomainRegistry } from '../domains/DomainRegistry';
import { IDomainConfig } from '../interfaces/IDomainConfig';

export interface TeamFactoryConfig {
  messageBroker: IMessageBroker;
}

/**
 * @deprecated Utiliser DomainRegistry à la place
 */
export enum TeamType {
  DEVELOPMENT = 'development',
  REVIEW = 'review',
  RESEARCH = 'research',
  MINIMAL = 'minimal',
  SOCIAL_MEDIA = 'social-media'
}

export class TeamFactory {
  private messageBroker: IMessageBroker;
  private registry: DomainRegistry;

  constructor(config: TeamFactoryConfig);
  constructor(messageBroker: IMessageBroker);
  constructor(configOrBroker: TeamFactoryConfig | IMessageBroker) {
    if ('messageBroker' in configOrBroker) {
      this.messageBroker = configOrBroker.messageBroker;
    } else {
      this.messageBroker = configOrBroker;
    }
    this.registry = DomainRegistry.getInstance();
  }

  /**
   * Crée une équipe à partir d'un domaine enregistré
   */
  createTeamFromDomain(domainId: string, teamName: string): Team {
    const domainConfig = this.registry.get(domainId);

    if (!domainConfig) {
      throw new Error(`Domain ${domainId} not found. Did you register it?`);
    }

    const team = new Team({
      name: teamName,
      messageBroker: this.messageBroker,
      domainId: domainId
    });

    // Crée les agents pour chaque rôle du domaine
    for (const role of domainConfig.roles) {
      const agent = this.createAgent(`${teamName}-${role.id}`);
      team.addMember(agent, role.id, role.skills);
    }

    console.log(`[TeamFactory] Équipe créée depuis domaine ${domainId}: ${teamName} (${domainConfig.roles.length} membres)`);
    return team;
  }

  /**
   * Crée une équipe avec des rôles personnalisés
   */
  createCustomTeam(
    teamName: string,
    domainId: string,
    roles: Array<{ roleId: string; skills: string[] }>
  ): Team {
    const team = new Team({
      name: teamName,
      messageBroker: this.messageBroker,
      domainId: domainId
    });

    for (const role of roles) {
      const agent = this.createAgent(`${teamName}-${role.roleId}`);
      team.addMember(agent, role.roleId, role.skills);
    }

    console.log(`[TeamFactory] Équipe custom créée: ${teamName} (${roles.length} membres)`);
    return team;
  }

  /**
   * @deprecated Utiliser createTeamFromDomain à la place
   */
  createTeam(config: { name: string; type: TeamType }): Team {
    // Mapping des anciens types vers les nouveaux domainIds
    const domainMapping: Record<TeamType, string> = {
      [TeamType.DEVELOPMENT]: 'development',
      [TeamType.REVIEW]: 'development',
      [TeamType.RESEARCH]: 'development',
      [TeamType.MINIMAL]: 'development',
      [TeamType.SOCIAL_MEDIA]: 'social-media'
    };

    const domainId = domainMapping[config.type];

    // Vérifie si le domaine est enregistré
    if (this.registry.hasDomain(domainId)) {
      return this.createTeamFromDomain(domainId, config.name);
    }

    // Fallback: crée une équipe legacy
    console.warn(`[TeamFactory] Domain ${domainId} not registered, using legacy setup`);
    return this.createLegacyTeam(config.name, config.type);
  }

  /**
   * Crée une équipe legacy (pour compatibilité)
   */
  private createLegacyTeam(name: string, type: TeamType): Team {
    const team = new Team(name, this.messageBroker);

    switch (type) {
      case TeamType.DEVELOPMENT:
        return this.setupDevelopmentTeam(team);
      case TeamType.REVIEW:
        return this.setupReviewTeam(team);
      case TeamType.RESEARCH:
        return this.setupResearchTeam(team);
      case TeamType.MINIMAL:
        return this.setupMinimalTeam(team);
      case TeamType.SOCIAL_MEDIA:
        return this.setupSocialMediaTeam(team);
      default:
        return team;
    }
  }

  /**
   * Équipe de développement complète (legacy)
   */
  private setupDevelopmentTeam(team: Team): Team {
    const lead = this.createAgent(`${team.name}-lead`);
    team.addMember(lead, 'lead', ['planning', 'coordination', 'review']);

    const dev1 = this.createAgent(`${team.name}-dev1`);
    team.addMember(dev1, 'developer', ['typescript', 'nodejs', 'code']);

    const dev2 = this.createAgent(`${team.name}-dev2`);
    team.addMember(dev2, 'developer', ['typescript', 'testing', 'code']);

    const reviewer = this.createAgent(`${team.name}-reviewer`);
    team.addMember(reviewer, 'reviewer', ['review', 'quality', 'best-practices']);

    const tester = this.createAgent(`${team.name}-tester`);
    team.addMember(tester, 'tester', ['testing', 'qa', 'automation']);

    console.log(`[TeamFactory] Équipe DEVELOPMENT créée: ${team.name} (5 membres)`);
    return team;
  }

  /**
   * Équipe de revue de code (legacy)
   */
  private setupReviewTeam(team: Team): Team {
    const lead = this.createAgent(`${team.name}-lead`);
    team.addMember(lead, 'lead', ['planning', 'coordination']);

    const reviewer1 = this.createAgent(`${team.name}-reviewer1`);
    team.addMember(reviewer1, 'reviewer', ['review', 'security']);

    const reviewer2 = this.createAgent(`${team.name}-reviewer2`);
    team.addMember(reviewer2, 'reviewer', ['review', 'performance']);

    console.log(`[TeamFactory] Équipe REVIEW créée: ${team.name} (3 membres)`);
    return team;
  }

  /**
   * Équipe de recherche (legacy)
   */
  private setupResearchTeam(team: Team): Team {
    const lead = this.createAgent(`${team.name}-lead`);
    team.addMember(lead, 'lead', ['planning', 'synthesis']);

    const analyst1 = this.createAgent(`${team.name}-analyst1`);
    team.addMember(analyst1, 'analyst', ['research', 'analysis', 'documentation']);

    const analyst2 = this.createAgent(`${team.name}-analyst2`);
    team.addMember(analyst2, 'analyst', ['research', 'data', 'reporting']);

    console.log(`[TeamFactory] Équipe RESEARCH créée: ${team.name} (3 membres)`);
    return team;
  }

  /**
   * Équipe minimale (legacy)
   */
  private setupMinimalTeam(team: Team): Team {
    const lead = this.createAgent(`${team.name}-lead`);
    team.addMember(lead, 'lead', ['planning', 'coordination', 'code']);

    const dev = this.createAgent(`${team.name}-dev`);
    team.addMember(dev, 'developer', ['code', 'testing']);

    console.log(`[TeamFactory] Équipe MINIMAL créée: ${team.name} (2 membres)`);
    return team;
  }

  /**
   * Équipe Social Media (legacy)
   */
  private setupSocialMediaTeam(team: Team): Team {
    const manager = this.createAgent(`${team.name}-manager`);
    team.addMember(manager, 'social_media_manager', [
      'youtube', 'tiktok', 'instagram', 'scheduling', 'analytics', 'strategy'
    ]);

    const creator = this.createAgent(`${team.name}-creator`);
    team.addMember(creator, 'content_creator', [
      'content', 'ideas', 'scripts', 'storytelling', 'trends'
    ]);

    const editor = this.createAgent(`${team.name}-editor`);
    team.addMember(editor, 'video_editor', [
      'video', 'editing', 'effects', 'thumbnails', 'shorts', 'reels'
    ]);

    const copywriter = this.createAgent(`${team.name}-copywriter`);
    team.addMember(copywriter, 'copywriter', [
      'captions', 'hashtags', 'descriptions', 'hooks', 'cta'
    ]);

    const community = this.createAgent(`${team.name}-community`);
    team.addMember(community, 'community_manager', [
      'engagement', 'comments', 'dms', 'moderation', 'growth'
    ]);

    console.log(`[TeamFactory] Équipe SOCIAL_MEDIA créée: ${team.name} (5 membres)`);
    return team;
  }

  /**
   * Crée un agent worker avec les handlers par défaut
   */
  private createAgent(id: string): WorkerAgent {
    const agent = new WorkerAgent(this.messageBroker, id);
    for (const handler of createDefaultHandlers()) {
      agent.registerHandler(handler);
    }
    return agent;
  }

  /**
   * Liste les domaines disponibles
   */
  getAvailableDomains(): string[] {
    return this.registry.listDomains();
  }

  /**
   * Récupère la config d'un domaine
   */
  getDomainConfig(domainId: string): IDomainConfig | undefined {
    return this.registry.get(domainId);
  }
}
