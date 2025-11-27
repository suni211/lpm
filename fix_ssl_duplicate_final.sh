#!/bin/bash
# SSL 중복 오류 최종 해결 스크립트

echo "SSL 중복 오류를 최종적으로 해결합니다..."

# 1. 모든 Nginx 설정 파일에서 ssl_session_timeout 검색
echo "모든 Nginx 설정 파일에서 ssl_session_timeout 검색 중..."
echo "---"
sudo grep -rn "ssl_session_timeout" /etc/nginx/ 2>/dev/null
echo "---"

# 2. Lico Nginx 설정 파일에서 ssl_session_timeout 제거
echo "Lico Nginx 설정 파일 확인 중..."
if [ -f /etc/nginx/sites-available/lico ]; then
    echo "Lico 설정 파일에서 ssl_session_timeout 제거 중..."
    sudo sed -i '/ssl_session_timeout/d' /etc/nginx/sites-available/lico
    sudo sed -i '/ssl_session_cache/d' /etc/nginx/sites-available/lico
    sudo sed -i '/ssl_session_tickets/d' /etc/nginx/sites-available/lico
fi

# 3. options-ssl-nginx.conf 파일을 다시 확인하고 완전히 교체
echo "options-ssl-nginx.conf 파일 완전 교체 중..."
sudo tee /etc/letsencrypt/options-ssl-nginx.conf > /dev/null <<'EOF'
# This file contains important security parameters. If you modify this file
# manually, Certbot will be unable to automatically provide future security
# updates. Instead, Certbot will print and log an error message with a path to
# this file from which you can read, or copy and paste this file's contents into
# a new file on your system. Once you've modified the file, you can use Certbot
# with the "--nginx-server-root" flag to tell Certbot where to find it.

ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;

ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
EOF

sudo chmod 644 /etc/letsencrypt/options-ssl-nginx.conf
sudo chown root:root /etc/letsencrypt/options-ssl-nginx.conf

# 4. 파일 내용 확인 (바이트 단위로)
echo "파일 내용 확인 (바이트 단위):"
sudo cat -A /etc/letsencrypt/options-ssl-nginx.conf | grep ssl_session_timeout

# 5. Nginx 설정 테스트
echo "Nginx 설정 테스트 중..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx 설정에 오류가 있습니다."
    exit 1
fi

# 6. Nginx 재시작
echo "Nginx 재시작 중..."
sudo systemctl restart nginx

if [ $? -ne 0 ]; then
    echo "❌ Nginx 재시작 실패."
    echo "로그 확인: sudo journalctl -xeu nginx.service"
    exit 1
fi

# 7. 인증서 재설치
echo "Lico SSL 인증서 재설치 중..."
sudo certbot install --cert-name lico.berrple.com --nginx

echo "✅ 완료!"


