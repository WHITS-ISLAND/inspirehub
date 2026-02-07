#!/bin/bash
INPUT=$(cat)

# Extract file_path without jq — grep the JSON key
FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+' | head -1)
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(echo "$INPUT" | grep -oP '"filePath"\s*:\s*"\K[^"]+' | head -1)
fi

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    cd "$CLAUDE_PROJECT_DIR" || exit 0
    "$CLAUDE_PROJECT_DIR/node_modules/.bin/oxlint" "$FILE_PATH" 2>&1
    ;;
esac

exit 0
