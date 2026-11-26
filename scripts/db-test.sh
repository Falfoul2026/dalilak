#!/usr/bin/env bash
# Spins up a throwaway local Postgres, applies supabase/setup.sql on top of a
# Supabase stub, and runs supabase/tests/*.test.sql. Needs Postgres 15+ binaries.
set -euo pipefail
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
trap '"$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$TMP" 2>/dev/null && RUNAS=(runuser -u postgres --); fi
"${RUNAS[@]}" "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p 54329 -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$TMP" -p 54329 -U postgres -d postgres)
"${PSQL[@]}" -f supabase/tests/supabase-stub.sql
"${PSQL[@]}" -f supabase/setup.sql >/dev/null 2>"$TMP/setup.err" || { cat "$TMP/setup.err"; exit 1; }
# Import must be idempotent:
npx tsx scripts/import-data.ts --sql "$TMP/import.sql" >/dev/null
"${PSQL[@]}" -f "$TMP/import.sql" >/dev/null
for t in supabase/tests/*.test.sql; do
  echo "▶ $t"
  "${PSQL[@]}" -f "$t"
done
echo "✅ all database tests passed"
