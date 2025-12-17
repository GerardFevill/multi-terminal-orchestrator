/**
 * Stratégie de routage par mots-clés
 * Utilise les règles de routage définies dans DomainConfig
 */

import { IRoutingStrategy } from './IRoutingStrategy';
import { ITask } from '../../interfaces/IMessage';
import { ITeamMember } from '../../interfaces/ITeam';
import { IDomainConfig } from '../../interfaces/IDomainConfig';

export class KeywordRoutingStrategy implements IRoutingStrategy {
  readonly name = 'keyword';

  /**
   * Route une tâche basée sur les mots-clés dans le contenu
   */
  route(task: ITask, members: ITeamMember[], config: IDomainConfig): ITeamMember | undefined {
    const content = task.content.toLowerCase();

    // Trie les règles par priorité (plus haute priorité en premier)
    const sortedRules = [...config.routingRules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      // Vérifie si un mot-clé correspond
      const matches = rule.keywords.some(keyword =>
        content.includes(keyword.toLowerCase())
      );

      if (matches) {
        // Trouve les membres avec les rôles cibles
        const eligibleMembers = members.filter(m =>
          rule.targetRoles.includes(m.roleId) &&
          m.availability > 0
        );

        if (eligibleMembers.length > 0) {
          // Retourne le membre avec la plus haute disponibilité
          return eligibleMembers.sort((a, b) => b.availability - a.availability)[0];
        }
      }
    }

    return undefined;
  }
}
