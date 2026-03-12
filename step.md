# SentinelShare — 실행 가이드 & 전체 프로젝트 흐름

---

## 전체 프로젝트 구조 도식

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SentinelShare — Cloud Security Impact Simulator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [ 개발자 ]
      │ git push (master)
      ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  GitHub Actions                                                  │
  │                                                                  │
  │  deploy-backend.yml            deploy-dashboard.yml             │
  │  ┌──────────────────────┐      ┌─────────────────────────┐      │
  │  │ Docker 이미지 빌드    │      │ Docker 이미지 빌드       │      │
  │  │ [Trivy 스캔 - 추후]  │      │ [Trivy 스캔 - 추후]     │      │
  │  │ ECR Push             │      │ ECR Push                │      │
  │  │ ECS 취약 환경 배포    │      │ ECS 대시보드 배포       │      │
  │  │ ECS 보안 환경 배포    │      └─────────────────────────┘      │
  │  └──────────────────────┘                                       │
  │  [Prowler 보안 스캔 - 추후]                                      │
  └──────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
  ┌─────────────┐     ┌──────────────┐     ┌──────────────────────┐
  │ ECR         │     │ ECR          │     │  Attack Dashboard    │
  │ sentinelsh  │     │ sentinelsh   │     │  ECS Fargate         │
  │ are-backend │     │ are-dashboard│     │  ┌────────────────┐  │
  └─────────────┘     └──────────────┘     │  │ / Attack Sim   │  │
         │                                 │  │ /guide  가이드 │  │
         ▼                                 │  └────────────────┘  │
  ┌──────┴───────┐                         │  Port 3000, 공개     │
  │              │                         └──────────────────────┘
  ▼              ▼                               │          │
┌──────────────────────┐     ┌───────────────────┴──────────┴──────────┐
│  취약 환경            │     │  보안 환경                               │
│  (Vulnerable)         │     │  (Secure)                               │
│                       │     │                                         │
│  ┌─────────────────┐  │     │  ┌──────────────────────────────────┐  │
│  │ ECS Fargate     │  │     │  │ CloudFront + WAF                 │  │
│  │ Node.js/Express │  │     │  │ · Rate-based Rule (100/5min/IP)  │  │
│  │ SG: 0.0.0.0/0   │◄─┼─공격│  │ · AWS Managed Rules (OWASP)     │  │
│  └────────┬────────┘  │     │  └──────────────────┬───────────────┘  │
│           │           │     │                     │ 정상만 통과       │
│  ┌────────┴────────┐  │     │  ┌──────────────────▼───────────────┐  │
│  │ RDS PostgreSQL  │  │     │  │ ECS Fargate (동일 코드)           │  │
│  └─────────────────┘  │     │  │ SG: CloudFront IP만 (pl-3b927c52)│  │
│                       │     │  └──────────┬───────────────────────┘  │
│  ┌─────────────────┐  │     │             │                           │
│  │ S3 Bucket       │◄─┼─공격│  ┌──────────┴──────┐  ┌─────────────┐  │
│  │ Public 허용     │  │     │  │ RDS PostgreSQL  │  │ S3 Private  │  │
│  │ 직접 접근 가능  │  │     │  └─────────────────┘  │ presigned   │  │
│  └─────────────────┘  │     │                       │ URL only    │  │
│                       │     │                       └─────────────┘  │
│  결과: 공격 통과       │     │  결과: 공격 차단                        │
└───────────────────────┘     └─────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  추후 개발 (기본 기능 검증 완료 후)                               │
  │                                                                  │
  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
  │  │   Trivy     │  │   Prowler   │  │      Wazuh SIEM          │ │
  │  │ CI/CD 이미지│  │ AWS 보안    │  │ CloudWatch → Wazuh Agent │ │
  │  │ 취약점 스캔 │  │ 포스처 스캔 │  │ 공격 탐지 + 알람 시각화  │ │
  │  └─────────────┘  └─────────────┘  └──────────────────────────┘ │
  │                                                                  │
  │  ┌──────────────────────────────────────────────────────────┐   │
  │  │  Terraform — 현재 콘솔 수동 세팅 전체를 IaC 코드로 자동화 │   │
  │  └──────────────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────────┘
