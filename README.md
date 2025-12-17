# Multi-Claude Orchestrator

Système multi-agents TypeScript avec principes SOLID. Lance de vrais terminaux Claude via `spawn`.

## Installation

```bash
npm install
npm run dev
```

## Architecture

```
src/
├── index.ts                    # Point d'entrée (lance Claude)
├── AgentFactory.ts             # Factory + Dependency Injection
├── interfaces/                 # (I) Interface Segregation
│   ├── IAgent.ts
│   ├── IMessage.ts
│   └── IMessageBroker.ts
├── agents/                     # (O/L) Open/Closed + Liskov
│   ├── Agent.ts                # Classe abstraite
│   ├── WorkerAgent.ts
│   └── CoordinatorAgent.ts
├── communication/
│   ├── ClaudeProcessBroker.ts  # Lance Claude via spawn()
│   └── FileMessageBroker.ts    # Communication fichier
├── tasks/
│   └── TaskHandlers.ts         # Strategy pattern
└── utils/
    └── generateId.ts
```

## Principes SOLID

| Principe | Application |
|----------|-------------|
| **S** Single Responsibility | 1 classe = 1 responsabilité |
| **O** Open/Closed | Agent extensible sans modification |
| **L** Liskov Substitution | Worker/Coordinator remplacent Agent |
| **I** Interface Segregation | IMessageSender ≠ IMessageReceiver |
| **D** Dependency Inversion | Injection de IMessageBroker |

## Comment ça marche

```typescript
// Lance 3 terminaux Claude
const broker = new ClaudeProcessBroker('./claude-comm');
await broker.spawnClaudeAgent('agent-1', 'coordinator');
await broker.spawnClaudeAgent('agent-2', 'worker');
await broker.spawnClaudeAgent('agent-3', 'worker');

// Envoie une tâche
await broker.send({
  id: 'task-001',
  to: 'agent-2',
  content: 'Liste les fichiers',
  type: MessageType.TASK
});
```

## Communication

Les agents communiquent via `claude-comm/` :

```
claude-comm/
├── tasks/       # Tâches par agent
├── results/     # Résultats par agent
└── messages/    # Messages inter-agents
```
