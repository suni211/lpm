#!/bin/bash
# 403 Forbidden 오류 해결 스크립트

echo "=== 403 Forbidden 오류 해결 중 ==="
echo ""

# 1. 디렉토리 존재 확인 및 생성
echo "1. 디렉토리 확인 및 생성..."
sudo mkdir -p /var/www/bank
sudo mkdir -p /var/www/lico
echo "✅ 디렉토리 생성 완료"
echo ""

# 2. 파일 권한 확인 및 수정
echo "2. 파일 권한 확인..."
echo "Bank 디렉토리 권한:"
ls -la /var/www/bank | head -5
echo ""
echo "Lico 디렉토리 권한:"
ls -la /var/www/lico | head -5
echo ""

# 3. 파일 소유권 변경
echo "3. 파일 소유권 변경 (www-data:www-data)..."
sudo chown -R www-data:www-data /var/www/bank
sudo chown -R www-data:www-data /var/www/lico
echo "✅ 소유권 변경 완료"
echo ""

# 4. 디렉토리 권한 설정 (읽기/실행 권한)
echo "4. 디렉토리 권한 설정..."
sudo chmod -R 755 /var/www/bank
sudo chmod -R 755 /var/www/lico
echo "✅ 디렉토리 권한 설정 완료"
echo ""

# 5. 파일 권한 설정 (읽기 권한)
echo "5. 파일 권한 설정..."
sudo find /var/www/bank -type f -exec chmod 644 {} \;
sudo find /var/www/lico -type f -exec chmod 644 {} \;
echo "✅ 파일 권한 설정 완료"
echo ""

# 6. index.html 파일 확인
echo "6. index.html 파일 확인..."
if [ -f "/var/www/bank/index.html" ]; then
    echo "✅ Bank index.html 존재"
    ls -la /var/www/bank/index.html
else
    echo "❌ Bank index.html 없음 - 빌드 필요"
fi
echo ""

if [ -f "/var/www/lico/index.html" ]; then
    echo "✅ Lico index.html 존재"
    ls -la /var/www/lico/index.html
else
    echo "❌ Lico index.html 없음 - 빌드 필요"
fi
echo ""

# 7. Nginx 설정 확인
echo "7. Nginx 설정 확인..."
echo "Bank 설정:"
sudo grep -A 5 "location /" /etc/nginx/sites-available/bank | head -10
echo ""
echo "Lico 설정:"
sudo grep -A 5 "location /" /etc/nginx/sites-available/lico | head -10
echo ""

# 8. Nginx 에러 로그 확인
echo "8. 최근 Nginx 에러 로그 (마지막 20줄)..."
sudo tail -20 /var/log/nginx/error.log
echo ""

# 9. Nginx 설정 테스트
echo "9. Nginx 설정 테스트..."
sudo nginx -t
echo ""

# 10. Nginx 재시작
echo "10. Nginx 재시작..."
sudo systemctl restart nginx
echo "✅ Nginx 재시작 완료"
echo ""

# 11. 최종 권한 확인
echo "11. 최종 권한 확인..."
echo "Bank 디렉토리:"
ls -ld /var/www/bank
echo ""
echo "Lico 디렉토리:"
ls -ld /var/www/lico
echo ""

echo "=== 완료 ==="
echo ""
echo "만약 여전히 403 오류가 발생한다면:"
echo "1. index.html 파일이 있는지 확인: ls -la /var/www/bank/index.html"
echo "2. Nginx 에러 로그 확인: sudo tail -f /var/log/nginx/error.log"
echo "3. 파일이 없다면 빌드 후 재배포 필요"

