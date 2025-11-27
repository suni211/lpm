#!/bin/bash

# 🚀 LICO WebSocket 빠른 수정 스크립트
# 서버에서 실행하세요: bash QUICK_FIX.sh

echo "========================================="
echo "🔍 LICO WebSocket 연결 문제 진단 시작"
echo "========================================="
echo ""

# 1. LICO 서버 상태 확인
echo "📡 1. LICO 서버 상태 확인..."
pm2 status lico-server
echo ""

# 2. 포트 5002 확인
echo "🔌 2. 포트 5002 리스닝 확인..."
sudo netstat -tlnp | grep 5002 || sudo ss -tlnp | grep 5002
echo ""

# 3. Nginx 설정 확인
echo "⚙️  3. Nginx 설정 파일 확인..."
echo "현재 Nginx 설정:"
sudo nginx -T 2>/dev/null | grep -A 20 "location /socket.io"
echo ""

# 4. Nginx 문법 검사
echo "✅ 4. Nginx 문법 검사..."
sudo nginx -t
echo ""

# 5. 최신 코드 받기
echo "📥 5. 최신 코드 받기..."
cd /root/lpm || cd ~/lpm || cd /var/www/lpm || cd /home/*/lpm
git pull origin main
echo ""

# 6. 클라이언트 재빌드
echo "🔨 6. 클라이언트 재빌드..."
cd lico/client
npm install
npm run build
echo ""

# 7. 빌드 파일 배포
echo "📦 7. 빌드 파일 배포..."
if [ -d "/var/www/lico/client/dist" ]; then
    sudo cp -r dist/* /var/www/lico/client/dist/
    echo "✅ /var/www/lico/client/dist/ 에 배포 완료"
elif [ -d "/var/www/html" ]; then
    sudo cp -r dist/* /var/www/html/
    echo "✅ /var/www/html/ 에 배포 완료"
else
    echo "⚠️  배포 경로를 찾을 수 없습니다. 수동으로 배포하세요."
fi
echo ""

# 8. Nginx 재시작
echo "🔄 8. Nginx 재시작..."
sudo systemctl reload nginx
echo ""

# 9. LICO 서버 재시작
echo "🔄 9. LICO 서버 재시작..."
cd ..
cd server
pm2 restart lico-server
echo ""

# 10. 최종 확인
echo "========================================="
echo "✅ 최종 상태 확인"
echo "========================================="
echo ""

echo "📡 LICO 서버 상태:"
pm2 status lico-server
echo ""

echo "🔌 포트 5002 상태:"
sudo netstat -tlnp | grep 5002 || sudo ss -tlnp | grep 5002
echo ""

echo "⚙️  Nginx 상태:"
sudo systemctl status nginx --no-pager -l
echo ""

echo "========================================="
echo "🎉 수정 완료!"
echo "========================================="
echo ""
echo "브라우저에서 테스트:"
echo "1. https://lico.berrple.com 접속"
echo "2. F12 > Network > WS 탭"
echo "3. socket.io 연결 확인 (Status: 101)"
echo ""
echo "테스트 명령어:"
echo "curl -I https://lico.berrple.com/socket.io/"
echo ""