```

---

## ⚠ GitHub Actions 현재 상태

지금 바로 push해도 **워크플로우가 실패**한다. 아래 조건을 충족해야 정상 작동한다.

| 조건 | 필요 시점 |
|---|---|
| GitHub Secrets에 AWS 키 등록 | Phase 2 전 |
| ECR 레포지토리 2개 생성 | Phase 2 |
| ECS 클러스터/서비스 생성 | Phase 3~5 완료 후 |

**Phase 2~5 세팅이 완료된 시점부터 CI/CD가 정상 작동한다.**

---

## PHASE 0 — 로컬 도구 준비

터미널에서 아래 명령을 실행해 설치 여부를 확인한다.
버전이 출력되면 준비 완료, 설치되지 않은 항목은 공식 사이트에서 설치한다.

```bash
docker --version    # 필수 — Docker Desktop이 실행 중이어야 함
node --version      # v20 이상 필요
aws --version       # AWS CLI v2
git --version
```

> **Windows 전용 주의사항**
> `winget install PostgreSQL.PostgreSQL.16` 으로 설치했다면 로컬 PostgreSQL 서비스가
> 5432 포트를 점유해 Docker와 충돌한다. **관리자 권한 PowerShell**에서 아래를 실행한다.
> ```powershell
> Stop-Service -Name 'postgresql-x64-16' -Force
> Set-Service -Name 'postgresql-x64-16' -StartupType Disabled
> ```

AWS CLI 인증 설정 (최초 1회):
```bash
aws configure
# AWS Access Key ID     : IAM 사용자 액세스 키
# AWS Secret Access Key : IAM 사용자 시크릿 키
# Default region        : ap-northeast-2
# Default output format : json
```

---

## PHASE 1 — 로컬 개발 환경 실행 및 기능 확인

AWS 세팅 전에 로컬에서 전체 기능이 정상 동작하는지 먼저 확인한다.

### 1-1. 백엔드 시작

```bash
cd sentinel-share-backend
docker compose up -d          # PostgreSQL + LocalStack 컨테이너 시작
bash scripts/local-init.sh    # 최초 1회: S3 버킷 + DB 마이그레이션
cp .env.local .env
npm install && npm run dev    # → http://localhost:3000
```

### 1-2. 프론트엔드 시작 (새 터미널)

```bash
cd sentinel-share-frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
npm install && npm run dev -- -p 3001    # → http://localhost:3001
```

### 1-3. 공격 대시보드 시작 (새 터미널)

```bash
cd attack-dashboard
cp .env.local.example .env.local    # AWS URL은 Phase 5 이후 채움
npm install && npm run dev          # → http://localhost:3002
```

### 1-4. 기능 확인 체크리스트

```
http://localhost:3001 (파일 공유 서비스)
  □ 회원가입 — 비밀번호 규칙: 8자 이상 + 대문자 1개 + 숫자 1개 (예: Test1234)
  □ 로그인
  □ 파일 업로드 (jpg/png/pdf 등)
  □ 파일 다운로드
  □ 공유 링크 생성 + 만료 시간 설정
  □ 공유 링크로 파일 접근 (비로그인 상태)
  □ 파일 삭제

http://localhost:3002 (공격 대시보드)
  □ Attack Simulator 탭 — 3가지 공격 실행 (로컬 환경 대상)
  □ Infrastructure Guide 탭 — 가이드 페이지 표시
  □ /guide/vulnerable, /guide/secure 페이지 확인
```

---

## PHASE 2 — ECR 레포지토리 생성 + GitHub 설정

### 2-1. ECR 레포지토리 생성 (AWS 콘솔)

**경로:** AWS 콘솔 → 검색창에 "ECR" → Elastic Container Registry → 레포지토리 → 프라이빗 레포지토리 생성

**백엔드용 레포지토리:**

| 항목 | 값 |
|---|---|
| 표시 여부 | 프라이빗 |
| 레포지토리 이름 | `sentinelshare-backend` |
| 나머지 | 기본값 유지 |

**대시보드용 레포지토리:**
동일한 방법으로 한 번 더 생성

| 항목 | 값 |
|---|---|
| 레포지토리 이름 | `sentinelshare-dashboard` |

생성 완료 후 각 레포지토리의 **URI를 메모**한다.
형식: `[계정ID].dkr.ecr.ap-northeast-2.amazonaws.com/sentinelshare-backend`

---

### 2-2. Docker 이미지 빌드 + ECR 푸시 (터미널)

ECR 레포지토리 생성 후 이미지를 빌드하고 처음으로 푸시한다.
이후로는 GitHub Actions가 자동으로 처리한다.

```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS \
  --password-stdin [계정ID].dkr.ecr.ap-northeast-2.amazonaws.com

