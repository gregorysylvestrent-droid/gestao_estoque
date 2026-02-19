#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/api-backend"
REPORT_DIR="$BACKEND_DIR/reports"
SCHEMA_FILE="${SCHEMA_FILE:-$ROOT_DIR/schema.sql}"
STAMP="$(date +"%Y%m%d-%H%M%S")"
DUMP_FILE="${DUMP_FILE:-$REPORT_DIR/rds-data-transfer-$STAMP.sql}"

# Load local overrides when present (.env.local is gitignored)
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.local"
  set +a
fi

LOCAL_DB_HOST="${LOCAL_DB_HOST:-127.0.0.1}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-5432}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-logiwms_db}"
LOCAL_DB_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-postgrespassword}"

RDS_HOST="${RDS_HOST:-}"
RDS_PORT="${RDS_PORT:-5432}"
RDS_DB="${RDS_DB:-}"
RDS_USER="${RDS_USER:-}"
RDS_PASSWORD="${RDS_PASSWORD:-}"

if [[ -z "$RDS_HOST" || -z "$RDS_DB" || -z "$RDS_USER" || -z "$RDS_PASSWORD" ]]; then
  cat <<EOF
Missing RDS source variables.
Required:
  RDS_HOST
  RDS_DB
  RDS_USER
  RDS_PASSWORD

Tip:
  cp .env.local.example .env.local
  # fill RDS_* values in .env.local
EOF
  exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Schema file not found: $SCHEMA_FILE" >&2
  exit 1
fi

mkdir -p "$REPORT_DIR"

echo "[1/7] Starting local PostgreSQL container..."
docker compose up -d db

echo "[2/7] Waiting for local PostgreSQL health..."
node "$BACKEND_DIR/scripts/wait-for-health.mjs" \
  --mode pg \
  --host "$LOCAL_DB_HOST" \
  --port "$LOCAL_DB_PORT" \
  --database "$LOCAL_DB_NAME" \
  --user "$LOCAL_DB_USER" \
  --password "$LOCAL_DB_PASSWORD" \
  --timeout 120000 \
  --interval 500

echo "[3/7] Applying local schema ($SCHEMA_FILE)..."
cat "$SCHEMA_FILE" | docker compose exec -T db psql \
  -v ON_ERROR_STOP=1 \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME"

echo "[4/7] Truncating local tables before import..."
docker compose exec -T db psql \
  -v ON_ERROR_STOP=1 \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME" <<'SQL'
DO $$
DECLARE table_list TEXT;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO table_list
    FROM pg_tables
   WHERE schemaname = 'public';

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;
SQL

echo "[5/7] Exporting RDS data to $DUMP_FILE..."
if command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD="$RDS_PASSWORD" pg_dump \
    --host="$RDS_HOST" \
    --port="$RDS_PORT" \
    --username="$RDS_USER" \
    --dbname="$RDS_DB" \
    --data-only \
    --no-owner \
    --no-privileges \
    --format=plain \
    --encoding=UTF8 \
    --file="$DUMP_FILE"
else
  docker run --rm \
    -e PGPASSWORD="$RDS_PASSWORD" \
    postgres:15 \
    pg_dump \
      --host="$RDS_HOST" \
      --port="$RDS_PORT" \
      --username="$RDS_USER" \
      --dbname="$RDS_DB" \
      --data-only \
      --no-owner \
      --no-privileges \
      --format=plain \
      --encoding=UTF8 > "$DUMP_FILE"
fi

echo "[6/7] Importing dump into local Docker PostgreSQL..."
cat "$DUMP_FILE" | docker compose exec -T db psql \
  -v ON_ERROR_STOP=1 \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME"

echo "[7/7] Running quick validation counts..."
docker compose exec -T db psql \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME" \
  -c "SELECT 'inventory=' || COUNT(*) AS inventory_count FROM inventory;"
docker compose exec -T db psql \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME" \
  -c "SELECT 'vendors=' || COUNT(*) AS vendors_count FROM vendors;"
docker compose exec -T db psql \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME" \
  -c "SELECT 'material_requests=' || COUNT(*) AS material_requests_count FROM material_requests;"

echo "Done. Local DB is ready at $LOCAL_DB_HOST:$LOCAL_DB_PORT/$LOCAL_DB_NAME"
echo "Dump file: $DUMP_FILE"
