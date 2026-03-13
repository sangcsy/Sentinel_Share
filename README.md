# SentinelShare — Cloud Security Impact Simulator

클라우드 인프라 보안 효과를 실시간으로 측정하고 시각화하는 플랫폼.

파일 공유 서비스를 **동일한 애플리케이션 코드**로 취약/보안 두 AWS 환경에 배포하고,
공격 시뮬레이터 대시보드에서 직접 공격을 수행하여 결과를 나란히 비교한다.
인프라 보안(WAF, CloudFront, Private S3, Security Group)이 실제로 어떤 효과를 내는지
숫자와 시각으로 증명한다.

---

## 아키텍처

### 전체 구성도

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Attack Dashboard                            │
│                    (공격자 포지션 시뮬레이터)                           │
│            브루트포스 / S3 직접접근 / API 플러드                         │
└───────────────┬─────────────────────────┬───────────────────────────┘
                │                         │
                ▼                         ▼
┌──────────────────────┐     ┌──────────────────────────────────────┐
│   취약 환경 (Vulnerable) │     │         보안 환경 (Secure)             │
│                      │     │                                      │
│  [ECS Fargate]       │     │  [CloudFront + WAF]                  │
│  SG: 0.0.0.0/0:3000  │     │  Rate-based rule + Managed Rules     │
│       │              │     │          │                           │
│       ▼              │     │          ▼                           │
│  [PostgreSQL RDS]    │     │  [ECS Fargate]                       │
│  [S3 Public Bucket]  │     │  SG: CloudFront IP(pl-3b927c52)만    │
│  직접 접근 가능        │     │       │              │               │
│                      │     │       ▼              ▼               │
│                      │     │  [PostgreSQL RDS] [S3 Private]       │
│                      │     │                  presigned URL 전용   │
└──────────────────────┘     └──────────────────────────────────────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │   SIEM (4단계 계획)      │
                              │  Prometheus + Grafana   │
                              │  + Loki                 │
                              │  공격 패턴 / WAF 차단    │
                              │  실시간 대시보드          │
                              └────────────────────────┘
```

**핵심 설계 원칙:**
- 동일 코드, 다른 인프라 — 앱 레벨에 rate limit 없음. WAF가 인프라 레벨에서 담당
- ALB 없음 — CloudFront가 HTTPS/CDN 처리. ECS SG에서 CloudFront IP(`pl-3b927c52`)만 허용
- Presigned URL — S3 직접 노출 없음. 백엔드 권한 검사 후 5분 TTL URL 발급
- Secrets Manager — 코드와 환경 파일에 시크릿 없음. ECS 태스크 시작 시 주입

---

## 공격 시뮬레이션 비교

| 공격 시나리오 | 취약 환경 결과 | 보안 환경 결과 |
|---|---|---|
| 브루트포스 로그인 (30회) | 30/30 서버 도달 | WAF Rate Rule → 차단 |
| S3 버킷 직접 접근 (5경로) | 200 OK (파일 노출) | 403 AccessDenied |
| API 플러드 (60회) | 60/60 서버 도달 | WAF 임계값 초과 → 차단 |

---

## 프로젝트 구조

```
SentinelShare/
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml        백엔드 ECS 배포 (취약/보안 동시)
│       └── deploy-dashboard.yml      Attack Dashboard 배포 (1단계 계획)
│
├── sentinel-share-backend/           Node.js/Express API
│   ├── src/
│   │   ├── config/        db.js, s3.js, env.js
│   │   ├── middleware/    authenticate.js, rateLimiter.js (apiLimiter만 — authLimiter 제거)
│   │   ├── controllers/   auth.controller.js, files.controller.js
│   │   ├── services/      auth.service.js, files.service.js, s3.service.js
│   │   ├── models/        user.model.js, file.model.js, sharedLink.model.js
│   │   ├── routes/        auth.routes.js, files.routes.js, shared.routes.js
│   │   ├── utils/         fileValidation.js, tokenGenerator.js
│   │   └── app.js
│   ├── migrations/        001_initial_schema.sql
│   ├── scripts/           local-init.sh
│   ├── infra/
│   │   ├── iam/                            task-execution-role.json, task-role.json
│   │   ├── ecs-task-definition-vulnerable.json
│   │   ├── ecs-task-definition-secure.json
│   │   └── s3-bucket-policy.json
│   ├── docker-compose.yml
│   └── Dockerfile
│
├── sentinel-share-frontend/          Next.js 15 App Router
│   ├── app/
│   │   ├── (auth)/        login/, signup/
│   │   ├── dashboard/     파일 목록 + 업로드
│   │   └── shared/[token] 공개 공유 링크 페이지
│   ├── components/        FileList, FileUploadForm, ShareLinkModal, AuthGuard
│   └── lib/               api.ts, auth.ts
│
├── attack-dashboard/                 보안 비교 시뮬레이터 (AWS 배포 예정)
│   ├── app/
│   │   ├── api/attack/    bruteforce, s3-access, ratelimit (SSE 스트림)
│   │   ├── api/config/    환경 설정 정보
│   │   └── page.tsx       메인 비교 대시보드
│   ├── components/        AttackCard, RequestLog, MetricsPanel, EnvironmentStatus
│   └── .env.local.example
│
├── docs/                             인프라 설치 가이드북 (작성 예정)
│   ├── 01-prerequisites.md
│   ├── 02-vulnerable-environment.md
│   ├── 03-secure-environment.md
│   └── 04-attack-dashboard-setup.md
│
└── infra/                            IaC & 모니터링 (작성 예정)
    ├── terraform/                    취약/보안 환경 Terraform 모듈
    └── monitoring/                   Prometheus + Grafana + Loki
