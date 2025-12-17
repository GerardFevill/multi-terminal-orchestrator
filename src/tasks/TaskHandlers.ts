/**
 * Open/Closed Principle (O) - Nouveaux handlers sans modifier le code existant
 * Single Responsibility Principle (S) - Chaque handler fait une chose
 */

import { ITaskHandler } from '../agents/WorkerAgent';
import { ITask } from '../interfaces/IMessage';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Handler pour les commandes shell
export class ShellCommandHandler implements ITaskHandler {
  canHandle(taskType: string): boolean {
    return taskType.startsWith('SHELL:');
  }

  async handle(task: ITask): Promise<unknown> {
    const command = task.content.replace('SHELL:', '').trim();
    const { stdout, stderr } = await execAsync(command);
    return { stdout, stderr };
  }
}

// Handler pour les calculs
export class CalculationHandler implements ITaskHandler {
  canHandle(taskType: string): boolean {
    return taskType.startsWith('CALC:');
  }

  async handle(task: ITask): Promise<unknown> {
    const expression = task.content.replace('CALC:', '').trim();
    // Évaluation sécurisée (en production, utiliser une lib dédiée)
    const result = Function(`"use strict"; return (${expression})`)();
    return { expression, result };
  }
}

// Handler pour les analyses de fichiers
export class FileAnalysisHandler implements ITaskHandler {
  canHandle(taskType: string): boolean {
    return taskType.startsWith('ANALYZE:');
  }

  async handle(task: ITask): Promise<unknown> {
    const filepath = task.content.replace('ANALYZE:', '').trim();
    const { stdout } = await execAsync(`wc -l ${filepath}`);
    const lines = parseInt(stdout.trim().split(' ')[0]);
    return { filepath, lines };
  }
}

// Handler générique (fallback)
export class GenericHandler implements ITaskHandler {
  canHandle(_taskType: string): boolean {
    return true; // Accepte tout
  }

  async handle(task: ITask): Promise<unknown> {
    return {
      received: task.content,
      processedAt: new Date().toISOString(),
      note: 'Traitement générique'
    };
  }
}

// Factory pour créer les handlers par défaut
export function createDefaultHandlers(): ITaskHandler[] {
  return [
    new ShellCommandHandler(),
    new CalculationHandler(),
    new FileAnalysisHandler(),
    new GenericHandler() // Toujours en dernier (fallback)
  ];
}
