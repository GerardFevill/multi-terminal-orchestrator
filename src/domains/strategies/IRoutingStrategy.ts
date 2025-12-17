/**
 * Interface pour les stratégies de routage
 * Strategy Pattern - Permet d'interchanger les algorithmes de routage
 */

import { ITask } from '../../interfaces/IMessage';
import { ITeamMember } from '../../interfaces/ITeam';
import { IDomainConfig } from '../../interfaces/IDomainConfig';

export interface IRoutingStrategy {
  /**
   * Nom de la stratégie
   */
  readonly name: string;

  /**
   * Route une tâche vers le membre le plus approprié
   * @param task La tâche à router
   * @param members Les membres disponibles
   * @param config La configuration du domaine
   * @returns Le membre sélectionné ou undefined si aucun n'est approprié
   */
  route(task: ITask, members: ITeamMember[], config: IDomainConfig): ITeamMember | undefined;
}
