/**
 * Demo simple avec 4 agents
 * 1 Coordinator + 3 Workers
 */

import { RedisClient } from './redis/RedisClient';
import { RedisMessageBroker } from './redis/RedisMessageBroker';
import { CoordinatorAgent } from './agents/CoordinatorAgent';
import { WorkerAgent } from './agents/WorkerAgent';
import { MessageType } from './interfaces/IMessage';

// Couleurs pour le terminal
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(agent: string, message: string, color: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`${color}[${time}] ${agent}${C.reset} ${message}`);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
  console.log('\n' + '═'.repeat(50));
  console.log('  DEMO: 1 Coordinator + 3 Workers');
  console.log('═'.repeat(50) + '\n');

  // 1. Redis
  const redis = RedisClient.getInstance();
  if (!(await redis.ping())) {
    console.error('Redis requis! Lancez: docker run -d -p 6379:6379 redis:alpine');
    process.exit(1);
  }
  log('SYSTEM', 'Redis OK', C.green);

  // 2. Broker
  const broker = new RedisMessageBroker(redis);
  await broker.connect();

  // 3. Créer les 4 agents
  const coordinator = new CoordinatorAgent({ messageBroker: broker, id: 'COORD' });
  const alice = new WorkerAgent(broker, 'ALICE');
  const bob = new WorkerAgent(broker, 'BOB');
  const charlie = new WorkerAgent(broker, 'CHARLIE');

  // 4. Handlers personnalisés
  alice.registerHandler({
    canHandle: () => true,
    handle: async (task) => {
      log('ALICE', `Travaille sur: "${task.content}"`, C.cyan);
      await sleep(800);
      return { done: true, by: 'Alice' };
    }
  });

  bob.registerHandler({
    canHandle: () => true,
    handle: async (task) => {
      log('BOB', `Travaille sur: "${task.content}"`, C.yellow);
      await sleep(600);
      return { done: true, by: 'Bob' };
    }
  });

  charlie.registerHandler({
    canHandle: () => true,
    handle: async (task) => {
      log('CHARLIE', `Travaille sur: "${task.content}"`, C.magenta);
      await sleep(700);
      return { done: true, by: 'Charlie' };
    }
  });

  // 5. Enregistrer workers
  coordinator.registerWorker('ALICE');
  coordinator.registerWorker('BOB');
  coordinator.registerWorker('CHARLIE');

  // 6. Démarrer
  await coordinator.start();
  await alice.start();
  await bob.start();
  await charlie.start();

  log('SYSTEM', '4 agents prêts!\n', C.green);
  console.log('─'.repeat(50) + '\n');

  // 7. Distribuer des tâches
  log('COORD', 'Distribution des tâches...', C.blue);

  await coordinator.assignTask({
    id: 't1',
    from: 'COORD',
    to: 'ALICE',
    content: 'Analyser les données clients',
    timestamp: new Date(),
    type: MessageType.TASK,
    priority: 1
  }, 'ALICE');

  await coordinator.assignTask({
    id: 't2',
    from: 'COORD',
    to: 'BOB',
    content: 'Générer le rapport mensuel',
    timestamp: new Date(),
    type: MessageType.TASK,
    priority: 1
  }, 'BOB');

  await coordinator.assignTask({
    id: 't3',
    from: 'COORD',
    to: 'CHARLIE',
    content: 'Optimiser les requêtes SQL',
    timestamp: new Date(),
    type: MessageType.TASK,
    priority: 1
  }, 'CHARLIE');

  // Attendre le traitement
  await sleep(2000);

  console.log('\n' + '─'.repeat(50));
  log('COORD', 'Broadcast: Bon travail équipe!', C.blue);
  await coordinator.broadcastToWorkers('Mission accomplie!');

  await sleep(500);

  // Stats
  console.log('\n' + '─'.repeat(50));
  const stats = coordinator.getStats();
  console.log(`\n  Workers: ${stats.workers}`);
  console.log(`  Tâches complétées: ${stats.completedTasks}`);

  // Cleanup
  console.log('\n' + '─'.repeat(50));
  log('SYSTEM', 'Arrêt...', C.green);

  await coordinator.stop();
  await alice.stop();
  await bob.stop();
  await charlie.stop();
  await broker.disconnect();
  await redis.disconnect();

  log('SYSTEM', 'Terminé!', C.green);
  console.log('\n' + '═'.repeat(50) + '\n');
}

demo().catch(console.error);
