#!/bin/bash
# SSL 중복 지시어 오류 해결 스크립트

echo "SSL 중복 지시어 오류를 해결합니다..."

# 1. Lico Nginx 설정 파일 확인
echo "Lico Nginx 설정 파일 확인 중..."
if [ -f /etc/nginx/sites-available/lico ]; then
    # 중복된 ssl_session_timeout 제거
    echo "중복된 ssl_session_timeout 제거 중..."
    sudo sed -i '/ssl_session_timeout/d' /etc/nginx/sites-available/lico
    
    # Certbot이 추가한 include 문 확인
    if grep -q "include /etc/letsencrypt/options-ssl-nginx.conf" /etc/nginx/sites-available/lico; then
        echo "Certbot include 문이 이미 있습니다."
    fi
fi

# 2. options-ssl-nginx.conf 파일 확인
if [ -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
    echo "options-ssl-nginx.conf 파일 확인 중..."
    # 중복된 ssl_session_timeout이 있는지 확인
    ssl_timeout_count=$(grep -c "ssl_session_timeout" /etc/letsencrypt/options-ssl-nginx.conf || echo "0")
    if [ "$ssl_timeout_count" -gt 1 ]; then
        echo "options-ssl-nginx.conf에 중복된 ssl_session_timeout이 있습니다."
        # 첫 번째 것만 남기고 나머지 제거
        sudo sed -i '/ssl_session_timeout/!b;:a;n;ba' /etc/letsencrypt/options-ssl-nginx.conf
    fi
fi

# 3. Nginx 설정 테스트
echo "Nginx 설정 테스트 중..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx 설정에 오류가 있습니다."
    echo "수동으로 확인이 필요합니다:"
    echo "sudo nano /etc/nginx/sites-available/lico"
    exit 1
fi

# 4. Nginx 재시작
echo "Nginx 재시작 중..."
sudo systemctl restart nginx

if [ $? -ne 0 ]; then
    echo "❌ Nginx 재시작 실패."
    echo "로그 확인: sudo journalctl -xeu nginx.service"
    exit 1
fi

# 5. 인증서 재설치
echo "Lico SSL 인증서 재설치 중..."
sudo certbot install --cert-name lico.berrple.com --nginx

echo "✅ SSL 설정 완료!"
echo "인증서 확인: sudo certbot certificates"

