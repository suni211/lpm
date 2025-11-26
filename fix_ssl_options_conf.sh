#!/bin/bash
# SSL options-ssl-nginx.conf 중복 오류 해결 스크립트

echo "SSL options-ssl-nginx.conf 중복 오류를 해결합니다..."

# 1. options-ssl-nginx.conf 파일 확인
if [ -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
    echo "options-ssl-nginx.conf 파일 확인 중..."
    
    # 중복된 ssl_session_timeout 확인
    ssl_timeout_count=$(grep -c "ssl_session_timeout" /etc/letsencrypt/options-ssl-nginx.conf || echo "0")
    echo "ssl_session_timeout 발견 횟수: $ssl_timeout_count"
    
    if [ "$ssl_timeout_count" -gt 1 ]; then
        echo "중복된 ssl_session_timeout을 제거합니다..."
        
        # 백업 생성
        sudo cp /etc/letsencrypt/options-ssl-nginx.conf /etc/letsencrypt/options-ssl-nginx.conf.backup
        
        # 첫 번째 ssl_session_timeout만 남기고 나머지 제거
        # awk를 사용하여 첫 번째만 유지
        sudo awk '/ssl_session_timeout/ {if (!seen++) print; next} 1' /etc/letsencrypt/options-ssl-nginx.conf > /tmp/options-ssl-nginx.conf.tmp
        sudo mv /tmp/options-ssl-nginx.conf.tmp /etc/letsencrypt/options-ssl-nginx.conf
        sudo chmod 644 /etc/letsencrypt/options-ssl-nginx.conf
        
        echo "✅ 중복 제거 완료"
    else
        echo "중복이 없습니다."
    fi
else
    echo "❌ options-ssl-nginx.conf 파일을 찾을 수 없습니다."
    exit 1
fi

# 2. Nginx 설정 테스트
echo "Nginx 설정 테스트 중..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx 설정에 오류가 있습니다."
    exit 1
fi

# 3. Nginx 재시작
echo "Nginx 재시작 중..."
sudo systemctl restart nginx

if [ $? -ne 0 ]; then
    echo "❌ Nginx 재시작 실패."
    echo "로그 확인: sudo journalctl -xeu nginx.service"
    exit 1
fi

# 4. 인증서 재설치
echo "Lico SSL 인증서 재설치 중..."
sudo certbot install --cert-name lico.berrple.com --nginx

echo "✅ SSL 설정 완료!"
echo "인증서 확인: sudo certbot certificates"

