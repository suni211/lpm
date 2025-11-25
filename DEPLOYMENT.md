# LPM - GCP 배포 가이드

## 📋 사전 준비

### 1. GCP 프로젝트 설정
```bash
# GCP CLI 설치 확인
gcloud version

# GCP 로그인
gcloud auth login

# 프로젝트 생성 (또는 기존 프로젝트 선택)
gcloud projects create lpm-project --name="LPM"

# 프로젝트 설정
gcloud config set project lpm-project

# App Engine 활성화
gcloud app create --region=asia-northeast3
```

### 2. 필요한 API 활성화
```bash
# Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Cloud SQL Admin API
gcloud services enable sqladmin.googleapis.com

# App Engine Admin API
gcloud services enable appengine.googleapis.com
```

### 3. PostgreSQL Cloud SQL 인스턴스 생성
```bash
# PostgreSQL 인스턴스 생성
gcloud sql instances create lpm-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast3

# 데이터베이스 생성
gcloud sql databases create lpm --instance=lpm-db

# 사용자 생성
gcloud sql users create root \
  --instance=lpm-db \
  --password=LPM

# 연결 정보 확인
gcloud sql instances describe lpm-db
```

### 4. 환경 변수 설정

**server/.env.production** 파일 생성:
```env
NODE_ENV=production
PORT=8080

# Database (Cloud SQL)
DB_HOST=/cloudsql/lpm-project:asia-northeast3:lpm-db
DB_PORT=5432
DB_NAME=lpm
DB_USER=root
DB_PASSWORD=LPM

# Session
SESSION_SECRET=your-production-session-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://lpm-project.an.r.appspot.com/api/auth/google/callback

# Client URL
CLIENT_URL=https://lpm-project.an.r.appspot.com
```

## 🚀 배포 방법

### 1. 로컬 빌드 테스트
```bash
# 서버 빌드
cd server
npm install
npm run build

# 클라이언트 빌드
cd ../client
npm install
npm run build
```

### 2. Cloud Build를 사용한 배포
```bash
# 프로젝트 루트에서 실행
gcloud builds submit --config=cloudbuild.yaml
```

### 3. 직접 배포 (Cloud Build 없이)
```bash
# 프로젝트 루트에서 실행
gcloud app deploy
```

### 4. 배포 상태 확인
```bash
# 배포 상태 확인
gcloud app browse

# 로그 확인
gcloud app logs tail -s default
```

## 🗄️ 데이터베이스 초기화

### Cloud SQL Proxy를 사용한 로컬 연결
```bash
# Cloud SQL Proxy 다운로드
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Proxy 실행
./cloud-sql-proxy lpm-project:asia-northeast3:lpm-db

# 다른 터미널에서 psql 연결
psql "host=127.0.0.1 port=5432 sslmode=disable user=root dbname=lpm"

# SQL 파일 실행
psql -h 127.0.0.1 -U root -d lpm < server/src/database/schema.sql
psql -h 127.0.0.1 -U root -d lpm < server/src/database/initial_players.sql
psql -h 127.0.0.1 -U root -d lpm < server/src/database/update_power_formula.sql
```

## 📊 모니터링 및 관리

### 로그 확인
```bash
# 실시간 로그
gcloud app logs tail -s default

# 최근 로그 (100줄)
gcloud app logs read --limit=100
```

### 인스턴스 관리
```bash
# 현재 버전 확인
gcloud app versions list

# 트래픽 분할
gcloud app services set-traffic default --splits=v1=1.0

# 이전 버전 삭제
gcloud app versions delete v1
```

### 스케일링 설정
```bash
# 최소/최대 인스턴스 설정 (app.yaml에서 설정됨)
# automatic_scaling:
#   min_instances: 0
#   max_instances: 10
```

## 💰 비용 최적화

### 1. Cloud SQL
- **db-f1-micro**: 월 $7.67 (개발/테스트용)
- **db-g1-small**: 월 $24.75 (프로덕션 권장)

### 2. App Engine
- **F1 인스턴스**: 시간당 $0.05
- **F2 인스턴스**: 시간당 $0.10
- **무료 할당량**: 28시간/일 F1 인스턴스

### 3. 비용 절감 팁
```bash
# 사용하지 않을 때 인스턴스 중지
gcloud app versions stop v1

# 자동 스케일링 최소 인스턴스 0으로 설정 (app.yaml)
# min_instances: 0
```

## 🔐 보안 설정

### 1. Cloud SQL 보안
```bash
# SSL 연결 강제
gcloud sql instances patch lpm-db --require-ssl

# IP 화이트리스트 설정
gcloud sql instances patch lpm-db \
  --authorized-networks=your-ip-address
```

### 2. 환경 변수 암호화
```bash
# Secret Manager 사용
gcloud secrets create db-password --data-file=- <<< "LPM"

# app.yaml에서 사용
# env_variables:
#   DB_PASSWORD: ${DB_PASSWORD}
```

### 3. IAM 권한 설정
```bash
# 서비스 계정에 Cloud SQL Client 역할 부여
gcloud projects add-iam-policy-binding lpm-project \
  --member=serviceAccount:lpm-project@appspot.gserviceaccount.com \
  --role=roles/cloudsql.client
```

## 🔄 업데이트 및 롤백

### 새 버전 배포
```bash
# 새 버전 배포 (트래픽 분할 없이)
gcloud app deploy --no-promote

# 트래픽 100% 이동
gcloud app services set-traffic default --splits=v2=1.0
```

### 롤백
```bash
# 이전 버전으로 롤백
gcloud app services set-traffic default --splits=v1=1.0
```

## 📝 체크리스트

배포 전 확인사항:
- [ ] GCP 프로젝트 생성
- [ ] Cloud SQL 인스턴스 생성
- [ ] 데이터베이스 초기화 완료
- [ ] 환경 변수 설정 (.env.production)
- [ ] Google OAuth 콜백 URL 업데이트
- [ ] 로컬 빌드 테스트 완료
- [ ] app.yaml 설정 확인
- [ ] cloudbuild.yaml 설정 확인

배포 후 확인사항:
- [ ] 애플리케이션 접속 확인
- [ ] Google 로그인 테스트
- [ ] 데이터베이스 연결 확인
- [ ] API 엔드포인트 테스트
- [ ] 로그 모니터링 설정
- [ ] 알림 설정 (선택사항)

## 🆘 트러블슈팅

### 1. Cloud SQL 연결 실패
```bash
# Cloud SQL Proxy 상태 확인
gcloud sql operations list --instance=lpm-db

# 연결 테스트
gcloud sql connect lpm-db --user=root
```

### 2. 빌드 실패
```bash
# Cloud Build 로그 확인
gcloud builds list
gcloud builds log [BUILD_ID]
```

### 3. 메모리 부족
```yaml
# app.yaml에서 인스턴스 클래스 업그레이드
instance_class: F4  # F1 → F2 → F4
```

## 📚 참고 문서

- [Google Cloud App Engine 문서](https://cloud.google.com/appengine/docs)
- [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [Cloud Build 문서](https://cloud.google.com/build/docs)
