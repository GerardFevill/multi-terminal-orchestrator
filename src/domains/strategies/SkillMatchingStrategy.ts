/**
 * Stratégie de routage par compétences
 * Trouve le membre dont les compétences correspondent le mieux à la tâche
 */

import { IRoutingStrategy } from './IRoutingStrategy';
import { ITask } from '../../interfaces/IMessage';
import { ITeamMember } from '../../interfaces/ITeam';
import { IDomainConfig } from '../../interfaces/IDomainConfig';

export class SkillMatchingStrategy implements IRoutingStrategy {
  readonly name = 'skill-matching';

  /**
   * Route une tâche basée sur la correspondance des compétences
   */
  route(task: ITask, members: ITeamMember[], config: IDomainConfig): ITeamMember | undefined {
    const content = task.content.toLowerCase();

    // Score chaque membre basé sur la correspondance des compétences
    const scored = members
      .filter(m => m.availability > 0)
      .map(member => {
        const skillScore = member.skills.filter(skill =>
          content.includes(skill.toLowerCase())
        ).length;

        // Bonus pour le rôle correspondant au domaine config
        const roleConfig = config.roles.find(r => r.id === member.roleId);
        const roleSkillScore = roleConfig?.skills.filter(skill =>
          content.includes(skill.toLowerCase())
        ).length || 0;

        return {
          member,
          score: skillScore + roleSkillScore,
          availability: member.availability
        };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => {
        // Tri par score, puis par disponibilité
        if (b.score !== a.score) return b.score - a.score;
        return b.availability - a.availability;
      });

    return scored[0]?.member;
  }
}
