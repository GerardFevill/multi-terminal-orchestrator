# Multi-Claude Orchestrator

Système multi-agents permettant à plusieurs instances Claude de communiquer et collaborer via des fichiers partagés.

## Structure

```
multi-terminal-demo/
├── setup-multi-claude.sh      # Setup et instructions
├── start-claude-agent.sh      # Lancer un agent Claude
├── claude-orchestrator.sh     # Orchestrateur interactif
└── claude-comm/               # Fichiers de communication (généré)
    ├── tasks/                 # Tâches par agent
    ├── results/               # Résultats par agent
    ├── messages/              # Messages inter-agents
    └── broadcast.txt          # Messages globaux
```

## Utilisation rapide

```bash
./setup-multi-claude.sh
```

Puis dans des terminaux séparés :

```bash
./start-claude-agent.sh coordinator agent-1
./start-claude-agent.sh worker agent-2
./start-claude-agent.sh worker agent-3
```

## Communication entre agents

| Action | Commande |
|--------|----------|
| Lire ses tâches | `cat claude-comm/tasks/agent-X_tasks.txt` |
| Écrire un résultat | `echo "RESULT: done" >> claude-comm/results/agent-X_results.txt` |
| Envoyer un message | `echo "FROM:agent-X\|msg" >> claude-comm/messages/to_agent-Y.txt` |
| Broadcast | `echo "msg" >> claude-comm/broadcast.txt` |

## Orchestrateur interactif

```bash
./claude-orchestrator.sh
```

Menu pour envoyer des tâches, broadcaster, et voir les résultats.
