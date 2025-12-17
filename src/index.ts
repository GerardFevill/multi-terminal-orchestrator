/**
 * Point d'entrée - Lance de vrais terminaux Claude
 */

import { ClaudeProcessBroker } from './communication/ClaudeProcessBroker';
import { MessageType } from './interfaces/IMessage';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   MULTI-CLAUDE ORCHESTRATOR - TypeScript + SOLID          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const broker = new ClaudeProcessBroker('./claude-comm');

  // Initialiser
  await broker.connect();

  // Lancer les agents Claude
  console.log('Lancement des agents Claude...\n');
  await broker.spawnClaudeAgent('agent-1', 'coordinator');
  await broker.spawnClaudeAgent('agent-2', 'worker');
  await broker.spawnClaudeAgent('agent-3', 'worker');

  console.log('\nAgents actifs:', broker.getActiveAgents());

  // Attendre que les agents soient prêts
  await sleep(3000);

  // Envoyer des tâches
  console.log('\nEnvoi des tâches...');

  await broker.send({
    id: 'task-001',
    from: 'orchestrator',
    to: 'agent-2',
    content: 'Liste les fichiers du répertoire courant',
    timestamp: new Date(),
    type: MessageType.TASK
  });

  await broker.send({
    id: 'task-002',
    from: 'orchestrator',
    to: 'agent-3',
    content: 'Affiche la date et heure système',
    timestamp: new Date(),
    type: MessageType.TASK
  });

  // Broadcast
  await broker.broadcast({
    id: 'broadcast-001',
    from: 'orchestrator',
    to: 'all',
    content: 'Bienvenue dans le système multi-Claude!',
    timestamp: new Date(),
    type: MessageType.BROADCAST
  });

  // Attendre les résultats
  console.log('\nEn attente des résultats (Ctrl+C pour arrêter)...\n');

  // Garder le processus actif
  process.on('SIGINT', async () => {
    console.log('\n\nArrêt du système...');
    await broker.disconnect();
    process.exit(0);
  });

  // Boucle infinie pour garder le processus actif
  while (true) {
    await sleep(1000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
