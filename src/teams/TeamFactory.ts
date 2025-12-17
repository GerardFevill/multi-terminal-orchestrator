/**
 * Factory pour créer des équipes préconfigurées
 * Single Responsibility (S) - Crée des équipes
 */

import { Team } from './Team';
import { TeamRole } from '../interfaces/ITeam';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { AgentRole } from '../interfaces/IAgent';
import { WorkerAgent } from '../agents/WorkerAgent';
import { createDefaultHandlers } from '../tasks/TaskHandlers';

export interface TeamConfig {
  name: string;
  type: TeamType;
}

export enum TeamType {
  DEVELOPMENT = 'development',   // Équipe de dev complète
  REVIEW = 'review',             // Équipe de revue
  RESEARCH = 'research',         // Équipe de recherche
  MINIMAL = 'minimal',           // Équipe minimale
  SOCIAL_MEDIA = 'social_media'  // Équipe réseaux sociaux
}

export class TeamFactory {
  private messageBroker: IMessageBroker;

  constructor(messageBroker: IMessageBroker) {
    this.messageBroker = messageBroker;
  }

  /**
   * Crée une équipe selon le type
   */
  createTeam(config: TeamConfig): Team {
    const team = new Team(config.name, this.messageBroker);

    switch (config.type) {
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
   * Équipe de développement complète
   * Lead + 2 Devs + Reviewer + Tester
   */
  private setupDevelopmentTeam(team: Team): Team {
    // Lead
    const lead = this.createAgent(`${team.name}-lead`);
    team.addMember(lead, TeamRole.LEAD, ['planning', 'coordination', 'review']);

    // Développeurs
    const dev1 = this.createAgent(`${team.name}-dev1`);
    team.addMember(dev1, TeamRole.DEVELOPER, ['typescript', 'nodejs', 'code']);

    const dev2 = this.createAgent(`${team.name}-dev2`);
    team.addMember(dev2, TeamRole.DEVELOPER, ['typescript', 'testing', 'code']);

    // Reviewer
    const reviewer = this.createAgent(`${team.name}-reviewer`);
    team.addMember(reviewer, TeamRole.REVIEWER, ['review', 'quality', 'best-practices']);

    // Testeur
    const tester = this.createAgent(`${team.name}-tester`);
    team.addMember(tester, TeamRole.TESTER, ['testing', 'qa', 'automation']);

    console.log(`[TeamFactory] Équipe DEVELOPMENT créée: ${team.name} (5 membres)`);
    return team;
  }

  /**
   * Équipe de revue de code
   * Lead + 2 Reviewers
   */
  private setupReviewTeam(team: Team): Team {
    const lead = this.createAgent(`${team.name}-lead`);
    team.addMember(lead, TeamRole.LEAD, ['planning', 'coordination']);

    const reviewer1 = this.createAgent(`${team.name}-reviewer1`);
    team.addMember(reviewer1, TeamRole.REVIEWER, ['review', 'security']);

    const reviewer2 = this.createAgent(`${team.name}-reviewer2`);
    team.addMember(reviewer2, TeamRole.REVIEWER, ['review', 'performance']);

    console.log(`[TeamFactory] Équipe REVIEW créée: ${team.name} (3 membres)`);
    return team;
  }

  /**
   * Équipe de recherche
   * Lead + 2 Analysts
   */
  private setupResearchTeam(team: Team): Team {
    const lead = this.createAgent(`${team.name}-lead`);
    team.addMember(lead, TeamRole.LEAD, ['planning', 'synthesis']);

    const analyst1 = this.createAgent(`${team.name}-analyst1`);
    team.addMember(analyst1, TeamRole.ANALYST, ['research', 'analysis', 'documentation']);

    const analyst2 = this.createAgent(`${team.name}-analyst2`);
    team.addMember(analyst2, TeamRole.ANALYST, ['research', 'data', 'reporting']);

    console.log(`[TeamFactory] Équipe RESEARCH créée: ${team.name} (3 membres)`);
    return team;
  }

  /**
   * Équipe minimale
   * Lead + 1 Dev
   */
  private setupMinimalTeam(team: Team): Team {
    const lead = this.createAgent(`${team.name}-lead`);
    team.addMember(lead, TeamRole.LEAD, ['planning', 'coordination', 'code']);

    const dev = this.createAgent(`${team.name}-dev`);
    team.addMember(dev, TeamRole.DEVELOPER, ['code', 'testing']);

    console.log(`[TeamFactory] Équipe MINIMAL créée: ${team.name} (2 membres)`);
    return team;
  }

  /**
   * Équipe Social Media
   * Lead + Content Creator + Video Editor + Copywriter + Social Media Manager
   * Déploie sur: YouTube, TikTok, Instagram
   */
  private setupSocialMediaTeam(team: Team): Team {
    // Social Media Manager (Lead)
    const manager = this.createAgent(`${team.name}-manager`);
    team.addMember(manager, TeamRole.SOCIAL_MEDIA_MANAGER, [
      'youtube', 'tiktok', 'instagram', 'scheduling', 'analytics', 'strategy'
    ]);

    // Content Creator
    const creator = this.createAgent(`${team.name}-creator`);
    team.addMember(creator, TeamRole.CONTENT_CREATOR, [
      'content', 'ideas', 'scripts', 'storytelling', 'trends'
    ]);

    // Video Editor
    const editor = this.createAgent(`${team.name}-editor`);
    team.addMember(editor, TeamRole.VIDEO_EDITOR, [
      'video', 'editing', 'effects', 'thumbnails', 'shorts', 'reels'
    ]);

    // Copywriter
    const copywriter = this.createAgent(`${team.name}-copywriter`);
    team.addMember(copywriter, TeamRole.COPYWRITER, [
      'captions', 'hashtags', 'descriptions', 'hooks', 'cta'
    ]);

    // Community Manager
    const community = this.createAgent(`${team.name}-community`);
    team.addMember(community, TeamRole.COMMUNITY_MANAGER, [
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
}
