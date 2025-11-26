#!/bin/bash
# Bank Client 배포 스크립트

# 디렉토리 생성
sudo mkdir -p /var/www/bank

# 기존 파일 삭제 (있는 경우)
sudo rm -rf /var/www/bank/*

# 빌드 파일 복사
sudo cp -r ~/lpm/bank/client/dist/* /var/www/bank/

# 권한 설정
sudo chown -R www-data:www-data /var/www/bank

echo "Bank Client 배포 완료!"

