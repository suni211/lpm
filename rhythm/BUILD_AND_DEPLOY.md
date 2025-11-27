# 빌드 및 배포 명령어

## 로컬에서 빌드만 하기
```bash
cd rhythm/client
npm install
npm run build
```

## 서버에서 배포하기
서버에 SSH로 접속한 후:

```bash
cd ~/lpm/rhythm
bash deploy.sh
```

또는 수동으로:

```bash
# 1. 클라이언트 빌드
cd ~/lpm/rhythm/client
npm install
npm run build

# 2. 클라이언트 파일 배포
sudo mkdir -p /var/www/rhythm/client/dist
sudo rm -rf /var/www/rhythm/client/dist/*
sudo cp -r dist/* /var/www/rhythm/client/dist/
sudo chown -R www-data:www-data /var/www/rhythm

# 3. Nginx 재시작
sudo systemctl reload nginx

# 4. 브라우저 캐시 클리어
# 브라우저에서 Ctrl+Shift+R (하드 리프레시) 또는 개발자 도구에서 캐시 비활성화
```

## 브라우저 캐시 문제 해결
1. **하드 리프레시**: `Ctrl + Shift + R` (Windows/Linux) 또는 `Cmd + Shift + R` (Mac)
2. **개발자 도구**: F12 → Network 탭 → "Disable cache" 체크
3. **시크릿 모드**: 새 시크릿 창에서 테스트