```

---

## API 레퍼런스

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/auth/signup` | — | 회원가입 (비밀번호: 8자+대문자+숫자) |
| POST | `/auth/login` | — | 로그인, JWT 반환 |
| POST | `/files/upload` | JWT | 파일 업로드 (multipart/form-data, field: `file`) |
| GET | `/files` | JWT | 내 파일 목록 |
| GET | `/files/:id/download` | JWT | presigned 다운로드 URL 발급 (소유자만) |
| DELETE | `/files/:id` | JWT | 파일 삭제 (soft delete + S3 삭제) |
| POST | `/files/:id/share` | JWT | 공유 링크 생성 (`{ expiresInHours: 1–168 }`) |
| GET | `/shared/:token/download` | — | 공유 토큰으로 presigned URL 발급 |
| GET | `/health` | — | 헬스체크 (ECS) |

---

## DB 스키마

```sql
users         id, email, password_hash, role, created_at, updated_at
files         id, owner_id, original_name, stored_key, mime_type, size_bytes, is_deleted, created_at, updated_at
shared_links  id, file_id, token, expires_at, created_by, created_at
```

---

## 로컬 개발

### 사전 준비

| 항목 | 비고 |
|---|---|
| Docker Desktop | 실행 중 상태여야 함 |
| Node.js 20+ | |
| AWS CLI | local-init.sh에서 버킷 생성에 사용 |
| psql 클라이언트 | `local-init.sh` DB 마이그레이션 실행용 — **로컬 전용**, AWS 배포 시 불필요 |

> **psql 설치 안내**
> `psql`은 `local-init.sh`에서 DB 마이그레이션을 실행할 때만 사용합니다.
> PostgreSQL 서버 설치가 아닌 **클라이언트만** 있으면 됩니다.
> AWS 배포 시에는 불필요합니다 — RDS 마이그레이션은 ECS 태스크 또는 RDS Query Editor에서 처리합니다.
>
> **macOS/Linux:**
> ```bash
> brew install postgresql   # macOS
> apt install postgresql-client   # Ubuntu/Debian
> ```
>
> **Windows:**
> `winget install PostgreSQL.PostgreSQL.16` 으로 설치하면 PostgreSQL 서버도 함께 설치되어
> 5432 포트를 점유합니다. **관리자 권한 PowerShell**에서 실행해 비활성화하세요:
> ```powershell
> Stop-Service -Name 'postgresql-x64-16' -Force
> Set-Service -Name 'postgresql-x64-16' -StartupType Disabled
> ```

