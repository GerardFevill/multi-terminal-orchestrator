#!/bin/bash
# Orchestrateur multi-Claude
# Lance plusieurs terminaux avec Claude CLI qui communiquent entre eux

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMM_DIR="$SCRIPT_DIR/claude-comm"
TASKS_DIR="$COMM_DIR/tasks"
RESULTS_DIR="$COMM_DIR/results"
MESSAGES_DIR="$COMM_DIR/messages"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Initialisation
init() {
    echo -e "${MAGENTA}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║       ORCHESTRATEUR MULTI-CLAUDE                  ║${NC}"
    echo -e "${MAGENTA}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""

    mkdir -p "$TASKS_DIR" "$RESULTS_DIR" "$MESSAGES_DIR"

    # Fichier de statut global
    echo "READY" > "$COMM_DIR/status.txt"

    # Queue de tâches partagée
    > "$COMM_DIR/task_queue.txt"

    # Canal de broadcast
    > "$COMM_DIR/broadcast.txt"

    echo -e "${GREEN}[INIT]${NC} Répertoires de communication créés dans: $COMM_DIR"
}

# Créer un prompt pour une instance Claude
create_claude_prompt() {
    local role="$1"
    local instance_id="$2"

    cat << EOF
Tu es l'instance Claude "$role" (ID: $instance_id) dans un système multi-agents.

COMMUNICATION:
- Lis tes tâches dans: $TASKS_DIR/${instance_id}_tasks.txt
- Écris tes résultats dans: $RESULTS_DIR/${instance_id}_results.txt
- Envoie des messages aux autres dans: $MESSAGES_DIR/
- Lis les broadcasts dans: $COMM_DIR/broadcast.txt

PROTOCOLE:
1. Au démarrage, écris "READY" dans ton fichier de résultats
2. Vérifie régulièrement ton fichier de tâches
3. Quand tu termines une tâche, écris le résultat et "DONE:<task_id>"
4. Pour communiquer avec une autre instance, crée un fichier dans $MESSAGES_DIR/to_<target_id>.txt

Ton rôle: $role
Commence par signaler que tu es prêt.
EOF
}

# Afficher les instructions pour lancer manuellement
show_manual_instructions() {
    local num_instances="${1:-3}"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  INSTRUCTIONS POUR LANCER LES INSTANCES CLAUDE${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Ouvrez $num_instances terminaux et lancez dans chacun:${NC}"
    echo ""

    local roles=("coordinator" "worker-1" "worker-2" "researcher" "reviewer")

    for i in $(seq 1 $num_instances); do
        local role="${roles[$((i-1))]}"
        local instance_id="claude-$i"

        # Créer le fichier de prompt
        create_claude_prompt "$role" "$instance_id" > "$COMM_DIR/prompt_${instance_id}.txt"

        # Créer les fichiers de communication pour cette instance
        > "$TASKS_DIR/${instance_id}_tasks.txt"
        > "$RESULTS_DIR/${instance_id}_results.txt"

        echo -e "${GREEN}Terminal $i ($role):${NC}"
        echo -e "  cd $SCRIPT_DIR"
        echo -e "  claude --print \"$COMM_DIR/prompt_${instance_id}.txt\""
        echo ""
        echo -e "  ${BLUE}Ou en mode interactif:${NC}"
        echo -e "  claude"
        echo -e "  ${BLUE}Puis copiez le contenu de:${NC} $COMM_DIR/prompt_${instance_id}.txt"
        echo ""
    done

    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Envoyer une tâche à une instance
send_task() {
    local instance_id="$1"
    local task="$2"
    local task_id=$(date +%s%N | tail -c 8)

    echo "TASK:$task_id|$task" >> "$TASKS_DIR/${instance_id}_tasks.txt"
    echo -e "${GREEN}[TASK]${NC} Envoyé à $instance_id: $task (ID: $task_id)"
}

# Broadcast à toutes les instances
broadcast() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] $message" >> "$COMM_DIR/broadcast.txt"
    echo -e "${YELLOW}[BROADCAST]${NC} $message"
}

# Voir les résultats
show_results() {
    echo -e "${BLUE}═══ RÉSULTATS ═══${NC}"
    for f in "$RESULTS_DIR"/*.txt; do
        if [ -f "$f" ]; then
            local name=$(basename "$f" .txt)
            echo -e "${CYAN}--- $name ---${NC}"
            tail -10 "$f"
            echo ""
        fi
    done
}

# Voir les messages entre instances
show_messages() {
    echo -e "${BLUE}═══ MESSAGES INTER-INSTANCES ═══${NC}"
    for f in "$MESSAGES_DIR"/*.txt; do
        if [ -f "$f" ]; then
            local name=$(basename "$f" .txt)
            echo -e "${CYAN}--- $name ---${NC}"
            cat "$f"
            echo ""
        fi
    done
}

# Menu principal
menu() {
    while true; do
        echo ""
        echo -e "${BLUE}═══ MENU ORCHESTRATEUR ═══${NC}"
        echo "1. Afficher instructions de lancement"
        echo "2. Envoyer une tâche à une instance"
        echo "3. Broadcast à toutes les instances"
        echo "4. Voir les résultats"
        echo "5. Voir les messages inter-instances"
        echo "6. Réinitialiser la communication"
        echo "7. Quitter"
        echo -n "Choix: "

        read -r choice

        case $choice in
            1)
                echo -n "Nombre d'instances (défaut: 3): "
                read -r num
                show_manual_instructions "${num:-3}"
                ;;
            2)
                echo -n "Instance (ex: claude-1): "
                read -r instance
                echo -n "Tâche: "
                read -r task
                send_task "$instance" "$task"
                ;;
            3)
                echo -n "Message: "
                read -r msg
                broadcast "$msg"
                ;;
            4)
                show_results
                ;;
            5)
                show_messages
                ;;
            6)
                init
                ;;
            7)
                echo -e "${GREEN}Au revoir!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Option invalide${NC}"
                ;;
        esac
    done
}

# Point d'entrée
init
menu
