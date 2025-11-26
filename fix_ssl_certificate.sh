#!/bin/bash
# SSL 인증서 문제 해결 스크립트

echo "SSL 인증서 문제를 해결합니다..."

# 1. 기존 인증서 삭제 (문제가 있는 경우)
echo "기존 인증서 확인 중..."
sudo certbot certificates

# 2. 기존 인증서 삭제 (선택사항 - 문제가 있을 때만)
read -p "기존 인증서를 삭제하고 다시 발급받으시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "기존 인증서 삭제 중..."
    sudo certbot delete --cert-name bank.berrple.com 2>/dev/null || true
    sudo certbot delete --cert-name lico.berrple.com 2>/dev/null || true
fi

# 3. Nginx 설정 확인
echo "Nginx 설정 확인 중..."
sudo nginx -t

# 4. SSL 인증서 재발급 (Bank)
echo "Bank SSL 인증서 발급 중..."
sudo certbot --nginx -d bank.berrple.com --non-interactive --agree-tos --email ine158lovely@gmail.com --redirect --force-renewal

# 5. SSL 인증서 재발급 (Lico)
echo "Lico SSL 인증서 발급 중..."
sudo certbot --nginx -d lico.berrple.com --non-interactive --agree-tos --email ine158lovely@gmail.com --redirect --force-renewal

# 6. Nginx 재시작
echo "Nginx 재시작 중..."
sudo systemctl restart nginx

# 7. 인증서 확인
echo "발급된 인증서 확인:"
sudo certbot certificates

echo "✅ SSL 인증서 설정 완료!"
echo "이제 https://bank.berrple.com 과 https://lico.berrple.com 으로 접속하세요."

