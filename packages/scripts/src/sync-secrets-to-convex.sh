#!/usr/bin/env bash
# Sync environment variables from 1Password to a Convex deployment.
#
# Reads secrets via the `op` CLI and pushes them to Convex with `npx convex env set`.
#
# Usage:
#   supa-sync-secrets --staging                         # sync to staging
#   supa-sync-secrets --production                      # sync to production
#   supa-sync-secrets --staging KEY1 KEY2 KEY3          # sync specific keys
#   supa-sync-secrets --staging --vault "My Vault"      # override 1Password vault
#
# Environment:
#   CONVEX_DEPLOY_KEY  - (optional) Convex deploy key for CI. If unset, uses logged-in session.
#   OP_VAULT           - (optional) 1Password vault name. Overridden by --vault flag.
#   SUPA_CONFIG        - (optional) Path to supa.config.json. Defaults to ./supa.config.json.
#
# The script reads secret key names from:
#   1. Command-line arguments (if provided)
#   2. supa.config.json "secrets" array (if file exists)
#   3. Falls back to environment variables already set in the shell

set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
ENV=""
VAULT="${OP_VAULT:-}"
CONFIG="${SUPA_CONFIG:-./supa.config.json}"
KEYS=()

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging)
      ENV="staging"
      shift
      ;;
    --production)
      ENV="production"
      shift
      ;;
    --vault)
      VAULT="$2"
      shift 2
      ;;
    --vault=*)
      VAULT="${1#--vault=}"
      shift
      ;;
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --config=*)
      CONFIG="${1#--config=}"
      shift
      ;;
    --help|-h)
      echo "Usage: supa-sync-secrets [--staging|--production] [--vault NAME] [KEY1 KEY2 ...]"
      echo ""
      echo "Syncs environment variables from 1Password to a Convex deployment."
      echo ""
      echo "Options:"
      echo "  --staging       Target the staging deployment"
      echo "  --production    Target the production deployment"
      echo "  --vault NAME    1Password vault name (or set OP_VAULT)"
      echo "  --config PATH   Path to supa.config.json (default: ./supa.config.json)"
      echo "  -h, --help      Show this help message"
      echo ""
      echo "If no KEY arguments are given, reads keys from supa.config.json 'secrets' array."
      exit 0
      ;;
    -*)
      echo "Error: Unknown option '$1'"
      echo "Run with --help for usage."
      exit 1
      ;;
    *)
      KEYS+=("$1")
      shift
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Validate environment
# ---------------------------------------------------------------------------
if [ -z "$ENV" ]; then
  echo "Error: Specify --staging or --production"
  echo "Usage: supa-sync-secrets [--staging|--production] [KEY1 KEY2 ...]"
  exit 1
fi

# ---------------------------------------------------------------------------
# Resolve secret keys
# ---------------------------------------------------------------------------
if [ ${#KEYS[@]} -eq 0 ]; then
  # Try reading from supa.config.json
  if [ -f "$CONFIG" ]; then
    # Read the "secrets" array from the config file using node (no jq dependency)
    KEYS_FROM_CONFIG=$(node -e "
      const cfg = require('$CONFIG');
      const secrets = cfg.secrets || [];
      secrets.forEach(s => console.log(typeof s === 'string' ? s : s.key));
    " 2>/dev/null || true)

    if [ -n "$KEYS_FROM_CONFIG" ]; then
      while IFS= read -r key; do
        KEYS+=("$key")
      done <<< "$KEYS_FROM_CONFIG"
    fi
  fi
fi

if [ ${#KEYS[@]} -eq 0 ]; then
  echo "Error: No secret keys specified."
  echo ""
  echo "Provide keys as arguments or define a 'secrets' array in supa.config.json."
  echo "Example: supa-sync-secrets --staging JWT_SECRET RESEND_API_KEY"
  exit 1
fi

# ---------------------------------------------------------------------------
# Check for required tools
# ---------------------------------------------------------------------------
if ! command -v op &>/dev/null; then
  echo "Error: 1Password CLI (op) is not installed."
  echo "Install it: https://developer.1password.com/docs/cli/get-started/"
  exit 1
fi

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
echo "========================================"
echo "  Syncing secrets to Convex"
echo "  Environment: $ENV"
echo "  Keys: ${#KEYS[@]}"
if [ -n "$VAULT" ]; then
  echo "  Vault: $VAULT"
fi
echo "========================================"
echo ""

# ---------------------------------------------------------------------------
# Build op read flags
# ---------------------------------------------------------------------------
OP_FLAGS=""
if [ -n "$VAULT" ]; then
  OP_FLAGS="--vault=$VAULT"
fi

# ---------------------------------------------------------------------------
# Sync each secret
# ---------------------------------------------------------------------------
SYNCED=0
SKIPPED=0
FAILED=0

for KEY in "${KEYS[@]}"; do
  # Try to read from 1Password first
  VALUE=""

  # Attempt to read from op. The item name matches the key name.
  VALUE=$(op read "op://${VAULT:-Private}/${KEY}/credential" 2>/dev/null || true)

  # Fall back to environment variable if op read failed
  if [ -z "$VALUE" ]; then
    VALUE="${!KEY:-}"
  fi

  if [ -n "$VALUE" ]; then
    if npx convex env set "$KEY" "$VALUE" 2>/dev/null; then
      echo "  [ok] $KEY"
      SYNCED=$((SYNCED + 1))
    else
      echo "  [FAIL] $KEY (convex env set failed)"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "  [skip] $KEY (not found in 1Password or environment)"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$((SYNCED + SKIPPED + FAILED))
echo "========================================"
echo "  Sync complete!"
echo "  Synced:  $SYNCED / $TOTAL"
echo "  Skipped: $SKIPPED / $TOTAL"
if [ "$FAILED" -gt 0 ]; then
  echo "  Failed:  $FAILED / $TOTAL"
fi
echo "========================================"

if [ "$SKIPPED" -gt 0 ]; then
  echo ""
  echo "Warning: $SKIPPED keys were skipped (not found in 1Password or environment)."
fi

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo "Error: $FAILED keys failed to sync to Convex."
  exit 1
fi
