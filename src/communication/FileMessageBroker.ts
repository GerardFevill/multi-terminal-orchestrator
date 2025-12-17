/**
 * Single Responsibility Principle (S) - Gère uniquement la communication fichier
 * Dependency Inversion Principle (D) - Implémente IMessageBroker
 */

import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IMessage } from '../interfaces/IMessage';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileMessageBroker implements IMessageBroker {
  private basePath: string;
  private subscribers: Map<string, (message: IMessage) => void> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastReadTimestamps: Map<string, number> = new Map();

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async connect(): Promise<void> {
    // Créer les répertoires nécessaires
    await fs.mkdir(path.join(this.basePath, 'tasks'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'results'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'messages'), { recursive: true });

    // Démarrer le polling pour les nouveaux messages
    this.startPolling();
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async send(message: IMessage): Promise<void> {
    const filename = `${message.to}_inbox.json`;
    const filepath = path.join(this.basePath, 'messages', filename);

    // Lire les messages existants
    let messages: IMessage[] = [];
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      messages = JSON.parse(content);
    } catch {
      // Fichier n'existe pas encore
    }

    // Ajouter le nouveau message
    messages.push(message);

    // Écrire le fichier
    await fs.writeFile(filepath, JSON.stringify(messages, null, 2));
  }

  async broadcast(message: IMessage): Promise<void> {
    const filepath = path.join(this.basePath, 'broadcast.json');

    let messages: IMessage[] = [];
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      messages = JSON.parse(content);
    } catch {
      // Fichier n'existe pas
    }

    messages.push(message);
    await fs.writeFile(filepath, JSON.stringify(messages, null, 2));

    // Notifier tous les subscribers
    for (const [agentId, callback] of this.subscribers) {
      callback(message);
    }
  }

  async receive(agentId: string): Promise<IMessage[]> {
    const filename = `${agentId}_inbox.json`;
    const filepath = path.join(this.basePath, 'messages', filename);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const messages: IMessage[] = JSON.parse(content);

      // Vider la boîte de réception après lecture
      await fs.writeFile(filepath, '[]');

      return messages;
    } catch {
      return [];
    }
  }

  subscribe(agentId: string, callback: (message: IMessage) => void): void {
    this.subscribers.set(agentId, callback);
    this.lastReadTimestamps.set(agentId, Date.now());
  }

  unsubscribe(agentId: string): void {
    this.subscribers.delete(agentId);
    this.lastReadTimestamps.delete(agentId);
  }

  private startPolling(): void {
    this.pollInterval = setInterval(async () => {
      for (const [agentId, callback] of this.subscribers) {
        const messages = await this.receive(agentId);
        for (const message of messages) {
          callback(message);
        }
      }
    }, 1000); // Poll toutes les secondes
  }
}
