#!/usr/bin/env bash
# Interactive first-time secret setup for Supa apps.
#
# Reads required variables from .env.example, pulls values from 1Password,
# and writes them to .env.local.
#
# Usage:
#   supa-setup-secrets
#   supa-setup-secrets --vault "My Vault"
#   supa-setup-secrets --env-example .env.example --output .env.local
#
# Environment:
#   OP_VAULT    - (optional) 1Password vault name. Overridden by --vault flag.
#   SUPA_CONFIG - (optional) Path to supa.config.json.

set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
VAULT="${OP_VAULT:-}"
ENV_EXAMPLE=".env.example"
OUTPUT=".env.local"
CONFIG="${SUPA_CONFIG:-./supa.config.json}"
SKIP_VALIDATION=false

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --vault)
      VAULT="$2"
      shift 2
      ;;
    --vault=*)
      VAULT="${1#--vault=}"
      shift
      ;;
    --env-example)
      ENV_EXAMPLE="$2"
      shift 2
      ;;
    --env-example=*)
      ENV_EXAMPLE="${1#--env-example=}"
      shift
      ;;
    --output|-o)
      OUTPUT="$2"
      shift 2
      ;;
    --output=*|-o=*)
      OUTPUT="${1#*=}"
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
    --skip-validation)
      SKIP_VALIDATION=true
      shift
      ;;
    --help|-h)
      echo "Usage: supa-setup-secrets [options]"
      echo ""
      echo "Interactive first-time secret setup. Reads .env.example, pulls values"
      echo "from 1Password, and writes to .env.local."
      echo ""
      echo "Options:"
      echo "  --vault NAME           1Password vault name (or set OP_VAULT)"
      echo "  --env-example PATH     Path to .env.example (default: .env.example)"
      echo "  --output, -o PATH      Output file (default: .env.local)"
      echo "  --config PATH          Path to supa.config.json"
      echo "  --skip-validation      Skip service reachability checks"
      echo "  -h, --help             Show this help message"
      exit 0
      ;;
    *)
      echo "Error: Unknown option '$1'"
      echo "Run with --help for usage."
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Check prerequisites
# ---------------------------------------------------------------------------
if ! command -v op &>/dev/null; then
  echo "Error: 1Password CLI (op) is not installed."
  echo "Install it: https://developer.1password.com/docs/cli/get-started/"
  exit 1
fi

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "Error: $ENV_EXAMPLE not found."
  echo "Run this script from your project root, or use --env-example to specify the path."
  exit 1
fi

# ---------------------------------------------------------------------------
# Resolve vault from supa.config.json if not set
# ---------------------------------------------------------------------------
if [ -z "$VAULT" ] && [ -f "$CONFIG" ]; then
  VAULT=$(node -e "
    const cfg = require('./$CONFIG');
    console.log(cfg.onePassword?.vault || cfg.opVault || '');
  " 2>/dev/null || true)
fi

if [ -z "$VAULT" ]; then
  echo "No 1Password vault configured."
  echo ""
  read -rp "Enter your 1Password vault name (or press Enter for 'Private'): " VAULT
  VAULT="${VAULT:-Private}"
fi

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
echo "========================================"
echo "  Supa Secret Setup"
echo "  Source: $ENV_EXAMPLE"
echo "  Output: $OUTPUT"
echo "  Vault:  $VAULT"
echo "========================================"
echo ""

# ---------------------------------------------------------------------------
# Check if output file already exists
# ---------------------------------------------------------------------------
if [ -f "$OUTPUT" ]; then
  echo "Warning: $OUTPUT already exists."
  read -rp "Overwrite? (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
  echo ""
fi

# ---------------------------------------------------------------------------
# Parse .env.example and collect keys
# ---------------------------------------------------------------------------
KEYS=()
COMMENTS=()

while IFS= read -r line; do
  # Skip empty lines and pure comment lines
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^#.*$ ]] && continue

  # Extract key from KEY=value or KEY= lines
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)= ]]; then
    KEYS+=("${BASH_REMATCH[1]}")
  fi
done < "$ENV_EXAMPLE"

