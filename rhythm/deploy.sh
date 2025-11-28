#!/bin/bash

# DJMAX-Style Rhythm Game Deployment Script
# Usage: ./deploy.sh

echo "🎵 DJMAX-Style Rhythm Game Deployment"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo ./deploy.sh)${NC}"
  exit 1
fi

# 1. Install dependencies
echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"

cd rhythm/server
npm install
cd ../client
npm install
cd ../..

# 2. Create upload directories
echo -e "${YELLOW}📁 Creating upload directories...${NC}"

mkdir -p rhythm/server/uploads/audio
mkdir -p rhythm/server/uploads/covers
mkdir -p rhythm/server/uploads/bga

chmod -R 755 rhythm/server/uploads

# 3. Setup database
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
echo "Please enter MySQL root password:"
read -s DB_PASSWORD

mysql -u root -p"$DB_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS rhythm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Database created${NC}"
else
  echo -e "${RED}❌ Failed to create database${NC}"
  exit 1
fi

# Apply schema
mysql -u root -p"$DB_PASSWORD" rhythm_db < rhythm/server/src/database/schema.sql

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Schema applied${NC}"
else
  echo -e "${RED}❌ Failed to apply schema${NC}"
  exit 1
fi

# 4. Create .env file
echo -e "${YELLOW}⚙️  Creating .env file...${NC}"

if [ ! -f rhythm/server/.env ]; then
  cp rhythm/server/.env.example rhythm/server/.env

  # Generate random session secret
  SESSION_SECRET=$(openssl rand -base64 32)

  sed -i "s/your_password_here/$DB_PASSWORD/g" rhythm/server/.env
  sed -i "s/your-super-secret-session-key-change-this-in-production/$SESSION_SECRET/g" rhythm/server/.env

  echo -e "${GREEN}✅ .env file created${NC}"
else
  echo -e "${YELLOW}⚠️  .env file already exists, skipping${NC}"
fi

# 5. Build projects
echo -e "${YELLOW}🔨 Building server...${NC}"
cd rhythm/server
npm run build

echo -e "${YELLOW}🔨 Building client...${NC}"
cd ../client
npm run build
cd ../..

# 6. Setup PM2
echo -e "${YELLOW}🚀 Setting up PM2...${NC}"

if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi

# Create ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'rhythm-server',
    cwd: './rhythm/server',
    script: 'dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# 7. Setup nginx
echo -e "${YELLOW}🌐 Setting up nginx...${NC}"

cat > /etc/nginx/sites-available/rhythm.berrple.com <<EOF
server {
    listen 80;
    server_name rhythm.berrple.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rhythm.berrple.com;

    ssl_certificate /etc/letsencrypt/live/rhythm.berrple.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rhythm.berrple.com/privkey.pem;

    client_max_body_size 50M;

    # Frontend
    location / {
        root $(pwd)/rhythm/client/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5003;
    }
}
EOF

ln -sf /etc/nginx/sites-available/rhythm.berrple.com /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

if [ $? -eq 0 ]; then
  systemctl reload nginx
  echo -e "${GREEN}✅ nginx configured${NC}"
else
  echo -e "${RED}❌ nginx configuration error${NC}"
fi

# 8. Setup SSL (if not exists)
if [ ! -d "/etc/letsencrypt/live/rhythm.berrple.com" ]; then
  echo -e "${YELLOW}🔒 Setting up SSL...${NC}"
  certbot --nginx -d rhythm.berrple.com
fi

# 9. Start PM2
echo -e "${YELLOW}▶️  Starting server with PM2...${NC}"

pm2 delete rhythm-server 2>/dev/null
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "🎵 Rhythm Game is now running!"
echo "   Frontend: https://rhythm.berrple.com"
echo "   Backend: http://localhost:5003"
echo ""
echo "📋 Next steps:"
echo "   1. Create admin account: node create_admin.js <db_password> <username> <password>"
echo "   2. Upload songs and beatmaps via Admin Dashboard"
echo "   3. Monitor logs: pm2 logs rhythm-server"
echo ""
