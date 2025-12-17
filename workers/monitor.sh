#!/bin/bash
# Worker Moniteur - Surveille l'activité du système et génère des rapports

WORKER_ID="${1:-$$}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMM_DIR="$SCRIPT_DIR/comm"
LOGS_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOGS_DIR/monitor_$WORKER_ID.log"
DATA_FILE="$COMM_DIR/data_queue.txt"
PIDS_FILE="$COMM_DIR/pids.txt"

# Couleurs
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [MONITOR-$WORKER_ID] $1" >> "$LOG_FILE"
    echo -e "${YELLOW}[MONITOR-$WORKER_ID]${NC} $1"
}

# Compter les workers actifs
count_active_workers() {
    local active=0
    local total=0

    if [ -f "$PIDS_FILE" ]; then
        while read -r pid name; do
            total=$((total + 1))
            if kill -0 "$pid" 2>/dev/null; then
                active=$((active + 1))
            fi
        done < "$PIDS_FILE"
    fi

    echo "$active/$total"
}

# Compter les données en attente
count_pending_data() {
    if [ -f "$DATA_FILE" ]; then
        wc -l < "$DATA_FILE" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Compter les données traitées
count_processed_data() {
    local total=0
    for f in "$COMM_DIR"/processed_*.txt; do
        if [ -f "$f" ]; then
            local count=$(wc -l < "$f" 2>/dev/null || echo "0")
            total=$((total + count))
        fi
    done
    echo "$total"
}

# Calculer le débit
calculate_throughput() {
    local current=$(count_processed_data)
    local previous=${LAST_PROCESSED:-0}
    local diff=$((current - previous))
    LAST_PROCESSED=$current
    echo "$diff"
}

# Générer un rapport
generate_report() {
    local workers=$(count_active_workers)
    local pending=$(count_pending_data)
    local processed=$(count_processed_data)
    local throughput=$(calculate_throughput)
    local timestamp=$(date '+%H:%M:%S')

    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║      RAPPORT SYSTÈME - $timestamp       ║${NC}"
    echo -e "${MAGENTA}╠════════════════════════════════════════╣${NC}"
    echo -e "${MAGENTA}║${NC} Workers actifs    : ${YELLOW}$workers${NC}"
    echo -e "${MAGENTA}║${NC} Données en attente: ${YELLOW}$pending${NC}"
    echo -e "${MAGENTA}║${NC} Données traitées  : ${YELLOW}$processed${NC}"
    echo -e "${MAGENTA}║${NC} Débit (par cycle) : ${YELLOW}$throughput${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"

    # Logger le rapport
    log "Workers:$workers Pending:$pending Processed:$processed Throughput:$throughput"
}

# Vérifier les alertes
check_alerts() {
    local pending=$(count_pending_data)

    # Alerte si trop de données en attente
    if [ "$pending" -gt 20 ]; then
        log "ALERTE: File d'attente saturée ($pending éléments)"
        echo "ALERT|QUEUE_HIGH|$pending" >> "$COMM_DIR/messages.queue"
    fi

    # Vérifier les workers morts
    if [ -f "$PIDS_FILE" ]; then
        while read -r pid name; do
            if ! kill -0 "$pid" 2>/dev/null; then
                log "ALERTE: Worker mort détecté - $name (PID: $pid)"
            fi
        done < "$PIDS_FILE"
    fi
}

# Boucle principale de monitoring
monitor_loop() {
    log "Démarrage du moniteur..."
    LAST_PROCESSED=0

    while true; do
        # Vérifier le statut global
        local status=$(cat "$COMM_DIR/status.txt" 2>/dev/null)
        if [ "$status" = "STOP" ]; then
            log "Signal d'arrêt reçu"
            break
        fi

        # Générer le rapport
        generate_report

        # Vérifier les alertes
        check_alerts

        # Pause de 5 secondes entre les rapports
        sleep 5
    done

    log "Moniteur arrêté"
}

# Point d'entrée
mkdir -p "$LOGS_DIR"
monitor_loop
