#!/bin/bash
# Bank와 Lico Nginx 설정 확인 스크립트

echo "=== Bank Nginx 설정 확인 ==="
echo ""
sudo cat /etc/nginx/sites-available/bank
echo ""
echo "---"
echo ""

echo "=== Lico Nginx 설정 확인 ==="
echo ""
sudo cat /etc/nginx/sites-available/lico
echo ""
echo "---"
echo ""

echo "=== Nginx 설정 테스트 ==="
sudo nginx -t
echo ""

echo "=== Nginx 상태 ==="
sudo systemctl status nginx --no-pager | head -10
echo ""

echo "=== SSL 인증서 확인 ==="
sudo certbot certificates
echo ""

echo "=== Bank Server 상태 ==="
pm2 list | grep bank || echo "Bank Server가 PM2에서 실행 중이지 않습니다."
echo ""

echo "=== Lico Server 상태 ==="
pm2 list | grep lico || echo "Lico Server가 PM2에서 실행 중이지 않습니다."
echo ""

echo "=== 포트 확인 ==="
sudo netstat -tulpn | grep -E ':(5001|5002)' || echo "포트가 열려있지 않습니다."