if [ ${#KEYS[@]} -eq 0 ]; then
  echo "No variables found in $ENV_EXAMPLE."
  exit 0
fi

echo "Found ${#KEYS[@]} variables to configure."
echo ""

# ---------------------------------------------------------------------------
# Pull values from 1Password and prompt for missing ones
# ---------------------------------------------------------------------------
declare -A VALUES

FOUND=0
PROMPTED=0
SKIPPED_KEYS=0

for KEY in "${KEYS[@]}"; do
  # Try 1Password first
  VALUE=$(op read "op://${VAULT}/${KEY}/credential" 2>/dev/null || true)

  if [ -n "$VALUE" ]; then
    echo "  [1p] $KEY"
    VALUES[$KEY]="$VALUE"
    FOUND=$((FOUND + 1))
  else
    # Prompt the user
    read -rp "  [??] $KEY = " VALUE
    if [ -n "$VALUE" ]; then
      VALUES[$KEY]="$VALUE"
      PROMPTED=$((PROMPTED + 1))
    else
      echo "       (skipped)"
      SKIPPED_KEYS=$((SKIPPED_KEYS + 1))
    fi
  fi
done

echo ""

# ---------------------------------------------------------------------------
# Write output file
# ---------------------------------------------------------------------------
{
  echo "# Generated by supa-setup-secrets on $(date '+%Y-%m-%d %H:%M:%S')"
  echo "# Source: $ENV_EXAMPLE"
  echo ""

  for KEY in "${KEYS[@]}"; do
    if [ -n "${VALUES[$KEY]+x}" ]; then
      echo "${KEY}=${VALUES[$KEY]}"
    else
      echo "# ${KEY}="
    fi
  done
} > "$OUTPUT"

echo "Wrote $OUTPUT"
echo "  From 1Password: $FOUND"
echo "  Manual input:   $PROMPTED"
echo "  Skipped:        $SKIPPED_KEYS"

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
if [ "$SKIP_VALIDATION" = true ]; then
  echo ""
  echo "Skipping service validation (--skip-validation)."
  echo ""
  echo "Done!"
  exit 0
fi

echo ""
echo "Validating services..."

VALID=0
INVALID=0

# Check CONVEX_URL / CONVEX_DEPLOYMENT
if [ -n "${VALUES[CONVEX_URL]+x}" ]; then
  if curl -sf "${VALUES[CONVEX_URL]}" -o /dev/null 2>/dev/null; then
    echo "  [ok] Convex URL reachable"
    VALID=$((VALID + 1))
  else
    echo "  [!!] Convex URL unreachable: ${VALUES[CONVEX_URL]}"
    INVALID=$((INVALID + 1))
  fi
fi

# Check Twilio credentials
if [ -n "${VALUES[TWILIO_ACCOUNT_SID]+x}" ] && [ -n "${VALUES[TWILIO_AUTH_TOKEN]+x}" ]; then
  TWILIO_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -u "${VALUES[TWILIO_ACCOUNT_SID]}:${VALUES[TWILIO_AUTH_TOKEN]}" \
    "https://api.twilio.com/2010-04-01/Accounts/${VALUES[TWILIO_ACCOUNT_SID]}.json" 2>/dev/null || echo "000")
  if [ "$TWILIO_STATUS" = "200" ]; then
    echo "  [ok] Twilio credentials valid"
    VALID=$((VALID + 1))
  else
    echo "  [!!] Twilio credentials invalid (HTTP $TWILIO_STATUS)"
    INVALID=$((INVALID + 1))
  fi
fi

# Check Resend API key
if [ -n "${VALUES[RESEND_API_KEY]+x}" ]; then
  RESEND_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${VALUES[RESEND_API_KEY]}" \
    "https://api.resend.com/domains" 2>/dev/null || echo "000")
  if [ "$RESEND_STATUS" = "200" ]; then
    echo "  [ok] Resend API key valid"
    VALID=$((VALID + 1))
  else
    echo "  [!!] Resend API key invalid (HTTP $RESEND_STATUS)"
    INVALID=$((INVALID + 1))
  fi
fi

if [ $((VALID + INVALID)) -eq 0 ]; then
  echo "  (no services to validate)"
fi

echo ""
echo "Done!"
if [ "$INVALID" -gt 0 ]; then
  echo "Warning: $INVALID service(s) failed validation. Check your credentials."
fi
