#!/bin/bash
# Bank Nginx 설정 수정 스크립트

echo "Bank Nginx 설정을 수정합니다..."

# Nginx 설정 파일 수정
sudo tee /etc/nginx/sites-available/bank > /dev/null <<'EOF'
server {
    listen 80;
    server_name bank.berrple.com;

    # Client (정적 파일)
    location / {
        root /var/www/bank;
        try_files $uri $uri/ /index.html;

        # 캐싱 설정
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API (Bank Server)
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Auth (Bank Server)
    location /auth {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Nginx 설정 테스트
echo "Nginx 설정 테스트 중..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx 설정이 올바릅니다. 재시작합니다..."
    sudo systemctl restart nginx
    echo "✅ Bank Nginx 설정 완료!"
else
    echo "❌ Nginx 설정에 오류가 있습니다. 위의 오류 메시지를 확인하세요."
    exit 1
fi

