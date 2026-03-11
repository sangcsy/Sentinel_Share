# SentinelShare

인증된 사용자가 파일을 업로드하고, 만료되는 보안 링크로 공유할 수 있는 클라우드 파일 공유 플랫폼.

---

## 아키텍처

```
[Browser]
    │
    ▼
[CloudFront + WAF]        HTTPS 종료, 엣지 캐싱, OWASP 룰셋
    │
    ▼
[ECS Fargate]             Node.js/Express API (CloudFront IP 제한으로 직접 접근 차단)
    │           │
    ▼           ▼
[RDS PostgreSQL]    [S3]  프라이빗 버킷 — presigned URL로만 다운로드
(Private Subnet)
```

**주요 설계 결정:**
- ALB 없음 — CloudFront가 HTTPS/CDN 처리, ECS Security Group에서 CloudFront IP만 허용
- ECS Fargate (EKS 아님) — 운영 부담 최소화, MVP에 비용 효율적
- PostgreSQL — users/files/shared_links 관계형 모델에 적합
- Presigned URL — S3 직접 노출 없음, 백엔드가 권한 검사 후 URL 발급
- Secrets Manager — 코드와 환경 파일에 시크릿 없음

---

## 프로젝트 구조

```
SentinelShare/
├── sentinel-share-backend/
│   ├── src/
│   │   ├── config/        db.js, s3.js, env.js
│   │   ├── middleware/    authenticate.js, rateLimiter.js, validateRequest.js
│   │   ├── controllers/   auth.controller.js, files.controller.js
│   │   ├── services/      auth.service.js, files.service.js, s3.service.js
│   │   ├── models/        user.model.js, file.model.js, sharedLink.model.js
│   │   ├── routes/        auth.routes.js, files.routes.js, shared.routes.js
│   │   ├── utils/         fileValidation.js, tokenGenerator.js
│   │   └── app.js
│   ├── migrations/        001_initial_schema.sql
│   ├── scripts/           local-init.sh
│   ├── infra/
│   │   ├── iam/           task-execution-role.json, task-role.json
│   │   ├── scripts/       deploy.sh
│   │   ├── ecs-task-definition.json
│   │   └── s3-bucket-policy.json
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── .env.local         (로컬 개발용 — 커밋 금지)
│
└── sentinel-share-frontend/
    ├── app/
    │   ├── (auth)/        login/, signup/
    │   ├── dashboard/     파일 목록 + 업로드
    │   └── shared/[token] 공개 공유 링크 페이지
    ├── components/        FileList, FileUploadForm, ShareLinkModal, AuthGuard
    ├── lib/               api.ts, auth.ts
    └── types/             index.ts
```

---

## API 레퍼런스

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/auth/signup` | — | 회원가입 |
| POST | `/auth/login` | — | 로그인, JWT 반환 |
| POST | `/files/upload` | JWT | 파일 업로드 (multipart/form-data, field: `file`) |
| GET | `/files` | JWT | 내 파일 목록 |
| GET | `/files/:id/download` | JWT | presigned 다운로드 URL 발급 (소유자만) |
| DELETE | `/files/:id` | JWT | 파일 삭제 (soft delete + S3 삭제) |
| POST | `/files/:id/share` | JWT | 공유 링크 생성 (`{ expiresInHours: 1–168 }`) |
| GET | `/shared/:token/download` | — | 공유 토큰으로 presigned URL 발급 |
| GET | `/health` | — | 헬스체크 |

---

## DB 스키마

```sql
users         id, email, password_hash, role, created_at, updated_at
files         id, owner_id, original_name, stored_key, mime_type, size_bytes, is_deleted, created_at, updated_at
shared_links  id, file_id, token, expires_at, created_by, created_at
```

---

## 로컬 개발 (LocalStack)

### 사전 준비

| 항목 | 비고 |
|---|---|
| Docker Desktop | 실행 중 상태여야 함 |
| Node.js 20+ | |
| AWS CLI | local-init.sh에서 버킷 생성에 사용 |
| psql 클라이언트 | PostgreSQL 설치 시 포함 |

> **Windows 주의사항**
> `winget install PostgreSQL.PostgreSQL.16` 으로 설치하면 PostgreSQL 서버도 함께 설치되어
> 5432 포트를 점유합니다. 아래 명령어를 **관리자 권한 PowerShell**에서 실행해 비활성화하세요:
> ```powershell
> Stop-Service -Name 'postgresql-x64-16' -Force
> Set-Service -Name 'postgresql-x64-16' -StartupType Disabled
> ```

### 실행 순서

```bash
# 1. 백엔드 디렉토리로 이동
cd sentinel-share-backend

