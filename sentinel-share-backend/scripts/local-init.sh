#!/usr/bin/env bash
# local-init.sh
# Run once after `docker compose up -d` to initialize local dev environment.
# Creates the S3 bucket in LocalStack and runs DB migrations.

set -euo pipefail

LOCALSTACK_URL="http://localhost:4566"
BUCKET_NAME="sentinelshare-local"
REGION="ap-northeast-2"
DB_HOST="127.0.0.1"   # localhost는 Windows에서 IPv6(::1)로 해석되어 접속 실패할 수 있음
DB_PORT="5432"
DB_NAME="sentinelshare"
DB_USER="sentinelshare_user"
DB_PASSWORD="localpassword"

# Windows에서 psql이 PATH에 없을 경우 자동으로 추가
if ! command -v psql &>/dev/null; then
  PG_BIN="/c/Program Files/PostgreSQL/16/bin"
  if [ -f "${PG_BIN}/psql" ] || [ -f "${PG_BIN}/psql.exe" ]; then
    export PATH="$PATH:${PG_BIN}"
    echo "    psql PATH 추가: ${PG_BIN}"
  else
    echo "[ERROR] psql을 찾을 수 없습니다."
    echo "        PostgreSQL 클라이언트를 설치하거나 PATH에 추가해주세요."
    exit 1
  fi
fi

# PGPASSWORD를 export로 설정 (인라인 할당은 Windows Git Bash에서 동작하지 않음)
export PGPASSWORD="${DB_PASSWORD}"

echo "==> Waiting for LocalStack to be ready..."
# LocalStack 버전에 따라 s3 상태가 "available" 또는 "running"으로 표시됨
until curl -sf "${LOCALSTACK_URL}/_localstack/health" | grep -qE '"s3": "(available|running)"'; do
  sleep 2
done
echo "    LocalStack is ready."

echo "==> Creating S3 bucket: ${BUCKET_NAME}"
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
aws --endpoint-url="${LOCALSTACK_URL}" \
    s3api create-bucket \
    --bucket "${BUCKET_NAME}" \
    --region "${REGION}" \
    --create-bucket-configuration LocationConstraint="${REGION}" \
    2>/dev/null && echo "    Bucket created." || echo "    Bucket already exists, skipping."

echo "==> Waiting for PostgreSQL to be ready..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; do
  sleep 2
done
echo "    PostgreSQL is ready."

echo "==> Running migrations..."
psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -f "$(dirname "$0")/../migrations/001_initial_schema.sql"
echo "    Migrations complete."

echo ""
echo "==> Local environment ready."
echo "    백엔드 시작:    cp .env.local .env && npm run dev"
echo "    프론트엔드 시작: cd ../sentinel-share-frontend && echo 'NEXT_PUBLIC_API_URL=http://localhost:3000' > .env.local && npm run dev -- -p 3001"
