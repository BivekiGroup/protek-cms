#!/usr/bin/env bash
set -euo pipefail

# Sync and validate env vars across docker-compose.yml, stack.env, and .env
# Usage:
#   bash scripts/sync-env.sh check   # show missing/placeholder status
#   bash scripts/sync-env.sh sync    # append missing keys to stack.env/.env

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.yml"
STACK_ENV="stack.env"
STACK_EXAMPLE="stack.example.env"
DOTENV=".env"
DOTENV_EXAMPLE=".env.example"

die() { echo "Error: $*" >&2; exit 1; }

[ -f "$COMPOSE_FILE" ] || die "Missing $COMPOSE_FILE"

extract_compose_vars() {
  grep -oE '\$\{[A-Z0-9_]+(:-[^}]*)?\}' -h "$COMPOSE_FILE" \
    | sed -E 's/^\$\{([A-Z0-9_]+).*/\1/' \
    | sort -u
}

list_vars_from_file() {
  # prints var names (no values)
  [ -f "$1" ] || return 0
  grep -E '^[A-Z0-9_]+=' -h "$1" | sed -E 's/=.*$//' | sort -u
}

canonical_vars() {
  # union of compose vars and example files
  comm -12 <(extract_compose_vars | sort -u) <(extract_compose_vars | sort -u) >/dev/null 2>&1 || true
  { extract_compose_vars; list_vars_from_file "$STACK_EXAMPLE"; list_vars_from_file "$DOTENV_EXAMPLE"; } \
    | sort -u
}

placeholder_like() {
  local v="$1"
  [[ -z "$v" ]] && return 0
  echo "$v" | grep -qiE '(change-me|changeme|placeholder|your-|your_|example\.com|localhost|^sk-xxxx$)'
}

value_for() {
  # value_for VAR TARGET(example path)
  local var="$1" example_file="$2"
  if [ -f "$example_file" ]; then
    local line
    line=$(grep -E "^${var}=" "$example_file" || true)
    if [ -n "$line" ]; then
      echo "${line#*=}"
      return 0
    fi
  fi
  echo "" # default empty
}

sync_file() {
  # sync_file TARGET EXAMPLE
  local target="$1" example="$2"
  local tmp="$target.sync.$$"
  local vars existing missing

  vars=$(canonical_vars)
  existing=$(list_vars_from_file "$target")

  cp -f "$target" "$tmp" 2>/dev/null || :

  # For each canonical var, ensure present in target; append if missing
  while IFS= read -r var; do
    if ! echo "$existing" | grep -qx "$var"; then
      local def
      def=$(value_for "$var" "$example")
      echo "${var}=${def}" >> "$tmp"
      echo "+ appended $var to $target"
    fi
  done <<< "$vars"

  # Create file if not exists or changed
  if ! cmp -s "$tmp" "$target"; then
    mv "$tmp" "$target"
  else
    rm -f "$tmp"
  fi
}

check_file() {
  # check_file TARGET
  local target="$1"
  local vars missing=0 placeholders=0
  vars=$(canonical_vars)

  echo "==> $target"
  while IFS= read -r var; do
    local line val
    line=$(grep -E "^${var}=" "$target" 2>/dev/null | tail -n1 || true)
    if [ -z "$line" ]; then
      printf "  - %s: MISSING\n" "$var"
      missing=$((missing+1))
    else
      val=${line#*=}
      # trim quotes/spaces
      val=$(printf "%s" "$val" | sed -E 's/^ *"?|"? *$//g')
      if placeholder_like "$val"; then
        printf "  - %s: PLACEHOLDER\n" "$var"
        placeholders=$((placeholders+1))
      fi
    fi
  done <<< "$vars"
  echo "Summary: missing=$missing placeholders=$placeholders"
}

cmd=${1:-check}
case "$cmd" in
  check)
    [ -f "$STACK_ENV" ] || touch "$STACK_ENV"
    [ -f "$DOTENV" ] || touch "$DOTENV"
    check_file "$STACK_ENV"
    check_file "$DOTENV"
    ;;
  sync)
    [ -f "$STACK_ENV" ] || cp "$STACK_EXAMPLE" "$STACK_ENV" 2>/dev/null || touch "$STACK_ENV"
    [ -f "$DOTENV" ] || cp "$DOTENV_EXAMPLE" "$DOTENV" 2>/dev/null || touch "$DOTENV"
    sync_file "$STACK_ENV" "$STACK_EXAMPLE"
    sync_file "$DOTENV" "$DOTENV_EXAMPLE"
    echo "Done. Review appended keys at the end of each file."
    ;;
  *)
    echo "Usage: $0 [check|sync]"; exit 2;
    ;;
esac