# 백엔드 이미지 빌드 + 푸시
docker build -t sentinelshare-backend ./sentinel-share-backend
docker tag sentinelshare-backend:latest \
  [계정ID].dkr.ecr.ap-northeast-2.amazonaws.com/sentinelshare-backend:latest
docker push [계정ID].dkr.ecr.ap-northeast-2.amazonaws.com/sentinelshare-backend:latest

# 대시보드 이미지 빌드 + 푸시
docker build -t sentinelshare-dashboard ./attack-dashboard
docker tag sentinelshare-dashboard:latest \
  [계정ID].dkr.ecr.ap-northeast-2.amazonaws.com/sentinelshare-dashboard:latest
docker push [계정ID].dkr.ecr.ap-northeast-2.amazonaws.com/sentinelshare-dashboard:latest
```

---

### 2-3. GitHub Actions Secrets 등록

**경로:** GitHub 레포지토리 → Settings → Secrets and variables → Actions → New repository secret

지금 등록 가능한 항목 (나머지는 Phase 3~5 완료 후 추가):

| Secret 이름 | 값 |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM 사용자 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | IAM 사용자 시크릿 키 |

> Phase 3~5 완료 후 아래 6개도 추가 등록:
> `VULN_ECS_CLUSTER`, `VULN_ECS_SERVICE`,
> `SECURE_ECS_CLUSTER`, `SECURE_ECS_SERVICE`,
> `DASHBOARD_ECS_CLUSTER`, `DASHBOARD_ECS_SERVICE`

---

## PHASE 3 — 취약 환경 AWS 콘솔 세팅

> RDS 생성에 5~10분이 소요된다. 가장 먼저 시작하고 나머지 작업을 진행한다.

### 3-1. IAM 역할 생성

**경로:** AWS 콘솔 → IAM → 역할 → 역할 만들기

**Task Execution Role** (ECS가 ECR에서 이미지를 내려받고 Secrets Manager를 읽는 역할)

| 단계 | 항목 | 값 |
|---|---|---|
| 신뢰할 수 있는 엔터티 | 엔터티 유형 | AWS 서비스 |
| | 서비스 | Elastic Container Service |
| | 사용 사례 | Elastic Container Service Task |
| 권한 추가 | 정책 검색 | `AmazonECSTaskExecutionRolePolicy` 체크 |
| 이름 지정 | 역할 이름 | `sentinelshare-task-execution-role-vulnerable` |

역할 생성 완료 후 → 해당 역할 클릭 → 인라인 정책 추가:
- 정책 이름: `secrets-access`
- JSON 편집기에 아래 붙여넣기 (계정 ID 교체):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["secretsmanager:GetSecretValue"],
    "Resource": "arn:aws:secretsmanager:ap-northeast-2:[계정ID]:secret:sentinelshare/vulnerable/*"
  }]
}
```

**Task Role** (컨테이너 앱이 S3에 파일을 올리고 내려받는 역할)

동일한 방법으로 역할 생성:

| 항목 | 값 |
|---|---|
| 신뢰할 수 있는 엔터티 | ECS Task (위와 동일) |
| 권한 정책 | 없음 (인라인 정책으로 추가) |
| 역할 이름 | `sentinelshare-task-role-vulnerable` |

