/**
 * Queue de tâches Redis avec priorités et dépendances
 * Single Responsibility (S) - Gestion de la queue uniquement
 */

import { ITaskQueue, IQueuedTask, QueuedTaskStatus } from '../interfaces/ITaskQueue';
import { ITask, IResult } from '../interfaces/IMessage';
import { RedisClient } from './RedisClient';
import { generateId } from '../utils/generateId';
import Redis from 'ioredis';

export class RedisTaskQueue implements ITaskQueue {
  private client: Redis;
  private readonly QUEUE_KEY = 'taskqueue:pending';
  private readonly TASK_PREFIX = 'task:';
  private readonly DEPS_PREFIX = 'deps:';
  private readonly RESULT_PREFIX = 'result:';

  constructor(redisClient?: RedisClient) {
    const rc = redisClient || RedisClient.getInstance();
    this.client = rc.getClient();
  }

  /**
   * Ajoute une tâche à la queue
   */
  async enqueue(task: ITask, dependencies: string[] = []): Promise<string> {
    const taskId = task.id || generateId();

    const queuedTask: IQueuedTask = {
      ...task,
      id: taskId,
      dependencies,
      status: dependencies.length === 0 ? QueuedTaskStatus.READY : QueuedTaskStatus.PENDING,
      retryCount: 0,
      maxRetries: 3
    };

    // Stocke les données de la tâche
    await this.client.hset(
      `${this.TASK_PREFIX}${taskId}`,
      'data', JSON.stringify(this.serializeTask(queuedTask))
    );

    // Stocke les dépendances
    if (dependencies.length > 0) {
      await this.client.sadd(`${this.DEPS_PREFIX}${taskId}`, ...dependencies);
    }

    // Ajoute à la queue triée par priorité (score négatif = haute priorité en premier)
    const score = (task.priority || 0) * -1;
    await this.client.zadd(this.QUEUE_KEY, score, taskId);

    console.log(`[RedisTaskQueue] Task ${taskId} enqueued (status: ${queuedTask.status})`);
    return taskId;
  }

  /**
   * Retire et retourne la prochaine tâche prête
   */
  async dequeue(): Promise<IQueuedTask | null> {
    const readyTasks = await this.getReadyTasks();
    if (readyTasks.length === 0) return null;

    const task = readyTasks[0];
    task.status = QueuedTaskStatus.IN_PROGRESS;
    task.startedAt = new Date();

    await this.client.hset(
      `${this.TASK_PREFIX}${task.id}`,
      'data', JSON.stringify(this.serializeTask(task))
    );

    console.log(`[RedisTaskQueue] Task ${task.id} dequeued`);
    return task;
  }

  /**
   * Regarde la prochaine tâche sans la retirer
   */
  async peek(): Promise<IQueuedTask | null> {
    const readyTasks = await this.getReadyTasks();
    return readyTasks[0] || null;
  }

  /**
   * Marque une tâche comme terminée
   */
  async markComplete(taskId: string, result: IResult): Promise<void> {
    const taskData = await this.client.hget(`${this.TASK_PREFIX}${taskId}`, 'data');
    if (taskData) {
      const task: IQueuedTask = this.deserializeTask(JSON.parse(taskData));
      task.status = QueuedTaskStatus.COMPLETED;
      task.completedAt = new Date();

      await this.client.hset(
        `${this.TASK_PREFIX}${taskId}`,
        'data', JSON.stringify(this.serializeTask(task)),
        'result', JSON.stringify(result)
      );
    }

    // Retire de la queue
    await this.client.zrem(this.QUEUE_KEY, taskId);

    // Stocke le résultat
    await this.client.set(
      `${this.RESULT_PREFIX}${taskId}`,
      JSON.stringify(result),
      'EX', 3600 // 1 heure
    );

    // Résout les dépendances des autres tâches
    await this.resolveDependencies(taskId);

    console.log(`[RedisTaskQueue] Task ${taskId} completed`);
  }

  /**
   * Marque une tâche comme échouée
   */
  async markFailed(taskId: string, error: Error): Promise<void> {
    const taskData = await this.client.hget(`${this.TASK_PREFIX}${taskId}`, 'data');
    if (taskData) {
      const task: IQueuedTask = this.deserializeTask(JSON.parse(taskData));
      task.retryCount++;

      if (task.retryCount < task.maxRetries) {
        // Retry avec backoff exponentiel
        task.status = QueuedTaskStatus.RETRYING;
        const delay = Math.pow(2, task.retryCount) * 1000;
        task.scheduledAt = new Date(Date.now() + delay);

        console.log(`[RedisTaskQueue] Task ${taskId} will retry in ${delay}ms (attempt ${task.retryCount}/${task.maxRetries})`);
      } else {
        task.status = QueuedTaskStatus.FAILED;
        console.log(`[RedisTaskQueue] Task ${taskId} failed after ${task.maxRetries} attempts`);
      }

      await this.client.hset(
        `${this.TASK_PREFIX}${taskId}`,
        'data', JSON.stringify(this.serializeTask(task)),
        'error', error.message
      );
    }
  }

