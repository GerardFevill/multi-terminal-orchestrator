/**
 * Classe Team - Gère une équipe d'agents
 * Single Responsibility (S) - Gère la composition et coordination d'équipe
 * Open/Closed (O) - Extensible pour différents types d'équipes
 */

import { ITeam, ITeamMember, IProject, TeamRole, ProjectStatus, ITaskAssigner } from '../interfaces/ITeam';
import { IAgent } from '../interfaces/IAgent';
import { ITask, IResult, MessageType } from '../interfaces/IMessage';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IDomainConfig } from '../interfaces/IDomainConfig';
import { TaskRouter } from '../domains/TaskRouter';
import { DomainRegistry } from '../domains/DomainRegistry';
import { generateId } from '../utils/generateId';

export interface TeamConfig {
  name: string;
  messageBroker: IMessageBroker;
  domainId: string;
  id?: string;
}

export class Team implements ITeam, ITaskAssigner {
  readonly id: string;
  readonly name: string;
  readonly domainId: string;
  members: ITeamMember[] = [];
  currentProject?: IProject;

  protected messageBroker: IMessageBroker;
  protected results: Map<string, IResult> = new Map();
  protected taskRouter?: TaskRouter;
  protected domainConfig?: IDomainConfig;

  constructor(config: TeamConfig);
  constructor(name: string, messageBroker: IMessageBroker, id?: string);
  constructor(
    configOrName: TeamConfig | string,
    messageBroker?: IMessageBroker,
    id?: string
  ) {
    if (typeof configOrName === 'string') {
      // Legacy constructor
      this.id = id || generateId();
      this.name = configOrName;
      this.messageBroker = messageBroker!;
      this.domainId = 'development'; // Default
    } else {
      // New config-based constructor
      const config = configOrName;
      this.id = config.id || generateId();
      this.name = config.name;
      this.messageBroker = config.messageBroker;
      this.domainId = config.domainId;

      // Initialize TaskRouter with domain config
      this.domainConfig = DomainRegistry.getInstance().get(config.domainId);
      if (this.domainConfig) {
        this.taskRouter = new TaskRouter(this.domainConfig);
      }
    }
  }

  /**
   * Configure le domaine de l'équipe
   */
  setDomainConfig(config: IDomainConfig): void {
    this.domainConfig = config;
    this.taskRouter = new TaskRouter(config);
  }

  // === Gestion des membres ===

  addMember(agent: IAgent, roleId: string, skills: string[] = []): void {
    const member: ITeamMember = {
      agent,
      roleId,
      domainId: this.domainId,
      skills,
      availability: 100
    };
    this.members.push(member);
    console.log(`[Team:${this.name}] Membre ajouté: ${agent.id} (${roleId})`);
  }

  removeMember(agentId: string): void {
    const index = this.members.findIndex(m => m.agent.id === agentId);
    if (index !== -1) {
      const removed = this.members.splice(index, 1)[0];
      console.log(`[Team:${this.name}] Membre retiré: ${removed.agent.id}`);
    }
  }

  getMemberByRole(roleId: string): ITeamMember | undefined {
    return this.members.find(m => m.roleId === roleId);
  }

  getMembersByRole(roleId: string): ITeamMember[] {
    return this.members.filter(m => m.roleId === roleId);
  }

  // === Gestion de projet ===

  async assignProject(project: IProject): Promise<void> {
    this.currentProject = project;
    this.currentProject.status = ProjectStatus.PLANNING;

    console.log(`[Team:${this.name}] Projet assigné: ${project.name}`);

    // Notifier l'équipe
    await this.broadcastToTeam(`Nouveau projet: ${project.name} - ${project.description}`);

    // Le lead planifie le projet
    const leadRole = this.domainConfig?.roles.find(r => r.canLead);
    const lead = leadRole ? this.getMemberByRole(leadRole.id) : this.members[0];

    if (lead) {
      await this.assignTaskToMember({
        id: `planning-${project.id}`,
        from: this.id,
        to: lead.agent.id,
        content: `PLANIFIER: ${project.description}`,
        timestamp: new Date(),
        type: MessageType.TASK,
        priority: 1
      }, lead);
    }
  }

  async executeProject(): Promise<IResult[]> {
    if (!this.currentProject) {
      throw new Error('Aucun projet assigné');
    }

    this.currentProject.status = ProjectStatus.IN_PROGRESS;
    console.log(`[Team:${this.name}] Exécution du projet: ${this.currentProject.name}`);

    // Distribuer les tâches aux membres appropriés
    for (const task of this.currentProject.tasks) {
      const member = this.findBestMember(task, this.members);

      if (member) {
        await this.assignTaskToMember(task, member);
      } else {
        console.log(`[Team:${this.name}] Aucun membre disponible pour: ${task.content}`);
      }
    }

    this.currentProject.status = ProjectStatus.COMPLETED;
    return Array.from(this.results.values());
  }

