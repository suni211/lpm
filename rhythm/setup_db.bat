@echo off
REM Rhythm Game Database Setup Script for Windows (CMD)
chcp 65001 >nul
echo.
echo 🎵 Rhythm Game Database Setup
echo =============================
echo.

REM MySQL 경로 찾기
set "MYSQL_PATH="

if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set "MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
) else if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" (
    set "MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
) else if exist "C:\Program Files\MariaDB 10.6\bin\mysql.exe" (
    set "MYSQL_PATH=C:\Program Files\MariaDB 10.6\bin\mysql.exe"
) else if exist "C:\Program Files\MariaDB 10.11\bin\mysql.exe" (
    set "MYSQL_PATH=C:\Program Files\MariaDB 10.11\bin\mysql.exe"
) else if exist "C:\xampp\mysql\bin\mysql.exe" (
    set "MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe"
) else (
    REM PATH에서 mysql 찾기
    where mysql >nul 2>&1
    if %errorlevel% equ 0 (
        set "MYSQL_PATH=mysql"
    )
)

if "%MYSQL_PATH%"=="" (
    echo ❌ MySQL을 찾을 수 없습니다!
    echo.
    echo 다음 방법 중 하나를 선택하세요:
    echo   1. MySQL 설치 경로를 PATH에 추가
    echo   2. 이 파일을 편집하여 MYSQL_PATH 직접 지정
    echo.
    pause
    exit /b 1
)

echo ✅ MySQL 찾음: %MYSQL_PATH%
echo.

REM MySQL 비밀번호 입력
set /p DB_PASSWORD="MySQL root 비밀번호 입력: "
echo.

REM 데이터베이스 생성
echo 📁 데이터베이스 생성 중...
echo CREATE DATABASE IF NOT EXISTS rhythm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; | "%MYSQL_PATH%" -u root -p%DB_PASSWORD% 2>nul

if %errorlevel% equ 0 (
    echo ✅ rhythm_db 데이터베이스 생성 완료
) else (
    echo ❌ 데이터베이스 생성 실패
    echo 비밀번호를 확인하세요
    pause
    exit /b 1
)
echo.

REM 스키마 적용
echo 📋 스키마 적용 중...
"%MYSQL_PATH%" -u root -p%DB_PASSWORD% rhythm_db < "%~dp0server\src\database\schema.sql" 2>nul

if %errorlevel% equ 0 (
    echo ✅ 스키마 적용 완료
) else (
    echo ❌ 스키마 적용 실패
    pause
    exit /b 1
)
echo.

echo 🎉 데이터베이스 설정 완료!
echo.
echo 다음 단계:
echo   1. cd rhythm\server
echo   2. npm install
echo   3. copy .env.example .env
echo   4. .env 파일에서 DB_PASSWORD=%DB_PASSWORD% 로 수정
echo   5. npm run dev
echo.
pause
