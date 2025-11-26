#!/bin/bash
# SSL options-ssl-nginx.conf 중복 오류 수동 해결 스크립트

echo "SSL options-ssl-nginx.conf 중복 오류를 수정합니다..."

# 1. 파일 백업
echo "파일 백업 중..."
sudo cp /etc/letsencrypt/options-ssl-nginx.conf /etc/letsencrypt/options-ssl-nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# 2. 파일 내용 확인
echo "현재 파일 내용:"
sudo cat /etc/letsencrypt/options-ssl-nginx.conf
echo ""
echo "---"

# 3. 중복된 ssl_session_timeout 제거
echo "중복된 ssl_session_timeout 제거 중..."

# 임시 파일 생성
sudo cat > /tmp/options-ssl-nginx.conf.fixed <<'EOF'
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

# 4. 파일 교체
sudo mv /tmp/options-ssl-nginx.conf.fixed /etc/letsencrypt/options-ssl-nginx.conf
sudo chmod 644 /etc/letsencrypt/options-ssl-nginx.conf
sudo chown root:root /etc/letsencrypt/options-ssl-nginx.conf

# 5. 수정된 파일 확인
echo "수정된 파일 내용:"
sudo cat /etc/letsencrypt/options-ssl-nginx.conf
echo ""
echo "---"

# 6. Nginx 설정 테스트
echo "Nginx 설정 테스트 중..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx 설정에 오류가 있습니다."
    echo "백업 파일에서 복원:"
    echo "sudo cp /etc/letsencrypt/options-ssl-nginx.conf.backup.* /etc/letsencrypt/options-ssl-nginx.conf"
    exit 1
fi

# 7. Nginx 재시작
echo "Nginx 재시작 중..."
sudo systemctl restart nginx

if [ $? -ne 0 ]; then
    echo "❌ Nginx 재시작 실패."
    echo "로그 확인: sudo journalctl -xeu nginx.service"
    exit 1
fi

echo "✅ SSL 설정 완료!"
echo "이제 인증서를 재설치할 수 있습니다:"
echo "sudo certbot install --cert-name lico.berrple.com --nginx"

