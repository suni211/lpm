# Rhythm Game Database Setup Script for Windows
# PowerShell에서 실행: .\rhythm\setup_db.ps1

Write-Host "🎵 Rhythm Game Database Setup" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# MySQL 비밀번호 입력받기
$password = Read-Host "MySQL root 비밀번호 입력" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# MySQL 경로 찾기
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MariaDB 10.6\bin\mysql.exe",
    "C:\Program Files\MariaDB 10.11\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "mysql"
)

$mysqlPath = $null
foreach ($path in $mysqlPaths) {
    if ($path -eq "mysql") {
        try {
            $null = Get-Command mysql -ErrorAction Stop
            $mysqlPath = "mysql"
            break
        } catch {
            continue
        }
    } elseif (Test-Path $path) {
        $mysqlPath = $path
        break
    }
}

if (-not $mysqlPath) {
    Write-Host "❌ MySQL을 찾을 수 없습니다!" -ForegroundColor Red
    Write-Host "MySQL 설치 경로를 직접 입력하세요 (예: C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe):" -ForegroundColor Yellow
    $mysqlPath = Read-Host

    if (-not (Test-Path $mysqlPath)) {
        Write-Host "❌ 경로가 올바르지 않습니다!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ MySQL 찾음: $mysqlPath" -ForegroundColor Green

# 데이터베이스 생성
Write-Host ""
Write-Host "📁 데이터베이스 생성 중..." -ForegroundColor Yellow

$createDbQuery = "CREATE DATABASE IF NOT EXISTS rhythm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
$createDbQuery | & $mysqlPath -u root -p"$plainPassword" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ rhythm_db 데이터베이스 생성 완료" -ForegroundColor Green
} else {
    Write-Host "❌ 데이터베이스 생성 실패" -ForegroundColor Red
    Write-Host "비밀번호를 확인하거나 수동으로 생성하세요:" -ForegroundColor Yellow
    Write-Host "  mysql -u root -p" -ForegroundColor Cyan
    Write-Host "  CREATE DATABASE rhythm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Cyan
    exit 1
}

# 스키마 적용
Write-Host ""
Write-Host "📋 스키마 적용 중..." -ForegroundColor Yellow

$schemaPath = Join-Path $PSScriptRoot "server\src\database\schema.sql"
$schemaPath = $schemaPath -replace '\\', '/'

if (-not (Test-Path $schemaPath)) {
    Write-Host "❌ schema.sql 파일을 찾을 수 없습니다: $schemaPath" -ForegroundColor Red
    exit 1
}

Get-Content $schemaPath | & $mysqlPath -u root -p"$plainPassword" rhythm_db 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 스키마 적용 완료" -ForegroundColor Green
} else {
    Write-Host "❌ 스키마 적용 실패" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 데이터베이스 설정 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. cd rhythm\server" -ForegroundColor White
Write-Host "  2. npm install" -ForegroundColor White
Write-Host "  3. cp .env.example .env" -ForegroundColor White
Write-Host "  4. .env 파일에서 DB_PASSWORD 수정" -ForegroundColor White
Write-Host "  5. npm run dev" -ForegroundColor White
Write-Host ""