# 2. PostgreSQL + LocalStack 컨테이너 시작
docker compose up -d

# 3. S3 버킷 생성 + DB 마이그레이션 (최초 1회만 실행)
bash scripts/local-init.sh

# 4. 백엔드 시작
cp .env.local .env
npm install
npm run dev
```

```bash
# 5. 프론트엔드 시작 (새 터미널)
cd sentinel-share-frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
npm install
npm run dev -- -p 3001
```

- 백엔드: http://localhost:3000
- 프론트엔드: http://localhost:3001

### 회원가입 비밀번호 규칙

백엔드에서 아래 조건을 모두 검사합니다:
- 8자 이상
- 대문자 1개 이상
- 숫자 1개 이상

예시: `Test1234`

### DB 직접 접속

**터미널 (psql):**
```bash
# Windows Git Bash 기준
export PATH="$PATH:/c/Program Files/PostgreSQL/16/bin"
export PGPASSWORD="localpassword"
psql -h 127.0.0.1 -p 5432 -U sentinelshare_user -d sentinelshare
```

> `localhost` 대신 `127.0.0.1` 사용 — Windows에서 localhost가 IPv6(::1)로 해석되어
> 접속 실패할 수 있음.

**유용한 psql 명령어:**
```sql
\dt                                         -- 테이블 목록
SELECT id, email, role FROM users;          -- 가입된 유저 확인
SELECT id, original_name, is_deleted, stored_key FROM files;  -- 파일 목록
SELECT id, token, expires_at FROM shared_links;               -- 공유 링크 목록
\q                                          -- 종료
```

**GUI 툴 (DBeaver, TablePlus 등):**

| 항목 | 값 |
|---|---|
| Type | PostgreSQL |
| Host | 127.0.0.1 |
| Port | 5432 |
| Database | sentinelshare |
| User | sentinelshare_user |
| Password | localpassword |

### LocalStack S3 직접 확인

```bash
# 버킷 내 파일 목록
aws --endpoint-url=http://localhost:4566 \
  s3 ls s3://sentinelshare-local/uploads/ --recursive

# 특정 파일 다운로드
aws --endpoint-url=http://localhost:4566 \
  s3 cp s3://sentinelshare-local/<stored_key> ./downloaded_file
```

### 컨테이너 상태 확인

```bash
docker compose ps          # 컨테이너 상태
docker compose logs -f     # 전체 로그
docker compose down        # 컨테이너 중지 (데이터 유지)
docker compose down -v     # 컨테이너 + 데이터 볼륨 삭제
```

> **데이터 영속성:** `docker compose down` 해도 `ss-postgres-data` named volume에 데이터가 유지됩니다.
> 완전히 초기화하려면 `docker compose down -v` 후 `local-init.sh`를 다시 실행하세요.

---

## AWS 배포

### 1. 사전 준비

```bash
# AWS CLI 설정
aws configure

# ECR 리포지토리 생성
aws ecr create-repository --repository-name sentinelshare-backend --region ap-northeast-2
```

### 2. Secrets Manager 설정

```bash
# JWT 시크릿
aws secretsmanager create-secret \
  --name sentinelshare/jwt-secret \
  --secret-string "$(openssl rand -base64 48)"

