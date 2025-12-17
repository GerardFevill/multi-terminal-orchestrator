/**
 * Équipe spécialisée pour les réseaux sociaux
 * Liskov (L) - Peut remplacer Team
 */

import { Team } from './Team';
import { IPublishConfig, SocialPlatform, TeamRole } from '../interfaces/ITeam';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { MessageType } from '../interfaces/IMessage';
import { generateId } from '../utils/generateId';

export interface ContentPlan {
  id: string;
  title: string;
  description: string;
  platforms: SocialPlatform[];
  hashtags: string[];
  script?: string;
  mediaType: 'video' | 'image' | 'text' | 'story' | 'reel';
  status: ContentStatus;
}

export enum ContentStatus {
  IDEA = 'idea',
  SCRIPTED = 'scripted',
  RECORDED = 'recorded',
  EDITED = 'edited',
  REVIEWED = 'reviewed',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published'
}

export class SocialMediaTeam extends Team {
  private contentQueue: ContentPlan[] = [];
  private publishHistory: Map<string, IPublishConfig[]> = new Map();

  constructor(name: string, messageBroker: IMessageBroker, id?: string) {
    super(name, messageBroker, id);
  }

  /**
   * Crée un plan de contenu
   */
  async createContent(plan: Omit<ContentPlan, 'id' | 'status'>): Promise<string> {
    const content: ContentPlan = {
      ...plan,
      id: generateId(),
      status: ContentStatus.IDEA
    };

    this.contentQueue.push(content);
    console.log(`[${this.name}] Nouveau contenu: ${content.title}`);

    // Assigner au Content Creator
    const creator = this.getMemberByRole(TeamRole.CONTENT_CREATOR);
    if (creator) {
      await this.messageBroker.send({
        id: generateId(),
        from: `team:${this.id}`,
        to: creator.agent.id,
        content: `CRÉER SCRIPT: ${content.title}\nDescription: ${content.description}\nPlateforme: ${content.platforms.join(', ')}`,
        timestamp: new Date(),
        type: MessageType.TASK,
        priority: 1
      });
    }

    return content.id;
  }

  /**
   * Pipeline de production de contenu
   */
  async produceContent(contentId: string): Promise<void> {
    const content = this.contentQueue.find(c => c.id === contentId);
    if (!content) throw new Error(`Contenu ${contentId} non trouvé`);

    // 1. Script par Content Creator
    await this.assignToRole(TeamRole.CONTENT_CREATOR,
      `ÉCRIRE SCRIPT pour: ${content.title}`);
    content.status = ContentStatus.SCRIPTED;

    // 2. Montage par Video Editor
    if (content.mediaType === 'video' || content.mediaType === 'reel') {
      await this.assignToRole(TeamRole.VIDEO_EDITOR,
        `MONTER VIDÉO: ${content.title}\nFormat: ${content.mediaType}`);
      content.status = ContentStatus.EDITED;
    }

    // 3. Textes par Copywriter
    await this.assignToRole(TeamRole.COPYWRITER,
      `RÉDIGER: Titre, description, hashtags pour ${content.title}\nPlateforme: ${content.platforms.join(', ')}`);
    content.status = ContentStatus.REVIEWED;

    // 4. Publication par Social Media Manager
    await this.assignToRole(TeamRole.SOCIAL_MEDIA_MANAGER,
      `PUBLIER: ${content.title}\nPlateforme: ${content.platforms.join(', ')}\nHashtags: ${content.hashtags.join(' ')}`);
    content.status = ContentStatus.SCHEDULED;
  }

  /**
   * Publie sur une plateforme spécifique
   */
  async publishTo(platform: SocialPlatform, config: Omit<IPublishConfig, 'platform'>): Promise<void> {
    const fullConfig: IPublishConfig = { ...config, platform };

    const manager = this.getMemberByRole(TeamRole.SOCIAL_MEDIA_MANAGER);
    if (!manager) throw new Error('Pas de Social Media Manager dans l\'équipe');

    await this.messageBroker.send({
      id: generateId(),
      from: `team:${this.id}`,
      to: manager.agent.id,
      content: `PUBLIER SUR ${platform.toUpperCase()}:
Titre: ${config.title}
Description: ${config.description}
Hashtags: ${config.hashtags.join(' ')}
${config.scheduledAt ? `Programmé: ${config.scheduledAt.toISOString()}` : 'Publication immédiate'}`,
      timestamp: new Date(),
      type: MessageType.TASK,
      priority: 1
    });

    // Historique
    const history = this.publishHistory.get(platform) || [];
    history.push(fullConfig);
    this.publishHistory.set(platform, history);

    console.log(`[${this.name}] Publication programmée sur ${platform}: ${config.title}`);
  }

  /**
   * Publie sur toutes les plateformes
   */
  async publishToAll(config: Omit<IPublishConfig, 'platform'>): Promise<void> {
    const platforms = [
      SocialPlatform.YOUTUBE,
      SocialPlatform.TIKTOK,
      SocialPlatform.INSTAGRAM
    ];

    for (const platform of platforms) {
      await this.publishTo(platform, config);
    }

    console.log(`[${this.name}] Publication sur ${platforms.length} plateformes`);
  }

  /**
   * Assigne une tâche à un rôle spécifique
   */
  private async assignToRole(role: TeamRole, task: string): Promise<void> {
    const member = this.getMemberByRole(role);
    if (!member) {
      console.log(`[${this.name}] Pas de ${role} disponible pour: ${task}`);
      return;
    }

    await this.messageBroker.send({
      id: generateId(),
      from: `team:${this.id}`,
      to: member.agent.id,
      content: task,
      timestamp: new Date(),
      type: MessageType.TASK,
      priority: 1
    });
  }

  /**
   * Engage la communauté
   */
  async engageCommunity(platform: SocialPlatform, action: string): Promise<void> {
    const community = this.getMemberByRole(TeamRole.COMMUNITY_MANAGER);
    if (!community) throw new Error('Pas de Community Manager');

    await this.messageBroker.send({
      id: generateId(),
      from: `team:${this.id}`,
      to: community.agent.id,
      content: `ENGAGEMENT ${platform.toUpperCase()}: ${action}`,
      timestamp: new Date(),
      type: MessageType.TASK,
      priority: 1
    });
  }

  /**
   * Obtient les statistiques de publication
   */
  getPublishStats(): Record<SocialPlatform, number> {
    const stats: Partial<Record<SocialPlatform, number>> = {};
    for (const [platform, history] of this.publishHistory) {
      stats[platform as SocialPlatform] = history.length;
    }
    return stats as Record<SocialPlatform, number>;
  }

  /**
   * Liste le contenu en attente
   */
  getPendingContent(): ContentPlan[] {
    return this.contentQueue.filter(c => c.status !== ContentStatus.PUBLISHED);
  }
}
