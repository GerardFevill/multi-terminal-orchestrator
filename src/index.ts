/**
 * Point d'entrée - Orchestration du système multi-agents
 */

import { AgentFactory } from './AgentFactory';
import { CoordinatorAgent } from './agents/CoordinatorAgent';
import { WorkerAgent } from './agents/WorkerAgent';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   SYSTÈME MULTI-AGENTS TYPESCRIPT - SOLID                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Créer la factory avec le chemin de communication
  const factory = new AgentFactory('./claude-comm');

  // Créer le système avec 1 coordinator + 3 workers
  const { coordinator, workers } = factory.createSystem(3);

  // Démarrer tous les agents
  console.log('Démarrage des agents...\n');

  await coordinator.start();
  for (const worker of workers) {
    await worker.start();
  }

  console.log('\n--- Système prêt ---\n');

  // Créer quelques tâches de test
  await coordinator.createTask('CALC: 42 * 17');
  await coordinator.createTask('SHELL: date');
  await coordinator.createTask('Tâche générique de test');

  // Broadcast
  await coordinator.broadcastToWorkers('Bienvenue dans le système!');

  // Attendre les résultats
  await sleep(5000);

  // Afficher les résultats
  console.log('\n--- Résultats ---\n');
  for (const result of coordinator.getResults()) {
    console.log(`Task ${result.taskId}: ${result.success ? '✓' : '✗'}`);
    console.log(`  Data: ${JSON.stringify(result.data)}\n`);
  }

  // Arrêter le système
  console.log('\nArrêt du système...');
  for (const worker of workers) {
    await worker.stop();
  }
  await coordinator.stop();

  console.log('\n✓ Système arrêté proprement');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Lancer si exécuté directement
main().catch(console.error);
