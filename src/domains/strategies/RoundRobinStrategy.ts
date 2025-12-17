/**
 * Stratégie de routage Round Robin
 * Distribue les tâches de manière équitable entre les membres
 */

import { IRoutingStrategy } from './IRoutingStrategy';
import { ITask } from '../../interfaces/IMessage';
import { ITeamMember } from '../../interfaces/ITeam';
import { IDomainConfig } from '../../interfaces/IDomainConfig';

export class RoundRobinStrategy implements IRoutingStrategy {
  readonly name = 'round-robin';

  private lastAssignedIndex: Map<string, number> = new Map();

  /**
   * Route une tâche en round-robin
   */
  route(task: ITask, members: ITeamMember[], config: IDomainConfig): ITeamMember | undefined {
    const availableMembers = members.filter(m => m.availability > 0);

    if (availableMembers.length === 0) {
      return undefined;
    }

    // Récupère l'index du dernier membre assigné pour ce domaine
    const domainId = config.domainId;
    const lastIndex = this.lastAssignedIndex.get(domainId) ?? -1;

    // Calcule le prochain index
    const nextIndex = (lastIndex + 1) % availableMembers.length;

    // Met à jour l'index
    this.lastAssignedIndex.set(domainId, nextIndex);

    return availableMembers[nextIndex];
  }

  /**
   * Reset le compteur pour un domaine
   */
  reset(domainId?: string): void {
    if (domainId) {
      this.lastAssignedIndex.delete(domainId);
    } else {
      this.lastAssignedIndex.clear();
    }
  }
}
