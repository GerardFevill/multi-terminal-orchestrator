/**
 * Interface Segregation (I) - Interfaces pour la gestion d'équipe
 * Version générique - rôles définis par DomainConfig
 */

import { IAgent } from './IAgent';
import { ITask, IResult } from './IMessage';

/**
 * Plateformes de réseaux sociaux
 */
export enum SocialPlatform {
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook'
}

/**
 * Configuration de publication
 */
export interface IPublishConfig {
  platform: SocialPlatform;
  title: string;
  description: string;
  hashtags: string[];
  scheduledAt?: Date;
  mediaPath?: string;
}

/**
 * Membre d'une équipe (version générique)
 */
export interface ITeamMember {
  agent: IAgent;
  roleId: string;           // ID du rôle (défini dans DomainConfig)
  domainId: string;         // ID du domaine (social-media, development, etc.)
  skills: string[];
  availability: number;     // 0-100%
}

/**
 * Projet à réaliser par l'équipe
 */
export interface IProject {
  id: string;
  name: string;
  description: string;
  tasks: ITask[];
  status: ProjectStatus;
  createdAt: Date;
  deadline?: Date;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  BLOCKED = 'blocked'
}

/**
 * Interface principale d'une équipe (version générique)
 */
export interface ITeam {
  readonly id: string;
  readonly name: string;
  readonly domainId: string;  // Domaine de l'équipe
  members: ITeamMember[];
  currentProject?: IProject;

  // Gestion des membres
  addMember(agent: IAgent, roleId: string, skills?: string[]): void;
  removeMember(agentId: string): void;
  getMemberByRole(roleId: string): ITeamMember | undefined;
  getMembersByRole(roleId: string): ITeamMember[];

  // Gestion de projet
  assignProject(project: IProject): Promise<void>;
  executeProject(): Promise<IResult[]>;
  getProjectStatus(): ProjectStatus;

  // Communication d'équipe
  broadcastToTeam(message: string): Promise<void>;
  requestHelp(fromMember: string, skill: string): Promise<ITeamMember | undefined>;
}

/**
 * Interface pour la distribution de tâches dans l'équipe
 */
export interface ITaskAssigner {
  assignTaskToMember(task: ITask, member: ITeamMember): Promise<void>;
  findBestMember(task: ITask, members: ITeamMember[]): ITeamMember | undefined;
}

/**
 * Ancien enum conservé pour compatibilité (deprecated)
 * @deprecated Utiliser DomainConfig à la place
 */
export enum TeamRole {
  // Rôles Dev
  LEAD = 'lead',
  DEVELOPER = 'developer',
  REVIEWER = 'reviewer',
  TESTER = 'tester',
  ARCHITECT = 'architect',
  ANALYST = 'analyst',
  // Rôles Social Media
  CONTENT_CREATOR = 'content_creator',
  VIDEO_EDITOR = 'video_editor',
  COPYWRITER = 'copywriter',
  COMMUNITY_MANAGER = 'community_manager',
  SOCIAL_MEDIA_MANAGER = 'social_media_manager'
}
