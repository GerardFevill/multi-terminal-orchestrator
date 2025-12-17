/**
 * Persistance d'état pour agents et équipes
 * Single Responsibility (S) - Stockage d'état uniquement
 */

import { AgentStatus } from './IAgent';

export interface IAgentState {
  agentId: string;
  status: AgentStatus;
  currentTaskId?: string;
  lastSeen: Date;
  metadata: Record<string, unknown>;
}

export interface ITeamState {
  teamId: string;
  domainId: string;
  projectId?: string;
  projectStatus?: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStateStore {
  /**
   * Sauvegarde l'état d'un agent
   */
  saveAgentState(state: IAgentState): Promise<void>;

  /**
   * Récupère l'état d'un agent
   */
  getAgentState(agentId: string): Promise<IAgentState | null>;

  /**
   * Sauvegarde l'état d'une équipe
   */
  saveTeamState(state: ITeamState): Promise<void>;

  /**
   * Récupère l'état d'une équipe
   */
  getTeamState(teamId: string): Promise<ITeamState | null>;

  /**
   * Liste tous les états d'agents
   */
  getAllAgentStates(): Promise<IAgentState[]>;

  /**
   * Supprime l'état d'un agent
   */
  deleteAgentState(agentId: string): Promise<void>;

  /**
   * Met à jour le timestamp lastSeen d'un agent
   */
  updateHeartbeat(agentId: string): Promise<void>;

  /**
   * Récupère les agents inactifs depuis X secondes
   */
  getInactiveAgents(thresholdSeconds: number): Promise<IAgentState[]>;
}