### 실행 순서

```bash
# 1. 백엔드
cd sentinel-share-backend
docker compose up -d
bash scripts/local-init.sh    # 최초 1회
cp .env.local.example .env
npm install && npm run dev    # → http://localhost:3000

# 2. 프론트엔드 (새 터미널)
cd sentinel-share-frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
npm install && npm run dev -- -p 3001    # → http://localhost:3001

# 3. 공격 대시보드 (새 터미널)
cd attack-dashboard
cp .env.local.example .env.local    # AWS URL은 배포 후 채워넣기
npm install && npm run dev          # → http://localhost:3002
```

### DB 직접 접속

```bash
export PATH="$PATH:/c/Program Files/PostgreSQL/16/bin"
export PGPASSWORD="localpassword"
psql -h 127.0.0.1 -p 5432 -U sentinelshare_user -d sentinelshare
```

> `localhost` 대신 `127.0.0.1` 사용 — Windows에서 localhost가 IPv6(::1)로 해석될 수 있음.

---

## AWS 배포

### 사전 준비

```bash
aws configure
aws ecr create-repository --repository-name sentinelshare-backend --region ap-northeast-2
```

### 취약 환경 (Vulnerable)

```bash
# S3 버킷 — Block Public Access OFF (의도적 취약 설정)
aws s3api create-bucket \
  --bucket your-vulnerable-bucket \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

aws s3api put-public-access-block \
  --bucket your-vulnerable-bucket \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# ECS 클러스터 + 로그 그룹
aws ecs create-cluster --cluster-name sentinelshare-vulnerable
aws logs create-log-group --log-group-name /ecs/sentinelshare-backend-vulnerable

# Security Group: 0.0.0.0/0 포트 3000 (의도적 취약 설정)

# Secrets Manager
aws secretsmanager create-secret \
  --name sentinelshare/vulnerable/jwt-secret \
  --secret-string "$(openssl rand -base64 48)"

aws secretsmanager create-secret \
  --name sentinelshare/vulnerable/db-credentials \
  --secret-string '{"host":"VULN_RDS_ENDPOINT","dbname":"sentinelshare","username":"sentinelshare_user","password":"YOUR_PASSWORD"}'

aws secretsmanager create-secret \
  --name sentinelshare/vulnerable/s3-bucket-name \
  --secret-string "your-vulnerable-bucket"

aws secretsmanager create-secret \
  --name sentinelshare/vulnerable/cors-origin \
  --secret-string "http://your-vulnerable-frontend-domain"
```

### 보안 환경 (Secure)

```bash
# S3 버킷 — Block Public Access ON
aws s3api create-bucket \
  --bucket your-secure-bucket \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

aws s3api put-public-access-block \
  --bucket your-secure-bucket \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

aws s3api put-bucket-policy \
  --bucket your-secure-bucket \
  --policy file://sentinel-share-backend/infra/s3-bucket-policy.json

# ECS 클러스터 + 로그 그룹
aws ecs create-cluster --cluster-name sentinelshare-secure
aws logs create-log-group --log-group-name /ecs/sentinelshare-backend

# Security Group: CloudFront 관리형 프리픽스 리스트만 허용
aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXX \
  --ip-permissions '[{
    "IpProtocol": "tcp",
    "FromPort": 3000,
    "ToPort": 3000,
    "PrefixListIds": [{"PrefixListId": "pl-3b927c52"}]
  }]'

# Secrets Manager
aws secretsmanager create-secret \
  --name sentinelshare/jwt-secret \
  --secret-string "$(openssl rand -base64 48)"

aws secretsmanager create-secret \
  --name sentinelshare/db-credentials \
  --secret-string '{"host":"SECURE_RDS_ENDPOINT","dbname":"sentinelshare","username":"sentinelshare_user","password":"YOUR_PASSWORD"}'

aws secretsmanager create-secret \
  --name sentinelshare/s3-bucket-name \
  --secret-string "your-secure-bucket"

aws secretsmanager create-secret \
  --name sentinelshare/cors-origin \
  --secret-string "https://your-cloudfront-domain.cloudfront.net"
```

