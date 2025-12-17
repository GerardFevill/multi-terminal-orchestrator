#!/usr/bin/env npx ts-node
/**
 * MCP Server Redis - Permet à Claude d'accéder à Redis
 *
 * Outils exposés:
 * - redis_publish: Publier sur un canal
 * - redis_subscribe: Lire les messages d'un canal
 * - redis_get: Lire une clé
 * - redis_set: Écrire une clé
 * - redis_task_queue: Gérer une queue de tâches
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Redis from 'ioredis';

// Connexion Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Buffer pour les messages reçus
const messageBuffer: Map<string, string[]> = new Map();

// Setup subscriber
subscriber.on('message', (channel, message) => {
  if (!messageBuffer.has(channel)) {
    messageBuffer.set(channel, []);
  }
  messageBuffer.get(channel)!.push(message);
  // Garder max 100 messages par canal
  if (messageBuffer.get(channel)!.length > 100) {
    messageBuffer.get(channel)!.shift();
  }
});

// Créer le serveur MCP
const server = new Server(
  {
    name: 'redis-orchestrator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Liste des outils
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'redis_publish',
        description: 'Publie un message sur un canal Redis (Pub/Sub)',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Nom du canal' },
            message: { type: 'string', description: 'Message à publier' },
          },
          required: ['channel', 'message'],
        },
      },
      {
        name: 'redis_get_messages',
        description: 'Récupère les messages reçus sur un canal (après subscribe)',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Nom du canal' },
            limit: { type: 'number', description: 'Nombre max de messages (défaut: 10)' },
          },
          required: ['channel'],
        },
      },
      {
        name: 'redis_subscribe',
        description: 'S\'abonne à un canal Redis pour recevoir les messages',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Nom du canal' },
          },
          required: ['channel'],
        },
      },
      {
        name: 'redis_get',
        description: 'Lit une valeur depuis Redis',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Clé à lire' },
          },
          required: ['key'],
        },
      },
      {
        name: 'redis_set',
        description: 'Écrit une valeur dans Redis',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Clé' },
            value: { type: 'string', description: 'Valeur' },
            ttl: { type: 'number', description: 'Expiration en secondes (optionnel)' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'redis_task_enqueue',
        description: 'Ajoute une tâche dans la queue',
        inputSchema: {
          type: 'object',
          properties: {
            queue: { type: 'string', description: 'Nom de la queue' },
            task: { type: 'string', description: 'Description de la tâche' },
            priority: { type: 'number', description: 'Priorité (1-10, 10=urgent)' },
          },
          required: ['queue', 'task'],
        },
      },
      {
        name: 'redis_task_dequeue',
        description: 'Récupère la prochaine tâche de la queue',
        inputSchema: {
          type: 'object',
          properties: {
            queue: { type: 'string', description: 'Nom de la queue' },
          },
          required: ['queue'],
        },
      },
      {
        name: 'redis_worker_status',
        description: 'Publie le statut d\'un worker',
        inputSchema: {
          type: 'object',
          properties: {
            workerId: { type: 'string', description: 'ID du worker' },
            status: { type: 'string', enum: ['ready', 'busy', 'offline'], description: 'Statut' },
          },
          required: ['workerId', 'status'],
        },
      },
      {
        name: 'redis_get_workers',
        description: 'Liste tous les workers et leur statut',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handler des outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'redis_publish': {
        const { channel, message } = args as { channel: string; message: string };
        const count = await redis.publish(channel, message);
        return {
          content: [{ type: 'text', text: `Message publié sur "${channel}" (${count} abonnés)` }],
        };
      }

      case 'redis_subscribe': {
        const { channel } = args as { channel: string };
        await subscriber.subscribe(channel);
        if (!messageBuffer.has(channel)) {
          messageBuffer.set(channel, []);
        }
        return {
          content: [{ type: 'text', text: `Abonné au canal "${channel}"` }],
        };
      }

      case 'redis_get_messages': {
        const { channel, limit = 10 } = args as { channel: string; limit?: number };
        const messages = messageBuffer.get(channel) || [];
        const recent = messages.slice(-limit);
        return {
          content: [{
            type: 'text',
            text: recent.length > 0
              ? `Messages sur "${channel}":\n${recent.join('\n')}`
              : `Aucun message sur "${channel}"`
          }],
        };
      }

      case 'redis_get': {
        const { key } = args as { key: string };
        const value = await redis.get(key);
        return {
          content: [{ type: 'text', text: value || '(null)' }],
        };
      }

      case 'redis_set': {
        const { key, value, ttl } = args as { key: string; value: string; ttl?: number };
        if (ttl) {
          await redis.set(key, value, 'EX', ttl);
        } else {
          await redis.set(key, value);
        }
        return {
          content: [{ type: 'text', text: `OK - "${key}" = "${value.substring(0, 50)}..."` }],
        };
      }

      case 'redis_task_enqueue': {
        const { queue, task, priority = 5 } = args as { queue: string; task: string; priority?: number };
        const taskId = `task-${Date.now()}`;
        const taskData = JSON.stringify({ id: taskId, task, priority, status: 'pending', createdAt: new Date().toISOString() });

        // Utilise un sorted set pour la priorité
        await redis.zadd(`queue:${queue}`, priority, taskData);

        return {
          content: [{ type: 'text', text: `Tâche "${taskId}" ajoutée à "${queue}" (priorité: ${priority})` }],
        };
      }

      case 'redis_task_dequeue': {
        const { queue } = args as { queue: string };

        // Récupère la tâche avec la plus haute priorité
        const tasks = await redis.zrevrange(`queue:${queue}`, 0, 0);

        if (tasks.length === 0) {
          return {
            content: [{ type: 'text', text: `Queue "${queue}" vide` }],
          };
        }

        const taskData = tasks[0];
        await redis.zrem(`queue:${queue}`, taskData);

        const task = JSON.parse(taskData);
        return {
          content: [{ type: 'text', text: `Tâche récupérée: ${task.id}\nContenu: ${task.task}` }],
        };
      }

      case 'redis_worker_status': {
        const { workerId, status } = args as { workerId: string; status: string };

        await redis.hset(`worker:${workerId}`, {
          status,
          lastSeen: new Date().toISOString()
        });

        await redis.publish('workers:status', JSON.stringify({ workerId, status }));

        return {
          content: [{ type: 'text', text: `Worker "${workerId}" -> ${status}` }],
        };
      }

      case 'redis_get_workers': {
        const keys = await redis.keys('worker:*');
        const workers: string[] = [];

        for (const key of keys) {
          const data = await redis.hgetall(key);
          const workerId = key.replace('worker:', '');
          workers.push(`${workerId}: ${data.status || 'unknown'} (${data.lastSeen || 'never'})`);
        }

        return {
          content: [{
            type: 'text',
            text: workers.length > 0
              ? `Workers:\n${workers.join('\n')}`
              : 'Aucun worker enregistré'
          }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Outil inconnu: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Erreur: ${(error as Error).message}` }],
      isError: true,
    };
  }
});

// Démarrer le serveur
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Redis] Serveur démarré');
}

main().catch(console.error);