역할 생성 후 인라인 정책 추가:
- 정책 이름: `s3-access`

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::YOUR_VULNERABLE_BUCKET/uploads/*"
  }]
}
```

---

### 3-2. RDS PostgreSQL 생성

**경로:** AWS 콘솔 → RDS → 데이터베이스 → 데이터베이스 생성

| 섹션 | 항목 | 값 |
|---|---|---|
| 생성 방식 | | 표준 생성 |
| 엔진 옵션 | 엔진 유형 | PostgreSQL |
| | 엔진 버전 | PostgreSQL 16.x (최신) |
| 템플릿 | | 프리 티어 |
| 설정 | DB 인스턴스 식별자 | `sentinelshare-vulnerable` |
| | 마스터 사용자 이름 | `sentinelshare_user` |
| | 마스터 암호 | 강력한 비밀번호 설정 (메모 필수) |
| 인스턴스 구성 | 인스턴스 클래스 | db.t3.micro |
| 스토리지 | 할당된 스토리지 | 20 GiB |
| 연결 | VPC | 기본 VPC |
| | 퍼블릭 액세스 | **아니요** |
| | VPC 보안 그룹 | 새로 생성 — 이름: `sentinelshare-vulnerable-db-sg` |
| 추가 구성 | 초기 데이터베이스 이름 | `sentinelshare` |

생성 클릭 후 **상태가 "사용 가능"이 될 때까지 다음 단계 진행** (5~10분 소요).
완료 후 "연결 및 보안" 탭에서 **엔드포인트 주소를 메모**한다.

---

### 3-3. S3 버킷 생성 (퍼블릭 허용 — 의도적 취약 설정)

**경로:** AWS 콘솔 → S3 → 버킷 만들기

| 항목 | 값 |
|---|---|
| 버킷 이름 | `sentinelshare-vulnerable-[계정ID]` (전역 고유 필요) |
| AWS 리전 | 아시아 태평양(서울) ap-northeast-2 |
| 퍼블릭 액세스 차단 설정 | **모든 체크박스 해제** (퍼블릭 접근 허용) |
| 확인 체크박스 | "현재 설정으로 인해..." 경고 문구 체크 |
| 나머지 | 기본값 유지 |

> ⚠ 이것은 공격 시뮬레이션을 위한 **의도적인 취약 설정**이다.

---

### 3-4. Secrets Manager 시크릿 등록

**경로:** AWS 콘솔 → Secrets Manager → 새 보안 암호 저장

아래 4개를 각각 생성한다. 생성 방식은 모두 동일하다.

**생성 방법:**
1. 보안 암호 유형: **다른 유형의 보안 암호**
2. 키/값 페어 방식 대신 **일반 텍스트**로 값 직접 입력
3. 암호화 키: 기본값 유지
4. 보안 암호 이름 입력 후 나머지 기본값으로 저장

| 보안 암호 이름 | 값 (일반 텍스트) |
|---|---|
| `sentinelshare/vulnerable/jwt-secret` | 랜덤 문자열 32자 이상 (아무 문자열) |
| `sentinelshare/vulnerable/db-credentials` | `{"host":"[RDS엔드포인트]","dbname":"sentinelshare","username":"sentinelshare_user","password":"[RDS비밀번호]"}` |
| `sentinelshare/vulnerable/s3-bucket-name` | `sentinelshare-vulnerable-[계정ID]` |
| `sentinelshare/vulnerable/cors-origin` | `http://[프론트엔드URL]` (임시로 `http://localhost:3001` 입력 가능) |

---

### 3-5. Security Group 생성 (전체 개방 — 의도적 취약 설정)

**경로:** AWS 콘솔 → EC2 → 보안 그룹 → 보안 그룹 생성

| 항목 | 값 |
|---|---|
| 보안 그룹 이름 | `sentinelshare-vulnerable-sg` |
| 설명 | SentinelShare Vulnerable - No restrictions |
| VPC | 기본 VPC |
| 인바운드 규칙 | 유형: 사용자 지정 TCP / 포트: 3000 / 소스: `0.0.0.0/0` |
| 아웃바운드 규칙 | 기본값 유지 (모든 트래픽 허용) |

---

### 3-6. ECS 클러스터 생성

**경로:** AWS 콘솔 → ECS → 클러스터 → 클러스터 생성

| 항목 | 값 |
|---|---|
| 클러스터 이름 | `sentinelshare-vulnerable` |
| 인프라 | AWS Fargate (서버리스) |
| 나머지 | 기본값 유지 |

---

### 3-7. ECS 태스크 정의 등록

**경로:** AWS 콘솔 → ECS → 태스크 정의 → 새 태스크 정의 생성 → **JSON으로 구성**

프로젝트의 `sentinel-share-backend/infra/ecs-task-definition-vulnerable.json` 파일을 열어
모든 `ACCOUNT_ID` 텍스트를 실제 AWS 계정 ID(12자리 숫자)로 교체한 후
콘솔의 JSON 편집기에 전체 내용을 붙여넣고 생성한다.

> 계정 ID 확인: AWS 콘솔 우측 상단 계정명 클릭 → 숫자 12자리

---

### 3-8. ECS 서비스 생성

**경로:** ECS → 클러스터 `sentinelshare-vulnerable` → 서비스 탭 → 서비스 생성

| 섹션 | 항목 | 값 |
|---|---|---|
| 환경 | 컴퓨팅 옵션 | 시작 유형 |
| | 시작 유형 | FARGATE |
| 배포 구성 | 패밀리 | `sentinelshare-backend-vulnerable` |
| | 서비스 이름 | `sentinelshare-backend-vulnerable` |
| | 원하는 태스크 수 | `1` |
| 네트워킹 | VPC | 기본 VPC |
| | 서브넷 | 아무 서브넷 1개 이상 선택 |
| | 보안 그룹 | 기존 것 선택 → `sentinelshare-vulnerable-sg` |
| | 퍼블릭 IP | **켜짐** |

서비스 생성 후 → 태스크 탭 → 실행 중인 태스크 클릭 → **퍼블릭 IP 메모**
이 IP가 취약 환경 API 엔드포인트가 된다: `http://[IP]:3000`

---

### 3-9. DB 마이그레이션 실행 (터미널)

ECS 태스크가 실행 중인 것을 확인한 후 진행한다.
RDS Security Group에서 현재 작업 중인 PC의 IP를 임시로 허용해야 한다.

**RDS SG에 내 IP 임시 허용:**
EC2 → 보안 그룹 → `sentinelshare-vulnerable-db-sg` → 인바운드 규칙 편집
→ 유형: PostgreSQL / 포트: 5432 / 소스: 내 IP

```bash
export PGPASSWORD="[RDS 비밀번호]"
psql -h [RDS 엔드포인트] -p 5432 -U sentinelshare_user -d sentinelshare \
  -f sentinel-share-backend/migrations/001_initial_schema.sql
```

마이그레이션 완료 후 추가했던 인바운드 규칙 삭제.

---

### 3-10. 취약 환경 동작 확인

브라우저 또는 터미널에서:
```
http://[취약 ECS IP]:3000/health
→ {"status":"ok"} 응답 확인
```

---

## PHASE 4 — 보안 환경 AWS 콘솔 세팅

> Phase 3과 동일한 서비스를 생성하되, 보안 설정이 다르다.
> 달라지는 부분만 표시하고 나머지는 Phase 3을 참조한다.

### 4-1. IAM 역할 생성

Phase 3과 동일한 방법으로 생성. 역할 이름만 다름:

| 역할 | 이름 |
|---|---|
| Task Execution Role | `sentinelshare-task-execution-role` |
| Task Role | `sentinelshare-task-role` |

Secrets Manager 인라인 정책의 Resource ARN도 다름:
```
arn:aws:secretsmanager:ap-northeast-2:[계정ID]:secret:sentinelshare/*
```
(프리픽스가 `sentinelshare/`이고 `sentinelshare/vulnerable/`이 아님)

---

### 4-2. S3 버킷 생성 (퍼블릭 차단 ON)

Phase 3과 동일한 방법으로 생성. 퍼블릭 설정만 다름:

| 항목 | 취약 환경 | 보안 환경 |
|---|---|---|
| 버킷 이름 | `sentinelshare-vulnerable-[계정ID]` | `sentinelshare-secure-[계정ID]` |
| 퍼블릭 액세스 차단 | 모두 해제 | **모두 체크 (차단)** |

버킷 생성 후 → 버킷 정책 탭 → 정책 편집:
`sentinel-share-backend/infra/s3-bucket-policy.json` 내용을 붙여넣고
`ACCOUNT_ID`와 버킷명을 실제 값으로 교체 후 저장.

---

### 4-3. RDS + Secrets Manager

Phase 3과 동일하게 생성. 이름/값만 다름:

| 항목 | 취약 환경 | 보안 환경 |
|---|---|---|
| DB 인스턴스 식별자 | `sentinelshare-vulnerable` | `sentinelshare-secure` |
| Secrets 프리픽스 | `sentinelshare/vulnerable/` | `sentinelshare/` |
| CORS origin | 취약 환경 URL | CloudFront 도메인 (4-6 완료 후 업데이트) |

---

### 4-4. WAF Web ACL 생성

> ⚠ WAF는 반드시 **버지니아 북부(us-east-1) 리전**에서 생성해야 CloudFront에 연결 가능하다.
> 콘솔 우측 상단 리전을 **버지니아 북부**로 변경 후 진행.

**경로:** AWS 콘솔 → WAF & Shield → Web ACL → Create web ACL

| 섹션 | 항목 | 값 |
|---|---|---|
| 설명 | 이름 | `sentinelshare-waf` |
| | 리소스 유형 | Amazon CloudFront 배포 |
| | 리전 | 글로벌 (CloudFront) |
| 규칙 추가 | | Add rules → Add managed rule groups |
| | AWS 관리형 규칙 | `AWSManagedRulesCommonRuleSet` 추가 |
| 규칙 추가 2 | | Add rules → Add my own rules → Rate-based rule |
| Rate-based rule | 이름 | `RateLimit` |
| | 속도 제한 | `100` |
| | 집계 키 | 소스 IP |
| | 작업 | Block |
| 기본 작업 | | Allow |

생성 완료 후 Web ACL의 **ARN을 메모**한다. (CloudFront 연결 시 필요)

---

### 4-5. ECS 클러스터 + Security Group + 태스크 정의 + 서비스 생성

Phase 3과 동일한 방법으로 생성. 이름과 SG 설정만 다름:

**Security Group (임시 설정 — CloudFront 연결 전):**

| 항목 | 값 |
|---|---|
| 이름 | `sentinelshare-secure-sg` |
| 인바운드 규칙 | 포트 3000 / 소스: `0.0.0.0/0` (임시, CloudFront 연결 후 변경) |

**ECS 클러스터:** `sentinelshare-secure`
**태스크 정의:** `ecs-task-definition-secure.json` 사용 (ACCOUNT_ID 교체)
**서비스 이름:** `sentinelshare-backend`

서비스 생성 후 ECS Task **퍼블릭 IP 메모** (CloudFront 오리진으로 사용).

---

### 4-6. CloudFront 배포 생성 + WAF 연결

> 콘솔 리전을 **글로벌(N/A)** 또는 **버지니아 북부**로 변경

**경로:** AWS 콘솔 → CloudFront → 배포 생성

| 섹션 | 항목 | 값 |
|---|---|---|
| 오리진 | 오리진 도메인 | ECS Task 퍼블릭 IP 직접 입력 |
| | 프로토콜 | HTTP만 해당 |
| | HTTP 포트 | `3000` |
| 기본 캐시 동작 | 뷰어 프로토콜 정책 | Redirect HTTP to HTTPS |
| | 허용된 HTTP 메서드 | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE |
| | 캐시 정책 | CachingDisabled (API 서버이므로 캐시 불필요) |
| | 오리진 요청 정책 | AllViewer |
| WAF | Web Application Firewall | 보안 보호 활성화 → 기존 WAF Web ACL 사용 → `sentinelshare-waf` 선택 |
| 설정 | 설명 | `SentinelShare Secure` |

배포 생성 후 상태가 **배포됨**이 될 때까지 대기 (10~15분).
완료 후 **배포 도메인 이름 메모** (예: `xxxxxxxxx.cloudfront.net`)

---

### 4-7. ECS Security Group CloudFront IP로 변경

CloudFront 배포 완료 후 ECS가 CloudFront 트래픽만 받도록 SG를 변경한다.

**경로:** EC2 → 보안 그룹 → `sentinelshare-secure-sg` → 인바운드 규칙 편집

1. 기존 `0.0.0.0/0` 규칙 삭제
2. 새 규칙 추가:

| 항목 | 값 |
|---|---|
| 유형 | 사용자 지정 TCP |
| 포트 범위 | `3000` |
| 소스 | **접두사 목록** → 검색: `pl-3b927c52` 선택 |

> `pl-3b927c52`는 AWS가 관리하는 CloudFront IP 전체 목록이다.
> 이 설정 이후 ECS에 직접 접근하면 타임아웃이 발생한다.

---

### 4-8. DB 마이그레이션 + 동작 확인

Phase 3-9와 동일한 방법으로 보안 환경 RDS에 마이그레이션 실행.

동작 확인:
```
https://[CloudFront 도메인]/health  → {"status":"ok"} 확인
http://[ECS IP]:3000/health          → 타임아웃 (SG 차단 정상)
https://[보안 S3 버킷].s3.amazonaws.com/ → 403 AccessDenied (정상)
```

---

## PHASE 5 — Attack Dashboard AWS 콘솔 세팅

### 5-1. IAM 역할 생성

Phase 3과 동일한 방법으로 생성:

| 역할 | 이름 |
|---|---|
| Task Execution Role | `sentinelshare-dashboard-execution-role` |
| Task Role | `sentinelshare-dashboard-task-role` |

Secrets Manager 인라인 정책의 Resource:
```
arn:aws:secretsmanager:ap-northeast-2:[계정ID]:secret:sentinelshare/dashboard/*
```

---

### 5-2. Secrets Manager — 대시보드 환경 URL 등록

| 보안 암호 이름 | 값 |
|---|---|
| `sentinelshare/dashboard/vulnerable-api-url` | `http://[취약 ECS IP]:3000` |
| `sentinelshare/dashboard/vulnerable-s3-bucket` | `sentinelshare-vulnerable-[계정ID]` |
| `sentinelshare/dashboard/aws-api-url` | `https://[CloudFront 도메인]` |
| `sentinelshare/dashboard/aws-s3-bucket` | `sentinelshare-secure-[계정ID]` |

---

### 5-3. Security Group 생성

**경로:** EC2 → 보안 그룹 → 보안 그룹 생성

| 항목 | 값 |
|---|---|
| 이름 | `sentinelshare-dashboard-sg` |
| 인바운드 규칙 | 포트 3000 / 소스: `0.0.0.0/0` (대시보드는 외부 공개 필요) |

---

### 5-4. ECS 클러스터 + 태스크 정의 + 서비스 생성

**경로:** ECS → 클러스터 → 클러스터 생성

| 항목 | 값 |
|---|---|
| 클러스터 이름 | `sentinelshare-dashboard` |
| 인프라 | AWS Fargate |

**태스크 정의:** `attack-dashboard/infra/ecs-task-definition-dashboard.json` 사용
ACCOUNT_ID와 ECR 이미지 URI를 실제 값으로 교체 후 JSON 편집기에 붙여넣기.

**서비스:**

| 항목 | 값 |
|---|---|
| 클러스터 | `sentinelshare-dashboard` |
| 태스크 정의 | `sentinelshare-dashboard` |
| 서비스 이름 | `sentinelshare-dashboard` |
| 보안 그룹 | `sentinelshare-dashboard-sg` |
| 퍼블릭 IP | 켜짐 |

서비스 생성 후 Task 퍼블릭 IP 확인 → `http://[IP]:3000` 접속 확인.

---

### 5-5. GitHub Actions Secrets 나머지 등록

GitHub → Settings → Secrets → 아래 6개 추가:

| Secret | 값 |
|---|---|
| `VULN_ECS_CLUSTER` | `sentinelshare-vulnerable` |
| `VULN_ECS_SERVICE` | `sentinelshare-backend-vulnerable` |
| `SECURE_ECS_CLUSTER` | `sentinelshare-secure` |
| `SECURE_ECS_SERVICE` | `sentinelshare-backend` |
| `DASHBOARD_ECS_CLUSTER` | `sentinelshare-dashboard` |
| `DASHBOARD_ECS_SERVICE` | `sentinelshare-dashboard` |

---

## PHASE 6 — 공격 시뮬레이션 검증

대시보드 `http://[대시보드 IP]:3000` 접속 후 각 공격 실행.

| 공격 시나리오 | 취약 환경 예상 결과 | 보안 환경 예상 결과 |
|---|---|---|
| 브루트포스 로그인 (30회) | 30/30 서버 도달, 401 반복 | 초반 통과 후 WAF가 429/403으로 차단 |
| S3 직접 접근 (5경로) | 200 OK (내용 노출) | 403 AccessDenied |
| API 플러드 (60회) | 60/60 서버 도달 | WAF 임계값 초과 후 차단 |

---

## PHASE 7 — CI/CD 자동 배포 확인

모든 환경이 정상 동작 확인 후 GitHub Actions 자동 배포를 테스트한다.

백엔드 파일을 사소하게 수정하고 push:
```bash
git add .
git commit -m "feat: AWS 배포 환경 세팅 완료"
git push origin master
```

GitHub 레포지토리 → Actions 탭에서 워크플로우 실행 확인:
- `deploy-backend.yml` → build → deploy-vulnerable → deploy-secure 순서 실행
- `deploy-dashboard.yml` → attack-dashboard/** 변경이 있었다면 함께 실행

---

## PHASE 8+ — 추후 개발 (기본 기능 검증 완료 후)

### [추후] Trivy — Docker 이미지 취약점 스캔
GitHub Actions의 빌드 단계 직후에 Trivy가 이미지를 스캔하도록 추가.
CRITICAL/HIGH CVE 발견 시 파이프라인이 자동 중단되어 취약한 이미지가 배포되지 않는다.

### [추후] Prowler — AWS 보안 포스처 비교
ECS 배포 후 Prowler가 두 환경을 자동 스캔한다.
취약 환경은 다수의 체크가 실패(의도적), 보안 환경은 대부분 통과.
두 결과를 비교하면 인프라 보안 조치의 효과가 수치로 확인된다.

### [추후] Terraform — 현재 수동 콘솔 세팅 전체를 코드로 자동화
Phase 3~5에서 콘솔로 클릭한 모든 작업을 `terraform apply` 한 줄로 대체.
다른 오픈소스 앱에도 동일한 Terraform 모듈을 재사용 가능.

### [추후] Wazuh — SIEM 보안 이벤트 탐지 및 시각화
Wazuh가 ECS 앱 로그와 WAF 로그를 CloudWatch를 통해 수집한다.
공격 시뮬레이터 실행 시 Wazuh 대시보드에서 실시간 탐지 알람이 발생한다.
WAF가 차단한 것과 Wazuh가 탐지한 것을 동시에 시각화할 수 있다.

---

## 전체 진행 체크리스트

```
PHASE 0 — 로컬 도구 준비
  □ Docker Desktop 실행 중
  □ Node.js v20+ 확인
  □ AWS CLI configure 완료
  □ Windows: 로컬 PostgreSQL 서비스 비활성화

PHASE 1 — 로컬 환경 확인
  □ 백엔드/프론트엔드/대시보드 정상 실행
  □ 회원가입/업로드/공유 기능 정상
  □ 로컬 공격 시뮬레이션 실행 확인

PHASE 2 — ECR + GitHub 설정
  □ ECR 레포지토리 2개 생성 (sentinelshare-backend, sentinelshare-dashboard)
  □ Docker 이미지 빌드 + ECR 최초 푸시
  □ GitHub Secrets: AWS 키 2개 등록

PHASE 3 — 취약 환경
  □ IAM 역할 2개 생성 (execution, task)
  □ RDS PostgreSQL 생성 + 엔드포인트 메모
  □ S3 버킷 생성 (Public Access 전체 해제)
  □ Secrets Manager 4개 등록
  □ Security Group 생성 (0.0.0.0/0:3000)
  □ ECS 클러스터 생성
  □ ECS 태스크 정의 등록 (JSON 붙여넣기)
  □ ECS 서비스 생성 + Task IP 메모
  □ DB 마이그레이션 실행
  □ /health 응답 확인

PHASE 4 — 보안 환경
  □ IAM 역할 2개 생성
  □ S3 버킷 생성 (Public Access 전체 차단) + 버킷 정책 적용
  □ RDS PostgreSQL 생성
  □ Secrets Manager 4개 등록
  □ WAF Web ACL 생성 (us-east-1, Rate-based + AWSCommonRules)
  □ Security Group 생성 (임시 0.0.0.0/0)
  □ ECS 클러스터 + 태스크 정의 + 서비스 생성
  □ CloudFront 배포 생성 + WAF 연결 + 도메인 메모
  □ Security Group CloudFront IP로 변경 (pl-3b927c52)
  □ DB 마이그레이션 실행
  □ CloudFront 도메인 /health 확인
  □ ECS 직접 접근 차단 확인

PHASE 5 — Attack Dashboard
  □ IAM 역할 2개 생성
  □ Secrets Manager 4개 등록 (환경 URL)
  □ Security Group 생성
  □ ECS 클러스터 + 태스크 정의 + 서비스 생성
  □ 대시보드 접속 + 환경 상태 표시 확인
  □ GitHub Secrets: ECS 클러스터/서비스 이름 6개 등록

PHASE 6 — 공격 시뮬레이션
  □ 브루트포스: 취약(통과) vs 보안(차단) 확인
  □ S3 접근: 취약(200) vs 보안(403) 확인
  □ API 플러드: 취약(통과) vs 보안(차단) 확인

PHASE 7 — CI/CD 자동 배포
  □ 코드 push → GitHub Actions 자동 실행 확인
  □ 취약/보안/대시보드 3개 환경 자동 배포 확인

── 추후 개발 ─────────────────────────────────────
  □ [추후] Trivy CI/CD 이미지 스캔
  □ [추후] Prowler AWS 보안 포스처 스캔
  □ [추후] Terraform 인프라 자동화
  □ [추후] Wazuh SIEM 연동
```
