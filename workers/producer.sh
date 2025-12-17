#!/bin/bash
# Worker Producteur - Génère des données et les envoie via le système de communication

WORKER_ID="${1:-$$}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMM_DIR="$SCRIPT_DIR/comm"
LOGS_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOGS_DIR/producer_$WORKER_ID.log"

# Couleurs
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [PRODUCER-$WORKER_ID] $1" >> "$LOG_FILE"
    echo -e "${GREEN}[PRODUCER-$WORKER_ID]${NC} $1"
}

# Vérifier les messages broadcast
check_broadcast() {
    if [ -f "$COMM_DIR/messages.queue" ]; then
        local last_msg=$(tail -1 "$COMM_DIR/messages.queue" 2>/dev/null)
        if [ -n "$last_msg" ] && [ "$last_msg" != "$LAST_BROADCAST" ]; then
            LAST_BROADCAST="$last_msg"
            log "Broadcast reçu: $last_msg"
        fi
    fi
}

# Générer et envoyer des données
produce_data() {
    local counter=0
    local data_file="$COMM_DIR/data_queue.txt"

    log "Démarrage du producteur..."

    while true; do
        # Vérifier le statut global
        local status=$(cat "$COMM_DIR/status.txt" 2>/dev/null)
        if [ "$status" = "STOP" ]; then
            log "Signal d'arrêt reçu"
            break
        fi

        # Vérifier les broadcasts
        check_broadcast

        # Générer une donnée
        counter=$((counter + 1))
        local timestamp=$(date '+%H:%M:%S')
        local data="DATA|$WORKER_ID|$counter|$timestamp|$(shuf -i 1-100 -n 1)"

        # Écrire dans la queue de données (avec verrou)
        (
            flock -x 200
            echo "$data" >> "$data_file"
        ) 200>"$COMM_DIR/.lock_data"

        log "Produit: $data"

        # Pause aléatoire entre 1 et 3 secondes
        sleep $(shuf -i 1-3 -n 1)
    done

    log "Producteur arrêté"
}

# Point d'entrée
mkdir -p "$LOGS_DIR"
produce_data
