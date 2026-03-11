#!/usr/bin/env bash
# deploy.sh
# Builds the Docker image, pushes to ECR, and updates the ECS service.
#
# Prerequisites:
#   - AWS CLI configured with deploy permissions
#   - Docker running
#   - Environment variables below set (or export before running)
#
# Usage:
#   export AWS_ACCOUNT_ID=123456789012
#   export AWS_REGION=ap-northeast-2
#   export ECR_REPO=sentinelshare-backend
#   export ECS_CLUSTER=sentinelshare-cluster
#   export ECS_SERVICE=sentinelshare-backend-service
#   ./infra/scripts/deploy.sh

set -euo pipefail

: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
: "${AWS_REGION:?Set AWS_REGION}"
: "${ECR_REPO:=sentinelshare-backend}"
: "${ECS_CLUSTER:=sentinelshare-cluster}"
: "${ECS_SERVICE:=sentinelshare-backend-service}"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG="${ECR_REGISTRY}/${ECR_REPO}:latest"
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "nogit")
IMAGE_TAG_SHA="${ECR_REGISTRY}/${ECR_REPO}:${GIT_SHA}"

echo "==> Authenticating Docker with ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "==> Building Docker image..."
docker build \
  --platform linux/amd64 \
  -t "${IMAGE_TAG}" \
  -t "${IMAGE_TAG_SHA}" \
  -f Dockerfile \
  .

echo "==> Pushing image to ECR..."
docker push "${IMAGE_TAG}"
docker push "${IMAGE_TAG_SHA}"

echo "==> Registering new ECS task definition..."
# Replace ACCOUNT_ID placeholder in task definition
TASK_DEF=$(sed "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" infra/ecs-task-definition.json)
NEW_TASK_DEF_ARN=$(echo "${TASK_DEF}" | aws ecs register-task-definition \
  --cli-input-json file:///dev/stdin \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "    Registered: ${NEW_TASK_DEF_ARN}"

echo "==> Updating ECS service..."
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --task-definition "${NEW_TASK_DEF_ARN}" \
  --force-new-deployment \
  --output table

echo "==> Waiting for service to stabilize (this may take a few minutes)..."
aws ecs wait services-stable \
  --cluster "${ECS_CLUSTER}" \
  --services "${ECS_SERVICE}"

echo ""
echo "==> Deploy complete. Image: ${IMAGE_TAG_SHA}"
