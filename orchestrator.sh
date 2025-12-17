#!/bin/bash
# Orchestrateur principal - Gère plusieurs terminaux et leur communication

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMM_DIR="$SCRIPT_DIR/comm"
LOGS_DIR="$SCRIPT_DIR/logs"
PIDS_FILE="$COMM_DIR/pids.txt"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Nettoyer les anciens fichiers
cleanup() {
    echo -e "${YELLOW}[ORCHESTRATOR] Arrêt des workers...${NC}"

    if [ -f "$PIDS_FILE" ]; then
        while read -r pid name; do
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${RED}[ORCHESTRATOR] Arrêt de $name (PID: $pid)${NC}"
                kill "$pid" 2>/dev/null
            fi
        done < "$PIDS_FILE"
        rm -f "$PIDS_FILE"
    fi

    # Supprimer les pipes nommés
    rm -f "$COMM_DIR/pipe_"* 2>/dev/null
    rm -f "$COMM_DIR/messages.queue" 2>/dev/null

    echo -e "${GREEN}[ORCHESTRATOR] Nettoyage terminé${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Initialisation
init() {
    echo -e "${BLUE}[ORCHESTRATOR] Initialisation...${NC}"

    # Créer les répertoires si nécessaire
    mkdir -p "$COMM_DIR" "$LOGS_DIR"

    # Créer le fichier de queue pour les messages
    > "$COMM_DIR/messages.queue"

    # Créer le fichier de statut partagé
    echo "READY" > "$COMM_DIR/status.txt"

    # Créer un pipe nommé pour la communication temps réel
    PIPE="$COMM_DIR/pipe_main"
    [ -p "$PIPE" ] || mkfifo "$PIPE"

    # Vider le fichier des PIDs
    > "$PIDS_FILE"

    echo -e "${GREEN}[ORCHESTRATOR] Initialisation terminée${NC}"
}

# Démarrer un worker
start_worker() {
    local worker_script="$1"
    local worker_name="$2"
    local worker_id="$3"

    if [ -f "$SCRIPT_DIR/workers/$worker_script" ]; then
        bash "$SCRIPT_DIR/workers/$worker_script" "$worker_id" &
        local pid=$!
        echo "$pid $worker_name" >> "$PIDS_FILE"
        echo -e "${GREEN}[ORCHESTRATOR] Démarré: $worker_name (PID: $pid)${NC}"
    else
        echo -e "${RED}[ORCHESTRATOR] Script non trouvé: $worker_script${NC}"
    fi
}

# Afficher le statut des workers
show_status() {
    echo -e "${BLUE}=== STATUT DES WORKERS ===${NC}"
    if [ -f "$PIDS_FILE" ]; then
        while read -r pid name; do
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${GREEN}[ACTIF] $name (PID: $pid)${NC}"
            else
                echo -e "${RED}[INACTIF] $name (PID: $pid)${NC}"
            fi
        done < "$PIDS_FILE"
    else
        echo "Aucun worker enregistré"
    fi
    echo -e "${BLUE}=========================${NC}"
}

# Envoyer un message à tous les workers via la queue
broadcast_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] BROADCAST: $message" >> "$COMM_DIR/messages.queue"
    echo -e "${YELLOW}[ORCHESTRATOR] Message diffusé: $message${NC}"
}

# Menu principal
main_menu() {
    while true; do
        echo ""
        echo -e "${BLUE}=== ORCHESTRATEUR MULTI-TERMINAL ===${NC}"
        echo "1. Démarrer un producteur"
        echo "2. Démarrer un consommateur"
        echo "3. Démarrer un moniteur"
        echo "4. Afficher le statut"
        echo "5. Envoyer un message broadcast"
        echo "6. Voir les logs"
        echo "7. Quitter"
        echo -n "Choix: "

        read -r choice

        case $choice in
            1)
                local id=$(date +%s%N | tail -c 5)
                start_worker "producer.sh" "Producer-$id" "$id"
                ;;
            2)
                local id=$(date +%s%N | tail -c 5)
                start_worker "consumer.sh" "Consumer-$id" "$id"
                ;;
            3)
                local id=$(date +%s%N | tail -c 5)
                start_worker "monitor.sh" "Monitor-$id" "$id"
                ;;
            4)
                show_status
                ;;
            5)
                echo -n "Message: "
                read -r msg
                broadcast_message "$msg"
                ;;
            6)
                echo -e "${BLUE}=== DERNIERS LOGS ===${NC}"
                tail -20 "$LOGS_DIR"/*.log 2>/dev/null || echo "Pas de logs"
                ;;
            7)
                cleanup
                ;;
            *)
                echo -e "${RED}Option invalide${NC}"
                ;;
        esac
    done
}

# Point d'entrée
init
main_menu
