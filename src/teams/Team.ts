/**
 * Classe Team - Gère une équipe d'agents
 * Single Responsibility (S) - Gère la composition et coordination d'équipe
 * Open/Closed (O) - Extensible pour différents types d'équipes
 */

import { ITeam, ITeamMember, IProject, TeamRole, ProjectStatus, ITaskAssigner } from '../interfaces/ITeam';
import { IAgent } from '../interfaces/IAgent';
import { ITask, IResult, MessageType } from '../interfaces/IMessage';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { generateId } from '../utils/generateId';

export class Team implements ITeam, ITaskAssigner {
  readonly id: string;
  readonly name: string;
  members: ITeamMember[] = [];
  currentProject?: IProject;

  private messageBroker: IMessageBroker;
  private results: Map<string, IResult> = new Map();

  constructor(
    name: string,
    messageBroker: IMessageBroker,
    id?: string
  ) {
    this.id = id || generateId();
    this.name = name;
    this.messageBroker = messageBroker;
  }

  // === Gestion des membres ===

  addMember(agent: IAgent, role: TeamRole, skills: string[] = []): void {
    const member: ITeamMember = {
      agent,
      role,
      skills,
      availability: 100
    };
    this.members.push(member);
    console.log(`[Team:${this.name}] Membre ajouté: ${agent.id} (${role})`);
  }

  removeMember(agentId: string): void {
    const index = this.members.findIndex(m => m.agent.id === agentId);
    if (index !== -1) {
      const removed = this.members.splice(index, 1)[0];
      console.log(`[Team:${this.name}] Membre retiré: ${removed.agent.id}`);
    }
  }

  getMemberByRole(role: TeamRole): ITeamMember | undefined {
    return this.members.find(m => m.role === role);
  }

  getMembersByRole(role: TeamRole): ITeamMember[] {
    return this.members.filter(m => m.role === role);
  }

  // === Gestion de projet ===

  async assignProject(project: IProject): Promise<void> {
    this.currentProject = project;
    this.currentProject.status = ProjectStatus.PLANNING;

    console.log(`[Team:${this.name}] Projet assigné: ${project.name}`);

    // Notifier l'équipe
    await this.broadcastToTeam(`Nouveau projet: ${project.name} - ${project.description}`);

    // Le lead planifie le projet
    const lead = this.getMemberByRole(TeamRole.LEAD);
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

    const results: IResult[] = [];

    // Distribuer les tâches aux membres appropriés
    for (const task of this.currentProject.tasks) {
      const member = this.findBestMember(task, this.members);

      if (member) {
        await this.assignTaskToMember(task, member);
      } else {
        console.log(`[Team:${this.name}] Aucun membre disponible pour: ${task.content}`);
      }
    }

    // Attendre les résultats
    // Dans une vraie implémentation, on attendrait les callbacks

    this.currentProject.status = ProjectStatus.COMPLETED;
    return Array.from(this.results.values());
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
    // Trouver un membre avec cette compétence
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
    member.availability -= 20; // Réduire disponibilité

    const taskWithTarget: ITask = {
      ...task,
      to: member.agent.id
    };

    await this.messageBroker.send(taskWithTarget);
    console.log(`[Team:${this.name}] Tâche ${task.id} -> ${member.agent.id} (${member.role})`);
  }

  findBestMember(task: ITask, members: ITeamMember[]): ITeamMember | undefined {
    const content = task.content.toLowerCase();

    // Logique de matching basée sur le contenu de la tâche
    const roleMapping: Record<string, TeamRole[]> = {
      'code': [TeamRole.DEVELOPER, TeamRole.ARCHITECT],
      'develop': [TeamRole.DEVELOPER],
      'test': [TeamRole.TESTER],
      'review': [TeamRole.REVIEWER, TeamRole.LEAD],
      'design': [TeamRole.ARCHITECT],
      'analys': [TeamRole.ANALYST],
      'research': [TeamRole.ANALYST],
      'plan': [TeamRole.LEAD, TeamRole.ARCHITECT]
    };

    // Trouver les rôles appropriés
    let targetRoles: TeamRole[] = [];
    for (const [keyword, roles] of Object.entries(roleMapping)) {
      if (content.includes(keyword)) {
        targetRoles.push(...roles);
      }
    }

    // Si pas de match, donner au développeur
    if (targetRoles.length === 0) {
      targetRoles = [TeamRole.DEVELOPER];
    }

    // Trouver le meilleur membre disponible
    return members
      .filter(m => targetRoles.includes(m.role) && m.availability > 0)
      .sort((a, b) => b.availability - a.availability)[0];
  }

  // === Utilitaires ===

  getTeamSummary(): string {
    const summary = [
      `Équipe: ${this.name} (${this.id})`,
      `Membres: ${this.members.length}`,
      ...this.members.map(m => `  - ${m.agent.id}: ${m.role} (${m.availability}% dispo)`),
      `Projet: ${this.currentProject?.name || 'Aucun'}`,
      `Status: ${this.getProjectStatus()}`
    ];
    return summary.join('\n');
  }
}
