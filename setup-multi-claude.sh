#!/bin/bash
# Setup rapide pour système multi-Claude
# Prépare les fichiers de communication et affiche les commandes à lancer

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMM_DIR="$SCRIPT_DIR/claude-comm"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         SETUP SYSTÈME MULTI-CLAUDE                        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Créer la structure
mkdir -p "$COMM_DIR"/{tasks,results,messages}
> "$COMM_DIR/broadcast.txt"
echo "READY" > "$COMM_DIR/status.txt"

echo -e "${GREEN}Structure créée dans:${NC} $COMM_DIR"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  OUVREZ PLUSIEURS TERMINAUX ET LANCEZ:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Terminal 1 - Coordinateur:${NC}"
echo "  cd $SCRIPT_DIR"
echo "  ./start-claude-agent.sh coordinator agent-1"
echo ""

echo -e "${GREEN}Terminal 2 - Worker 1:${NC}"
echo "  cd $SCRIPT_DIR"
echo "  ./start-claude-agent.sh worker agent-2"
echo ""

echo -e "${GREEN}Terminal 3 - Worker 2:${NC}"
echo "  cd $SCRIPT_DIR"
echo "  ./start-claude-agent.sh worker agent-3"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Pour envoyer une tâche à agent-1:${NC}"
echo "  echo 'TASK: Analyse le fichier X' >> $COMM_DIR/tasks/agent-1_tasks.txt"
echo ""
echo -e "${CYAN}Pour broadcaster à tous:${NC}"
echo "  echo 'Message global' >> $COMM_DIR/broadcast.txt"
echo ""
echo -e "${CYAN}Pour voir les résultats:${NC}"
echo "  cat $COMM_DIR/results/*.txt"
echo ""
