/**
 * Point d'entrée - Multi-Agent Orchestrator v2
 * Avec Redis, Domaines génériques, et Teams configurables
 */

// Redis
import { RedisClient } from './redis/RedisClient';
import { RedisMessageBroker } from './redis/RedisMessageBroker';
import { RedisCache } from './redis/RedisCache';
import { RedisStateStore } from './redis/RedisStateStore';
import { RedisTaskQueue } from './redis/RedisTaskQueue';

// Domaines
import { DomainRegistry } from './domains/DomainRegistry';
import { registerDefaultDomains } from './domains/configs';

// Agents
import { CoordinatorAgent } from './agents/CoordinatorAgent';
import { WorkerAgent } from './agents/WorkerAgent';
import { createDefaultHandlers } from './tasks/TaskHandlers';

// Teams
import { TeamFactory } from './teams/TeamFactory';
import { Team } from './teams/Team';

// Interfaces
import { MessageType, ITask } from './interfaces/IMessage';

// Simulation
import { SocialApiSimulator } from './simulation/SocialApiSimulator';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   MULTI-AGENT ORCHESTRATOR v2 - Redis + MCP               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // 1. Initialisation Redis
  console.log('[1/5] Initialisation Redis...');
  const redisClient = RedisClient.getInstance();

  const isRedisAvailable = await redisClient.ping();
  if (!isRedisAvailable) {
    console.error('❌ Redis requis! Lancez: docker run -d -p 6379:6379 --name redis-orchestrator redis:alpine');
    process.exit(1);
  }

  console.log('     ✅ Redis connecté');

  // 2. Création des composants Redis
  console.log('[2/5] Création des composants...');
  const broker = new RedisMessageBroker(redisClient);
  const cache = new RedisCache(redisClient);
  const stateStore = new RedisStateStore(redisClient);
  const taskQueue = new RedisTaskQueue(redisClient);

  await broker.connect();
  console.log('     ✅ MessageBroker, Cache, StateStore, TaskQueue créés');

  // 3. Enregistrement des domaines
  console.log('[3/5] Enregistrement des domaines...');
  registerDefaultDomains();
  const registry = DomainRegistry.getInstance();
  console.log(`     ✅ Domaines: ${registry.listDomains().join(', ')}`);

  // 4. Création d'une équipe Social Media
  console.log('[4/5] Création de l\'équipe Social Media...');
  const factory = new TeamFactory({ messageBroker: broker });
  const socialTeam = factory.createTeamFromDomain('social-media', 'ViralTeam');
  console.log(`     ✅ Équipe: ${socialTeam.name} (${socialTeam.members.length} membres)`);

  // 5. Simulateur d'APIs sociales
  console.log('[5/5] Initialisation du simulateur...');
  const simulator = new SocialApiSimulator(0.05);
  console.log('     ✅ Simulateur prêt\n');

  // Afficher le résumé
  console.log('═══════════════════════════════════════════════════════════');
  console.log(socialTeam.getTeamSummary());
  console.log('═══════════════════════════════════════════════════════════\n');

  // Exemple: Créer du contenu via le pipeline
  console.log('Lancement du pipeline de création de contenu...\n');

  const contentIdea = 'Vidéo TikTok sur les 5 tendances IA de 2025';
  const pipeline = registry.get('social-media')?.pipelineSteps || [];

  for (const roleId of pipeline) {
    const member = socialTeam.getMemberByRole(roleId);
    if (member) {
      const task: ITask = {
        id: `pipeline-${roleId}-${Date.now()}`,
        from: `team:${socialTeam.id}`,
        to: member.agent.id,
        content: `[${roleId.toUpperCase()}] Traiter: ${contentIdea}`,
        timestamp: new Date(),
        type: MessageType.TASK,
        priority: 1
      };

      await taskQueue.enqueue(task);
      console.log(`  📤 Tâche: ${task.id} -> ${roleId}`);
    }
  }

  // Stats de la queue
  const queueSize = await taskQueue.size();
  console.log(`\n📊 Tâches dans la queue: ${queueSize}`);

  // Simulation de publication
  console.log('\n🚀 Simulation de publication...');
  const publishResult = await simulator.publish({
    platform: 'tiktok' as any,
    title: '5 tendances IA 2025',
    description: 'Découvrez les innovations qui vont changer le monde!',
    hashtags: ['IA', 'tech', 'innovation', '2025', 'futur']
  });

  if (publishResult.success) {
    console.log(`  ✅ Publication: ${publishResult.post?.url}`);
  } else {
    console.log(`  ❌ Échec: ${publishResult.error}`);
  }

  // Stats
  console.log('\n📈 Statistiques:');
  console.log(simulator.getGlobalStats());

  // Cleanup
  console.log('\n🛑 Fermeture...');
  await broker.disconnect();
  await redisClient.disconnect();

  console.log('✅ Terminé.');
}

// Exports
export {
  // Redis
  RedisClient,
  RedisMessageBroker,
  RedisCache,
  RedisStateStore,
  RedisTaskQueue,

  // Domaines
  DomainRegistry,
  registerDefaultDomains,

  // Agents
  CoordinatorAgent,
  WorkerAgent,

  // Teams
  Team,
  TeamFactory,

  // Simulation
  SocialApiSimulator
};

// Exécution
main().catch(console.error);
