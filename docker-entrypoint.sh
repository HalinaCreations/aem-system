#!/bin/sh
set -e

# Applies pending migrations before the server accepts traffic. `migrate deploy`
# is the production-safe command — it never prompts, never resets, and is a
# no-op when the database is already up to date, so restarts are cheap.
#
# Set RUN_MIGRATIONS=false if you'd rather run them as a separate step (e.g. a
# Dokploy pre-deploy command, or when scaling past one replica).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] applying database migrations…"
  npx prisma migrate deploy
  echo "[entrypoint] migrations up to date"
fi

exec "$@"