  /**
   * Récupère toutes les tâches prêtes
   */
  async getReadyTasks(): Promise<IQueuedTask[]> {
    const taskIds = await this.client.zrange(this.QUEUE_KEY, 0, -1);
    const readyTasks: IQueuedTask[] = [];
    const now = Date.now();

    for (const taskId of taskIds) {
      const taskData = await this.client.hget(`${this.TASK_PREFIX}${taskId}`, 'data');
      if (taskData) {
        const task: IQueuedTask = this.deserializeTask(JSON.parse(taskData));

        // Vérifie si la tâche est prête
        if (task.status === QueuedTaskStatus.READY) {
          readyTasks.push(task);
        } else if (task.status === QueuedTaskStatus.RETRYING && task.scheduledAt) {
          // Vérifie si le délai de retry est passé
          if (task.scheduledAt.getTime() <= now) {
            task.status = QueuedTaskStatus.READY;
            await this.client.hset(
              `${this.TASK_PREFIX}${taskId}`,
              'data', JSON.stringify(this.serializeTask(task))
            );
            readyTasks.push(task);
          }
        }
      }
    }

    return readyTasks;
  }

  /**
   * Récupère le statut d'une tâche
   */
  async getTaskStatus(taskId: string): Promise<QueuedTaskStatus | undefined> {
    const taskData = await this.client.hget(`${this.TASK_PREFIX}${taskId}`, 'data');
    if (taskData) {
      const task: IQueuedTask = this.deserializeTask(JSON.parse(taskData));
      return task.status;
    }
    return undefined;
  }

  /**
   * Récupère le résultat d'une tâche
   */
  async getResult(taskId: string): Promise<IResult | null> {
    const data = await this.client.get(`${this.RESULT_PREFIX}${taskId}`);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  }

  /**
   * Nombre de tâches dans la queue
   */
  async size(): Promise<number> {
    return this.client.zcard(this.QUEUE_KEY);
  }

  /**
   * Vide la queue
   */
  async clear(): Promise<void> {
    const taskIds = await this.client.zrange(this.QUEUE_KEY, 0, -1);

    if (taskIds.length > 0) {
      const pipeline = this.client.pipeline();
      for (const taskId of taskIds) {
        pipeline.del(`${this.TASK_PREFIX}${taskId}`);
        pipeline.del(`${this.DEPS_PREFIX}${taskId}`);
        pipeline.del(`${this.RESULT_PREFIX}${taskId}`);
      }
      pipeline.del(this.QUEUE_KEY);
      await pipeline.exec();
    }

    console.log('[RedisTaskQueue] Queue cleared');
  }

  /**
   * Résout les dépendances après qu'une tâche soit terminée
   */
  private async resolveDependencies(completedTaskId: string): Promise<void> {
    const allTaskIds = await this.client.zrange(this.QUEUE_KEY, 0, -1);

    for (const taskId of allTaskIds) {
      const depsKey = `${this.DEPS_PREFIX}${taskId}`;
      const hasDep = await this.client.sismember(depsKey, completedTaskId);

      if (hasDep) {
        // Retire la dépendance résolue
        await this.client.srem(depsKey, completedTaskId);

        // Vérifie si toutes les dépendances sont résolues
        const remaining = await this.client.scard(depsKey);
        if (remaining === 0) {
          const taskData = await this.client.hget(`${this.TASK_PREFIX}${taskId}`, 'data');
          if (taskData) {
            const task: IQueuedTask = this.deserializeTask(JSON.parse(taskData));
            if (task.status === QueuedTaskStatus.PENDING) {
              task.status = QueuedTaskStatus.READY;
              await this.client.hset(
                `${this.TASK_PREFIX}${taskId}`,
                'data', JSON.stringify(this.serializeTask(task))
              );
              console.log(`[RedisTaskQueue] Task ${taskId} is now ready (all dependencies resolved)`);
            }
          }
        }
      }
    }
  }

  /**
   * Sérialise une tâche pour Redis
   */
  private serializeTask(task: IQueuedTask): Record<string, unknown> {
    return {
      ...task,
      timestamp: task.timestamp instanceof Date ? task.timestamp.toISOString() : task.timestamp,
      deadline: task.deadline instanceof Date ? task.deadline.toISOString() : task.deadline,
      scheduledAt: task.scheduledAt instanceof Date ? task.scheduledAt.toISOString() : task.scheduledAt,
      startedAt: task.startedAt instanceof Date ? task.startedAt.toISOString() : task.startedAt,
      completedAt: task.completedAt instanceof Date ? task.completedAt.toISOString() : task.completedAt
    };
  }

  /**
   * Désérialise une tâche depuis Redis
   */
  private deserializeTask(data: Record<string, unknown>): IQueuedTask {
    return {
      ...data,
      timestamp: data.timestamp ? new Date(data.timestamp as string) : new Date(),
      deadline: data.deadline ? new Date(data.deadline as string) : undefined,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt as string) : undefined,
      startedAt: data.startedAt ? new Date(data.startedAt as string) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt as string) : undefined
    } as IQueuedTask;
  }
}