  /**
   * Exécute le pipeline du domaine
   */
  async executePipeline(content: string): Promise<IResult[]> {
    if (!this.domainConfig?.pipelineSteps) {
      throw new Error('Pas de pipeline défini pour ce domaine');
    }

    const results: IResult[] = [];
    let previousResult: IResult | null = null;

    for (const roleId of this.domainConfig.pipelineSteps) {
      const member = this.getMemberByRole(roleId);
      if (!member) {
        console.log(`[Team:${this.name}] Pas de membre pour le rôle ${roleId}, skip`);
        continue;
      }

      const stepContent = previousResult !== null
        ? `${content}\n\nRésultat précédent: ${JSON.stringify((previousResult as IResult).data)}`
        : content;

      const task: ITask = {
        id: generateId(),
        from: `team:${this.id}`,
        to: member.agent.id,
        content: stepContent,
        timestamp: new Date(),
        type: MessageType.TASK,
        priority: 1
      };

      await this.assignTaskToMember(task, member);

      // Dans une vraie implémentation, on attendrait le résultat
      // previousResult = await this.waitForResult(task.id);
    }

    return results;
  }

  getProjectStatus(): ProjectStatus {
    return this.currentProject?.status || ProjectStatus.PLANNING;
  }

  // === Communication d'équipe ===

  async broadcastToTeam(message: string): Promise<void> {
    console.log(`[Team:${this.name}] Broadcast: ${message}`);

    await this.messageBroker.broadcast({
      id: generateId(),
      from: `team:${this.id}`,
      to: 'team-all',
      content: `[TEAM:${this.name}] ${message}`,
      timestamp: new Date(),
      type: MessageType.BROADCAST
    });
  }

  async requestHelp(fromMemberId: string, skill: string): Promise<ITeamMember | undefined> {
    const helper = this.members.find(m =>
      m.agent.id !== fromMemberId &&
      m.skills.includes(skill) &&
      m.availability > 50
    );

    if (helper) {
      console.log(`[Team:${this.name}] ${fromMemberId} demande aide -> ${helper.agent.id} (${skill})`);
      return helper;
    }

    console.log(`[Team:${this.name}] Pas d'aide disponible pour: ${skill}`);
    return undefined;
  }

  // === Distribution de tâches ===

  async assignTaskToMember(task: ITask, member: ITeamMember): Promise<void> {
    member.availability -= 20;

    const taskWithTarget: ITask = {
      ...task,
      to: member.agent.id
    };

    await this.messageBroker.send(taskWithTarget);
    console.log(`[Team:${this.name}] Tâche ${task.id} -> ${member.agent.id} (${member.roleId})`);
  }

  findBestMember(task: ITask, members: ITeamMember[]): ITeamMember | undefined {
    // Utilise TaskRouter si disponible
    if (this.taskRouter) {
      return this.taskRouter.findBestMember(task, members);
    }

    // Fallback: logique legacy avec TeamRole
    return this.findBestMemberLegacy(task, members);
  }

  /**
   * Logique legacy de matching (pour compatibilité)
   * @deprecated Utiliser TaskRouter à la place
   */
  private findBestMemberLegacy(task: ITask, members: ITeamMember[]): ITeamMember | undefined {
    const content = task.content.toLowerCase();

    const roleMapping: Record<string, string[]> = {
      'code': ['developer', 'architect'],
      'develop': ['developer'],
      'test': ['tester'],
      'review': ['reviewer', 'lead'],
      'design': ['architect'],
      'analys': ['analyst'],
      'research': ['analyst'],
      'plan': ['lead', 'architect']
    };

    let targetRoles: string[] = [];
    for (const [keyword, roles] of Object.entries(roleMapping)) {
      if (content.includes(keyword)) {
        targetRoles.push(...roles);
      }
    }

    if (targetRoles.length === 0) {
      targetRoles = ['developer'];
    }

    return members
      .filter(m => targetRoles.includes(m.roleId) && m.availability > 0)
      .sort((a, b) => b.availability - a.availability)[0];
  }

  // === Utilitaires ===

  getTeamSummary(): string {
    const summary = [
      `Équipe: ${this.name} (${this.id})`,
      `Domaine: ${this.domainId}`,
      `Membres: ${this.members.length}`,
      ...this.members.map(m => `  - ${m.agent.id}: ${m.roleId} (${m.availability}% dispo)`),
      `Projet: ${this.currentProject?.name || 'Aucun'}`,
      `Status: ${this.getProjectStatus()}`
    ];
    return summary.join('\n');
  }

  /**
   * Récupère les statistiques de l'équipe
   */
  getStats(): {
    memberCount: number;
    availableMembers: number;
    totalAvailability: number;
    projectStatus: ProjectStatus;
  } {
    const availableMembers = this.members.filter(m => m.availability > 0).length;
    const totalAvailability = this.members.reduce((sum, m) => sum + m.availability, 0);

    return {
      memberCount: this.members.length,
      availableMembers,
      totalAvailability,
      projectStatus: this.getProjectStatus()
    };
  }
}