#### CloudFront + WAF

1. WAF Web ACL 생성:
   - AWS Managed Rules: `AWSManagedRulesCommonRuleSet`
   - Rate-based rule: IP당 5분/100회 제한
2. CloudFront 배포:
   - Origin: 보안 ECS 퍼블릭 IP (포트 3000)
   - WAF Web ACL 연결
   - HTTPS only, Redirect HTTP to HTTPS

---

## CI/CD (GitHub Actions)

`master` 브랜치에 `sentinel-share-backend/**` 변경 푸시 시 자동 실행:

```
build → Docker 이미지 빌드 + ECR 푸시 (:sha + :latest)
  ├── deploy-vulnerable → 취약 ECS 클러스터 배포
  └── deploy-secure     → 보안 ECS 클러스터 배포
```

#### GitHub Secrets 등록 (Settings → Secrets → Actions)

| Secret | 설명 |
|---|---|
| `AWS_ACCESS_KEY_ID` | 배포용 IAM 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | 배포용 IAM 시크릿 키 |
| `VULN_ECS_CLUSTER` | 취약 환경 ECS 클러스터 이름 |
| `VULN_ECS_SERVICE` | 취약 환경 ECS 서비스 이름 |
| `SECURE_ECS_CLUSTER` | 보안 환경 ECS 클러스터 이름 |
| `SECURE_ECS_SERVICE` | 보안 환경 ECS 서비스 이름 |

---

## 보안 설계

| 레이어 | 보안 환경 | 취약 환경 |
|---|---|---|
| 네트워크 | CloudFront IP만 허용 (ECS SG), HTTPS only | 0.0.0.0/0 개방 |
| WAF | Rate-based rule + AWS Managed Rules | 없음 |
| 인증 | JWT (HS256), bcrypt 12 rounds | 동일 |
| 파일 권한 | 소유권 검사 + presigned URL (5분 TTL) | 동일 |
| S3 접근 | Block Public Access ON, Task Role만 허용 | Block Public Access OFF |
| SQL | parameterized queries 강제 (`$1` params) | 동일 |
| 시크릿 | Secrets Manager → ECS 환경변수 주입 | 동일 |
| 헤더 | Helmet.js (X-Frame-Options 등) | 동일 |

---

## 구현 로드맵

| 단계 | 내용 | 상태 |
|---|---|---|
| **1단계** | Attack Dashboard AWS 배포 (Dockerfile + CI/CD) | 완료 |
| **2단계** | AWS 인프라 수동 설치 가이드북 (`docs/`) | 계획 |
| **3단계** | CI/CD 보안 스캔 (Trivy 이미지 스캔, Prowler 클라우드 스캔) | 계획 |
| **4단계** | SIEM — Prometheus + Grafana + Loki 스택 구축 | 계획 |
| **5단계** | Terraform 인프라 자동화 (취약/보안 환경 IaC) | 계획 |

---

## 향후 확장 아이디어

- 업로드 시 ClamAV 또는 AWS Macie 악성코드 스캔
- 파일 접근 이벤트 감사 로그 테이블
- 공유 링크 수동 취소 엔드포인트
- 관리자 패널 (role 컬럼이 이미 스키마에 포함됨)
- Terraform으로 다른 오픈소스 앱 대상 보안 비교 테스트 확장
