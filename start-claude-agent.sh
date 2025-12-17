#!/bin/bash
# Lance une instance Claude avec un rôle spécifique
# Usage: ./start-claude-agent.sh <role> [instance-id]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMM_DIR="$SCRIPT_DIR/claude-comm"

ROLE="${1:-worker}"
INSTANCE_ID="${2:-claude-$(date +%s%N | tail -c 5)}"

# Créer les répertoires si nécessaire
mkdir -p "$COMM_DIR/tasks" "$COMM_DIR/results" "$COMM_DIR/messages"

# Fichiers de cette instance
TASKS_FILE="$COMM_DIR/tasks/${INSTANCE_ID}_tasks.txt"
RESULTS_FILE="$COMM_DIR/results/${INSTANCE_ID}_results.txt"
INBOX="$COMM_DIR/messages/to_${INSTANCE_ID}.txt"

# Initialiser les fichiers
> "$TASKS_FILE"
> "$RESULTS_FILE"
> "$INBOX"

# Créer le prompt initial
PROMPT=$(cat << EOF
Tu es une instance Claude agent avec le rôle "$ROLE" (ID: $INSTANCE_ID).

## Système de Communication

Tu fais partie d'un système multi-agents. Voici comment communiquer:

### Lire tes tâches:
\`\`\`bash
cat $TASKS_FILE
\`\`\`

### Écrire tes résultats:
\`\`\`bash
echo "RESULT: <ton_résultat>" >> $RESULTS_FILE
\`\`\`

### Envoyer un message à une autre instance (ex: claude-1):
\`\`\`bash
echo "FROM:$INSTANCE_ID|MESSAGE:<ton_message>" >> $COMM_DIR/messages/to_claude-1.txt
\`\`\`

### Lire tes messages entrants:
\`\`\`bash
cat $INBOX
\`\`\`

### Lire les broadcasts (messages globaux):
\`\`\`bash
cat $COMM_DIR/broadcast.txt
\`\`\`

## Ton Rôle: $ROLE

Commence par:
1. Signaler que tu es prêt en écrivant "READY" dans ton fichier de résultats
2. Décrire brièvement ce que tu peux faire dans ton rôle
3. Attendre des tâches ou des messages
EOF
)

echo "Lancement de Claude avec le rôle: $ROLE (ID: $INSTANCE_ID)"
echo "Fichiers de communication:"
echo "  - Tâches: $TASKS_FILE"
echo "  - Résultats: $RESULTS_FILE"
echo "  - Inbox: $INBOX"
echo ""

# Lancer Claude avec le prompt
claude -p "$PROMPT"
