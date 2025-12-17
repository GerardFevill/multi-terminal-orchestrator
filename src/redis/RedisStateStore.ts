/**
 * Store d'état Redis pour agents et équipes
 * Single Responsibility (S) - Persistance d'état uniquement
 */

import { IStateStore, IAgentState, ITeamState } from '../interfaces/IStateStore';
import { RedisClient } from './RedisClient';
import Redis from 'ioredis';

export class RedisStateStore implements IStateStore {
  private client: Redis;
  private readonly AGENT_PREFIX = 'agent:state:';
  private readonly TEAM_PREFIX = 'team:state:';
  private readonly AGENTS_SET = 'agents:all';
  private readonly TEAMS_SET = 'teams:all';

  constructor(redisClient?: RedisClient) {
    const rc = redisClient || RedisClient.getInstance();
    this.client = rc.getClient();
  }

  /**
   * Sauvegarde l'état d'un agent
   */
  async saveAgentState(state: IAgentState): Promise<void> {
    const key = `${this.AGENT_PREFIX}${state.agentId}`;
    const serialized = JSON.stringify({
      ...state,
      lastSeen: state.lastSeen.toISOString()
    });

    await this.client.set(key, serialized);
    await this.client.sadd(this.AGENTS_SET, state.agentId);
  }

  /**
   * Récupère l'état d'un agent
   */
  async getAgentState(agentId: string): Promise<IAgentState | null> {
    const key = `${this.AGENT_PREFIX}${agentId}`;
    const data = await this.client.get(key);

    if (!data) return null;

    const parsed = JSON.parse(data);
    parsed.lastSeen = new Date(parsed.lastSeen);
    return parsed;
  }

  /**
   * Sauvegarde l'état d'une équipe
   */
  async saveTeamState(state: ITeamState): Promise<void> {
    const key = `${this.TEAM_PREFIX}${state.teamId}`;
    const serialized = JSON.stringify({
      ...state,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString()
    });

    await this.client.set(key, serialized);
    await this.client.sadd(this.TEAMS_SET, state.teamId);
  }

  /**
   * Récupère l'état d'une équipe
   */
  async getTeamState(teamId: string): Promise<ITeamState | null> {
    const key = `${this.TEAM_PREFIX}${teamId}`;
    const data = await this.client.get(key);

    if (!data) return null;

    const parsed = JSON.parse(data);
    parsed.createdAt = new Date(parsed.createdAt);
    parsed.updatedAt = new Date(parsed.updatedAt);
    return parsed;
  }

  /**
   * Liste tous les états d'agents
   */
  async getAllAgentStates(): Promise<IAgentState[]> {
    const agentIds = await this.client.smembers(this.AGENTS_SET);
    const states: IAgentState[] = [];

    for (const agentId of agentIds) {
      const state = await this.getAgentState(agentId);
      if (state) {
        states.push(state);
      }
    }

    return states;
  }

  /**
   * Supprime l'état d'un agent
   */
  async deleteAgentState(agentId: string): Promise<void> {
    const key = `${this.AGENT_PREFIX}${agentId}`;
    await this.client.del(key);
    await this.client.srem(this.AGENTS_SET, agentId);
  }

  /**
   * Met à jour le timestamp lastSeen d'un agent
   */
  async updateHeartbeat(agentId: string): Promise<void> {
    const state = await this.getAgentState(agentId);
    if (state) {
      state.lastSeen = new Date();
      await this.saveAgentState(state);
    }
  }

  /**
   * Récupère les agents inactifs depuis X secondes
   */
  async getInactiveAgents(thresholdSeconds: number): Promise<IAgentState[]> {
    const allStates = await this.getAllAgentStates();
    const now = Date.now();
    const threshold = thresholdSeconds * 1000;

    return allStates.filter(state => {
      const lastSeen = state.lastSeen.getTime();
      return (now - lastSeen) > threshold;
    });
  }

  /**
   * Liste toutes les équipes
   */
  async getAllTeamStates(): Promise<ITeamState[]> {
    const teamIds = await this.client.smembers(this.TEAMS_SET);
    const states: ITeamState[] = [];

    for (const teamId of teamIds) {
      const state = await this.getTeamState(teamId);
      if (state) {
        states.push(state);
      }
    }

    return states;
  }

  /**
   * Supprime l'état d'une équipe
   */
  async deleteTeamState(teamId: string): Promise<void> {
    const key = `${this.TEAM_PREFIX}${teamId}`;
    await this.client.del(key);
    await this.client.srem(this.TEAMS_SET, teamId);
  }

  /**
   * Nettoie les agents inactifs
   */
  async cleanupInactiveAgents(thresholdSeconds: number): Promise<number> {
    const inactive = await this.getInactiveAgents(thresholdSeconds);

    for (const state of inactive) {
      await this.deleteAgentState(state.agentId);
    }

    return inactive.length;
  }
}
