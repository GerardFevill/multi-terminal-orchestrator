/**
 * Interface Segregation (I) - Interfaces pour la gestion d'équipe
 */

import { IAgent } from './IAgent';
import { ITask, IResult } from './IMessage';

/**
 * Rôles possibles dans une équipe
 */
export enum TeamRole {
  // Rôles Dev
  LEAD = 'lead',              // Chef d'équipe - coordonne
  DEVELOPER = 'developer',     // Développeur - code
  REVIEWER = 'reviewer',       // Reviewer - revue de code
  TESTER = 'tester',          // Testeur - tests
  ARCHITECT = 'architect',     // Architecte - design
  ANALYST = 'analyst',        // Analyste - recherche

  // Rôles Social Media
  CONTENT_CREATOR = 'content_creator',   // Crée le contenu
  VIDEO_EDITOR = 'video_editor',         // Monte les vidéos
  COPYWRITER = 'copywriter',             // Rédige les textes
  COMMUNITY_MANAGER = 'community_manager', // Gère la communauté
  SOCIAL_MEDIA_MANAGER = 'social_media_manager' // Publie sur les réseaux
}

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
 * Membre d'une équipe
 */
export interface ITeamMember {
  agent: IAgent;
  role: TeamRole;
  skills: string[];
  availability: number; // 0-100%
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
 * Interface principale d'une équipe
 */
export interface ITeam {
  readonly id: string;
  readonly name: string;
  members: ITeamMember[];
  currentProject?: IProject;

  // Gestion des membres
  addMember(agent: IAgent, role: TeamRole, skills?: string[]): void;
  removeMember(agentId: string): void;
  getMemberByRole(role: TeamRole): ITeamMember | undefined;
  getMembersByRole(role: TeamRole): ITeamMember[];

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
