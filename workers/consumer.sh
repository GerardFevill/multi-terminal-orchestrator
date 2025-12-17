#!/bin/bash
# Worker Consommateur - Lit les données produites et les traite

WORKER_ID="${1:-$$}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMM_DIR="$SCRIPT_DIR/comm"
LOGS_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOGS_DIR/consumer_$WORKER_ID.log"
DATA_FILE="$COMM_DIR/data_queue.txt"
PROCESSED_FILE="$COMM_DIR/processed_$WORKER_ID.txt"

# Couleurs
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [CONSUMER-$WORKER_ID] $1" >> "$LOG_FILE"
    echo -e "${BLUE}[CONSUMER-$WORKER_ID]${NC} $1"
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

# Consommer une donnée de la queue
consume_one() {
    local data=""

    # Lire et supprimer la première ligne (avec verrou)
    (
        flock -x 200

        if [ -f "$DATA_FILE" ] && [ -s "$DATA_FILE" ]; then
            data=$(head -1 "$DATA_FILE")
            if [ -n "$data" ]; then
                # Supprimer la première ligne
                tail -n +2 "$DATA_FILE" > "$DATA_FILE.tmp"
                mv "$DATA_FILE.tmp" "$DATA_FILE"
                echo "$data"
            fi
        fi
    ) 200>"$COMM_DIR/.lock_data"
}

# Traiter une donnée
process_data() {
    local data="$1"

    if [ -z "$data" ]; then
        return 1
    fi

    # Parser la donnée: DATA|producer_id|counter|timestamp|value
    IFS='|' read -r type producer_id counter timestamp value <<< "$data"

    # Simuler un traitement
    local result=$((value * 2))

    log "Traité: [Producer:$producer_id Counter:$counter] $value -> $result"

    # Sauvegarder le résultat
    echo "$timestamp|$producer_id|$counter|$value|$result" >> "$PROCESSED_FILE"

    return 0
}

# Boucle principale de consommation
consume_loop() {
    log "Démarrage du consommateur..."

    local idle_count=0

    while true; do
        # Vérifier le statut global
        local status=$(cat "$COMM_DIR/status.txt" 2>/dev/null)
        if [ "$status" = "STOP" ]; then
            log "Signal d'arrêt reçu"
            break
        fi

        # Vérifier les broadcasts
        check_broadcast

        # Essayer de consommer une donnée
        local data=$(consume_one)

        if [ -n "$data" ]; then
            process_data "$data"
            idle_count=0
        else
            idle_count=$((idle_count + 1))
            if [ $((idle_count % 5)) -eq 0 ]; then
                log "En attente de données... (idle: $idle_count)"
            fi
            sleep 1
        fi
    done

    log "Consommateur arrêté"
}

# Point d'entrée
mkdir -p "$LOGS_DIR"
> "$PROCESSED_FILE"
consume_loop
