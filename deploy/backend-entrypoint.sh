#!/bin/sh
set -e

echo "[entrypoint] applying prisma migrations…"
npx prisma migrate deploy

echo "[entrypoint] starting backend…"
exec node dist/index.js
