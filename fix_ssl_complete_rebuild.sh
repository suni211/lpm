#!/bin/bash
# SSL options-ssl-nginx.conf 완전 재생성 스크립트

echo "SSL options-ssl-nginx.conf 파일을 완전히 재생성합니다..."

# 1. 기존 파일 삭제
echo "기존 파일 삭제 중..."
sudo rm -f /etc/letsencrypt/options-ssl-nginx.conf
sudo rm -f /etc/letsencrypt/options-ssl-nginx.conf.backup*

# 2. Certbot이 자동으로 생성하도록 하기 위해 임시 파일 생성
# Certbot의 기본 내용으로 파일 생성
sudo mkdir -p /etc/letsencrypt
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

# 3. 파일 내용 확인 (줄 번호 포함)
echo "생성된 파일 내용 (줄 번호 포함):"
sudo cat -n /etc/letsencrypt/options-ssl-nginx.conf
echo "---"

# 4. ssl_session_timeout이 정확히 몇 번 나타나는지 확인
ssl_count=$(sudo grep -c "ssl_session_timeout" /etc/letsencrypt/options-ssl-nginx.conf)
echo "ssl_session_timeout 발견 횟수: $ssl_count"

if [ "$ssl_count" -gt 1 ]; then
    echo "❌ 여전히 중복이 있습니다. 수동 확인이 필요합니다."
    exit 1
fi

# 5. 모든 Nginx 설정 파일에서 ssl_session_timeout 재검색
echo "모든 Nginx 설정 파일에서 ssl_session_timeout 재검색:"
sudo grep -rn "ssl_session_timeout" /etc/nginx/ 2>/dev/null || echo "Nginx 설정 파일에는 없습니다."

# 6. Nginx 설정 테스트
echo "Nginx 설정 테스트 중..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx 설정에 오류가 있습니다."
    exit 1
fi

# 7. Nginx 재시작
echo "Nginx 재시작 중..."
sudo systemctl restart nginx

if [ $? -ne 0 ]; then
    echo "❌ Nginx 재시작 실패."
    echo "상세 로그 확인:"
    sudo nginx -t 2>&1 | grep -A 5 "ssl_session_timeout"
    exit 1
fi

# 8. 인증서 재설치
echo "Lico SSL 인증서 재설치 중..."
sudo certbot install --cert-name lico.berrple.com --nginx

echo "✅ 완료!"




