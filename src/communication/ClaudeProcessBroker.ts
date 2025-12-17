/**
 * Lance de vrais processus Claude CLI
 * Single Responsibility: Gère les processus Claude
 */

import { spawn, ChildProcess } from 'child_process';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage } from '../interfaces/IMessage';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ClaudeProcess {
  id: string;
  process: ChildProcess;
  role: string;
}

export class ClaudeProcessBroker implements IMessageBroker {
  private basePath: string;
  private processes: Map<string, ClaudeProcess> = new Map();
  private subscribers: Map<string, (message: IMessage) => void> = new Map();

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async connect(): Promise<void> {
    await fs.mkdir(path.join(this.basePath, 'tasks'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'results'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'messages'), { recursive: true });
  }

  async disconnect(): Promise<void> {
    // Arrêter tous les processus Claude
    for (const [id, cp] of this.processes) {
      console.log(`[ClaudeProcessBroker] Arrêt de ${id}`);
      cp.process.kill('SIGTERM');
    }
    this.processes.clear();
  }

  /**
   * Lance un nouveau terminal Claude
   */
  async spawnClaudeAgent(agentId: string, role: string): Promise<void> {
    const prompt = this.buildPrompt(agentId, role);

    console.log(`[ClaudeProcessBroker] Lancement de ${agentId} (${role})...`);

    const claudeProcess = spawn('claude', ['-p', prompt], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    claudeProcess.stdout?.on('data', (data) => {
      console.log(`[${agentId}] ${data.toString()}`);
    });

    claudeProcess.stderr?.on('data', (data) => {
      console.error(`[${agentId}] ERROR: ${data.toString()}`);
    });

    claudeProcess.on('close', (code) => {
      console.log(`[${agentId}] Processus terminé (code: ${code})`);
      this.processes.delete(agentId);
    });

    this.processes.set(agentId, {
      id: agentId,
      process: claudeProcess,
      role
    });

    // Écrire le statut READY
    const resultsFile = path.join(this.basePath, 'results', `${agentId}_results.txt`);
    await fs.writeFile(resultsFile, `[READY] ${agentId} (${role}) lancé\n`);
  }

  private buildPrompt(agentId: string, role: string): string {
    return `Tu es ${agentId} (${role}) dans un système multi-agents.

FICHIERS DE COMMUNICATION:
- Tes tâches: ${this.basePath}/tasks/${agentId}_tasks.txt
- Tes résultats: ${this.basePath}/results/${agentId}_results.txt
- Broadcast: ${this.basePath}/broadcast.txt

INSTRUCTIONS:
1. Signale que tu es prêt
2. Vérifie régulièrement ton fichier de tâches
3. Exécute les tâches et écris les résultats
4. Réponds "DONE" quand tu as terminé une tâche`;
  }

  async send(message: IMessage): Promise<void> {
    const taskFile = path.join(this.basePath, 'tasks', `${message.to}_tasks.txt`);
    const content = `TASK:${message.id}|${message.content}\n`;
    await fs.appendFile(taskFile, content);
  }

  async broadcast(message: IMessage): Promise<void> {
    const broadcastFile = path.join(this.basePath, 'broadcast.txt');
    const content = `[${new Date().toISOString()}] ${message.content}\n`;
    await fs.appendFile(broadcastFile, content);
  }

  async receive(agentId: string): Promise<IMessage[]> {
    // Lire les résultats de l'agent
    const resultsFile = path.join(this.basePath, 'results', `${agentId}_results.txt`);
    try {
      const content = await fs.readFile(resultsFile, 'utf-8');
      // Parser les résultats si nécessaire
      return [];
    } catch {
      return [];
    }
  }

  subscribe(agentId: string, callback: (message: IMessage) => void): void {
    this.subscribers.set(agentId, callback);
  }

  unsubscribe(agentId: string): void {
    this.subscribers.delete(agentId);
  }

  /**
   * Liste les agents actifs
   */
  getActiveAgents(): string[] {
    return Array.from(this.processes.keys());
  }

  /**
   * Vérifie si un agent est actif
   */
  isAgentAlive(agentId: string): boolean {
    const cp = this.processes.get(agentId);
    return cp !== undefined && !cp.process.killed;
  }
}
