#!/bin/sh
set -e

echo "Waiting for MySQL database to be ready..."

# 간단한 대기 로직 (외부 MySQL 사용시)
sleep 5

echo "Applying schema changes..."
npm run db:push

echo "Schema applied. Starting application..."
exec "$@"