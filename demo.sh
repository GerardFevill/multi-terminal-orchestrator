#!/bin/bash
# Script de démonstration automatique
# Lance plusieurs workers et montre la communication entre eux

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMM_DIR="$SCRIPT_DIR/comm"
LOGS_DIR="$SCRIPT_DIR/logs"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PIDS=()

cleanup() {
    echo ""
    echo -e "${YELLOW}Arrêt de la démonstration...${NC}"
    echo "STOP" > "$COMM_DIR/status.txt"

    sleep 2

    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null
    done

    echo -e "${GREEN}Démonstration terminée!${NC}"
    echo ""
    echo -e "${CYAN}Résumé des fichiers générés:${NC}"
    echo "- Logs: $LOGS_DIR/"
    echo "- Données traitées: $COMM_DIR/processed_*.txt"
    echo "- Queue de messages: $COMM_DIR/messages.queue"

    exit 0
}

trap cleanup SIGINT SIGTERM

# Initialisation
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║   DÉMONSTRATION MULTI-TERMINAL & COMMUNICATION    ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Créer les répertoires
mkdir -p "$COMM_DIR" "$LOGS_DIR"
> "$COMM_DIR/data_queue.txt"
> "$COMM_DIR/messages.queue"
echo "READY" > "$COMM_DIR/status.txt"

echo -e "${BLUE}[DEMO]${NC} Démarrage des workers..."
echo ""

# Démarrer 2 producteurs
echo -e "${GREEN}[DEMO]${NC} Lancement de 2 producteurs..."
bash "$SCRIPT_DIR/workers/producer.sh" "P1" &
PIDS+=($!)
bash "$SCRIPT_DIR/workers/producer.sh" "P2" &
PIDS+=($!)

sleep 1

# Démarrer 2 consommateurs
echo -e "${GREEN}[DEMO]${NC} Lancement de 2 consommateurs..."
bash "$SCRIPT_DIR/workers/consumer.sh" "C1" &
PIDS+=($!)
bash "$SCRIPT_DIR/workers/consumer.sh" "C2" &
PIDS+=($!)

sleep 1

# Démarrer 1 moniteur
echo -e "${GREEN}[DEMO]${NC} Lancement du moniteur..."
bash "$SCRIPT_DIR/workers/monitor.sh" "M1" &
PIDS+=($!)

echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Workers actifs: ${#PIDS[@]}${NC}"
echo -e "${YELLOW}  Appuyez sur Ctrl+C pour arrêter la démonstration${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════${NC}"
echo ""

# Envoyer quelques messages broadcast pendant la démo
sleep 10
echo "BROADCAST: Test message 1" >> "$COMM_DIR/messages.queue"
echo -e "${CYAN}[DEMO] Broadcast envoyé: Test message 1${NC}"

sleep 10
echo "BROADCAST: Test message 2" >> "$COMM_DIR/messages.queue"
echo -e "${CYAN}[DEMO] Broadcast envoyé: Test message 2${NC}"

# Attendre indéfiniment
while true; do
    sleep 5
done
