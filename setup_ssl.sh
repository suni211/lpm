#!/bin/bash
# SSL 인증서 설치 스크립트

echo "Let's Encrypt SSL 인증서를 설치합니다..."

# Certbot 설치
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (bank.berrple.com)
echo "bank.berrple.com SSL 인증서 발급 중..."
sudo certbot --nginx -d bank.berrple.com --non-interactive --agree-tos --email admin@berrple.com --redirect

# SSL 인증서 발급 (lico.berrple.com)
echo "lico.berrple.com SSL 인증서 발급 중..."
sudo certbot --nginx -d lico.berrple.com --non-interactive --agree-tos --email admin@berrple.com --redirect

# 자동 갱신 테스트
sudo certbot renew --dry-run

echo "✅ SSL 인증서 설치 완료!"
echo "이제 https://bank.berrple.com 과 https://lico.berrple.com 으로 접속할 수 있습니다."

