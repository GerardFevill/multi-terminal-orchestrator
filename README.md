# Multi-Claude Orchestrator

Système multi-agents TypeScript avec principes SOLID.

## Architecture SOLID

```
src/
├── interfaces/           # (I) Interface Segregation
│   ├── IAgent.ts         # IAgent, ITaskExecutor, ITaskDistributor
│   ├── IMessage.ts       # IMessage, ITask, IResult
│   └── IMessageBroker.ts # IMessageSender, IMessageReceiver
├── agents/               # (O) Open/Closed + (L) Liskov
│   ├── Agent.ts          # Classe abstraite de base
│   ├── WorkerAgent.ts    # Exécute les tâches
│   └── CoordinatorAgent.ts # Distribue les tâches
├── communication/        # (D) Dependency Inversion
│   └── FileMessageBroker.ts # Implémente IMessageBroker
├── tasks/                # (S) Single Responsibility
│   └── TaskHandlers.ts   # Strategy pattern pour les handlers
├── utils/
│   └── generateId.ts
├── AgentFactory.ts       # Factory + DI
└── index.ts              # Point d'entrée
```

## Principes SOLID appliqués

### S - Single Responsibility
Chaque classe a une seule responsabilité :
- `Agent` : cycle de vie
- `WorkerAgent` : exécution de tâches
- `CoordinatorAgent` : distribution de tâches
- `FileMessageBroker` : communication fichier

### O - Open/Closed
- `Agent` est une classe abstraite extensible
- `TaskHandlers` permet d'ajouter des handlers sans modifier le code

### L - Liskov Substitution
- `WorkerAgent` et `CoordinatorAgent` peuvent remplacer `Agent`

### I - Interface Segregation
- `IMessageSender` et `IMessageReceiver` séparés
- `ITaskExecutor` et `ITaskDistributor` séparés

### D - Dependency Inversion
- Les agents dépendent de `IMessageBroker`, pas de `FileMessageBroker`
- Injection via constructeur

## Installation

```bash
npm install
npm run build
npm start
```

## Utilisation

```typescript
import { AgentFactory } from './AgentFactory';
import { AgentRole } from './interfaces/IAgent';

const factory = new AgentFactory('./comm');
const { coordinator, workers } = factory.createSystem(3);

await coordinator.start();
workers.forEach(w => w.start());

await coordinator.createTask('CALC: 2 + 2');
await coordinator.broadcastToWorkers('Hello!');
```

## Diagramme de classes

```
┌─────────────────┐
│   <<interface>> │
│    IAgent       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────┐
│  Agent (abs)    │────►│ <<interface>>       │
│                 │     │ IMessageBroker      │
│ + start()       │     └──────────┬──────────┘
│ + stop()        │                │
└────────┬────────┘                ▼
         │                ┌─────────────────────┐
    ┌────┴────┐           │ FileMessageBroker   │
    │         │           └─────────────────────┘
    ▼         ▼
┌────────┐ ┌─────────────┐
│ Worker │ │ Coordinator │
│ Agent  │ │ Agent       │
└────────┘ └─────────────┘
```
