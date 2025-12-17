# Multi-Terminal Demo

Projet de démonstration pour la gestion de plusieurs terminaux et la communication entre processus.

## Structure

```
multi-terminal-demo/
├── orchestrator.sh      # Orchestrateur interactif (menu)
├── demo.sh              # Démonstration automatique
├── workers/
│   ├── producer.sh      # Génère des données
│   ├── consumer.sh      # Traite les données
│   └── monitor.sh       # Surveille le système
├── comm/                # Fichiers de communication
│   ├── data_queue.txt   # Queue des données
│   ├── messages.queue   # Messages broadcast
│   ├── status.txt       # Statut global
│   └── processed_*.txt  # Résultats traités
└── logs/                # Logs des workers
```

## Méthodes de Communication

1. **File de données** (`data_queue.txt`) - Queue FIFO avec verrou pour producteur/consommateur
2. **Messages broadcast** (`messages.queue`) - Messages diffusés à tous les workers
3. **Statut global** (`status.txt`) - Signal d'arrêt/démarrage
4. **Verrous** (`.lock_*`) - Évite les accès concurrents

## Utilisation

### Démonstration automatique
```bash
./demo.sh
```
Lance 2 producteurs, 2 consommateurs et 1 moniteur. Ctrl+C pour arrêter.

### Mode interactif
```bash
./orchestrator.sh
```
Menu pour gérer manuellement les workers.

## Comment ça marche

1. **Producteurs** génèrent des données aléatoires toutes les 1-3 secondes
2. **Consommateurs** lisent et traitent les données (multiplication par 2)
3. **Moniteur** affiche un rapport toutes les 5 secondes
4. Tous les workers écoutent les messages broadcast
5. Le statut global permet d'arrêter proprement tous les workers