# DB 접속 정보 (RDS 생성 후 엔드포인트 입력)
aws secretsmanager create-secret \
  --name sentinelshare/db-credentials \
  --secret-string '{"host":"YOUR_RDS_ENDPOINT","dbname":"sentinelshare","username":"sentinelshare_user","password":"YOUR_PASSWORD"}'

# S3 버킷명
aws secretsmanager create-secret \
  --name sentinelshare/s3-bucket-name \
  --secret-string "your-sentinelshare-bucket"

# CORS origin (CloudFront 도메인)
aws secretsmanager create-secret \
  --name sentinelshare/cors-origin \
  --secret-string "https://your-cloudfront-domain.cloudfront.net"
```

### 3. S3 버킷

```bash
aws s3api create-bucket \
  --bucket your-sentinelshare-bucket \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

# 퍼블릭 접근 완전 차단
aws s3api put-public-access-block \
  --bucket your-sentinelshare-bucket \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 버킷 정책 적용 (ACCOUNT_ID와 버킷명 교체 후)
aws s3api put-bucket-policy \
  --bucket your-sentinelshare-bucket \
  --policy file://infra/s3-bucket-policy.json
```

### 4. IAM 역할

```bash
# Task Execution Role (ECR 이미지 pull + Secrets Manager 읽기)
aws iam create-role \
  --role-name sentinelshare-task-execution-role \
  --assume-role-policy-document file://infra/iam/task-execution-role.json

aws iam attach-role-policy \
  --role-name sentinelshare-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Task Role (런타임 S3 접근)
aws iam create-role \
  --role-name sentinelshare-task-role \
  --assume-role-policy-document file://infra/iam/task-role.json
```

### 5. ECS 설정

```bash
# 클러스터 생성
aws ecs create-cluster --cluster-name sentinelshare-cluster

# CloudWatch 로그 그룹 생성
aws logs create-log-group --log-group-name /ecs/sentinelshare-backend

# 배포 (환경변수 설정 후 실행)
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=ap-northeast-2
bash infra/scripts/deploy.sh
```

### 6. CloudFront + WAF

1. WAF Web ACL 생성:
   - AWS Managed Rules (AWSManagedRulesCommonRuleSet) 적용
   - Rate-based rule: IP당 5분/100회 제한
2. CloudFront 배포 생성:
   - Origin: ECS 태스크 퍼블릭 IP 또는 DNS
   - WAF Web ACL 연결
   - HTTPS only (HTTP → HTTPS 리다이렉트)

### 7. ECS Security Group 설정

```bash
# CloudFront 관리형 프리픽스 리스트만 포트 3000 허용
aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXX \
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 3000,
    "ToPort": 3000,
    "PrefixListIds": [{"PrefixListId": "pl-3b927c52"}]
  }]'
```

---

## 보안 설계

| 레이어 | 적용 내용 |
|---|---|
| 네트워크 | CloudFront IP 제한 (ECS SG), HTTPS only, WAF OWASP 룰셋 |
| 인증 | JWT (HS256), bcrypt 12 rounds, 로그인 15분/10회 rate limit |
| 권한 | 모든 파일 작업 전 소유권 검사, 공유 토큰 + 만료 시간 동시 검증 |
| 스토리지 | S3 완전 비공개, presigned URL (5분 TTL), `uploads/<uuid>/` 불투명 경로 |
| 애플리케이션 | MIME 타입 + 확장자 + 크기 검증, parameterized SQL (`$1` params) |
| 시크릿 | AWS Secrets Manager → ECS 태스크 시작 시 환경변수로 주입 |
| 헤더 | Helmet.js (X-Frame-Options, X-Content-Type-Options 등) |

---

## 향후 확장 계획

- 업로드 시 ClamAV 또는 AWS Macie를 통한 악성코드 스캔
- 파일 접근 이벤트 감사 로그 테이블
- 공유 링크 수동 취소 엔드포인트
- 공유 링크별 다운로드 횟수 추적
- 관리자 패널 (role 컬럼이 이미 스키마에 포함됨)
- CloudWatch 알람 (에러율, 레이턴시)
