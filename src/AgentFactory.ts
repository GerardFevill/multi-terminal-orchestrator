/**
 * Factory Pattern + Dependency Injection
 * Single Responsibility - Crée des agents
 */

import { Agent } from './agents/Agent';
import { WorkerAgent } from './agents/WorkerAgent';
import { CoordinatorAgent } from './agents/CoordinatorAgent';
import { IMessageBroker } from './interfaces/IMessageBroker';
import { FileMessageBroker } from './communication/FileMessageBroker';
import { AgentRole } from './interfaces/IAgent';
import { createDefaultHandlers } from './tasks/TaskHandlers';

export interface AgentConfig {
  role: AgentRole;
  id?: string;
  commPath?: string;
}

export class AgentFactory {
  private messageBroker: IMessageBroker;

  constructor(commPath: string = './claude-comm') {
    this.messageBroker = new FileMessageBroker(commPath);
  }

  createAgent(config: AgentConfig): Agent {
    switch (config.role) {
      case AgentRole.COORDINATOR:
        return new CoordinatorAgent(this.messageBroker, config.id);

      case AgentRole.WORKER:
        const worker = new WorkerAgent(this.messageBroker, config.id);
        // Enregistrer les handlers par défaut
        for (const handler of createDefaultHandlers()) {
          worker.registerHandler(handler);
        }
        return worker;

      default:
        throw new Error(`Role inconnu: ${config.role}`);
    }
  }

  // Créer un système complet avec coordinator + workers
  createSystem(workerCount: number = 2): {
    coordinator: CoordinatorAgent;
    workers: WorkerAgent[];
  } {
    const coordinator = this.createAgent({
      role: AgentRole.COORDINATOR,
      id: 'coordinator-1'
    }) as CoordinatorAgent;

    const workers: WorkerAgent[] = [];
    for (let i = 1; i <= workerCount; i++) {
      const worker = this.createAgent({
        role: AgentRole.WORKER,
        id: `worker-${i}`
      }) as WorkerAgent;
      workers.push(worker);

      // Enregistrer le worker auprès du coordinator
      coordinator.registerWorker(worker.id);
    }

    return { coordinator, workers };
  }
}
