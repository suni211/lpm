#!/bin/bash

echo "🚀 Starting Rhythm Game Deployment..."

# 환경 변수 확인
if [ ! -f "server/.env" ]; then
    echo "❌ Error: .env file not found in server/"
    echo "Please create .env file based on .env.example"
    exit 1
fi

# 서버 빌드
echo "📦 Building server..."
cd server
npm install --production=false
npm run build
cd ..

# 클라이언트 빌드
echo "📦 Building client..."
cd client
npm install
npm run build
cd ..

# PM2로 서버 시작/재시작
echo "🔄 Deploying server with PM2..."
pm2 delete rhythm-server 2>/dev/null || true
pm2 start ecosystem.config.js

# Nginx 설정 복사 (처음 한 번만)
if [ ! -f "/etc/nginx/sites-available/rhythm.berrple.com" ]; then
    echo "📝 Setting up Nginx..."
    sudo cp nginx.conf /etc/nginx/sites-available/rhythm.berrple.com
    sudo ln -sf /etc/nginx/sites-available/rhythm.berrple.com /etc/nginx/sites-enabled/
fi

# 클라이언트 파일 배포
echo "📂 Deploying client files..."
sudo mkdir -p /var/www/rhythm/client/dist
sudo cp -r client/dist/* /var/www/rhythm/client/dist/

# Nginx 설정 테스트 및 재시작
echo "🔄 Restarting Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# PM2 저장 및 시작 프로그램 등록
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo "🌐 Server running on: http://rhythm.berrple.com"
echo ""
echo "📊 Useful commands:"
echo "  pm2 status           - Check server status"
echo "  pm2 logs rhythm-server - View server logs"
echo "  pm2 restart rhythm-server - Restart server"
echo "  pm2 monit            - Monitor server"
