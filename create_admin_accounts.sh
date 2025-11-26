#!/bin/bash
# Bank와 Lico 서버용 Admin 계정 생성 스크립트

echo "=== Admin 계정 생성 스크립트 ==="
echo ""

# Node.js가 설치되어 있는지 확인
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    exit 1
fi

# Bank Admin 계정 생성
echo "1. Bank Admin 계정 생성 중..."
cd ~/lpm/bank/server

# Admin 계정 정보 입력
read -p "Bank Admin 아이디: " BANK_ADMIN_USERNAME
read -sp "Bank Admin 비밀번호: " BANK_ADMIN_PASSWORD
echo ""
read -p "Bank Admin 역할 (SUPER_ADMIN/ADMIN): " BANK_ADMIN_ROLE

if [ -z "$BANK_ADMIN_USERNAME" ] || [ -z "$BANK_ADMIN_PASSWORD" ]; then
    echo "❌ 아이디와 비밀번호를 입력해주세요."
    exit 1
fi

if [ -z "$BANK_ADMIN_ROLE" ]; then
    BANK_ADMIN_ROLE="ADMIN"
fi

# Node.js 스크립트로 Admin 계정 생성
node <<EOF
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function createBankAdmin() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bank_db'
    });

    // Admin 테이블이 있는지 확인
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'admins'"
    );

    if (tables.length === 0) {
      console.log('Admin 테이블 생성 중...');
      await connection.execute(\`
        CREATE TABLE IF NOT EXISTS admins (
          id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('SUPER_ADMIN', 'ADMIN') DEFAULT 'ADMIN',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP NULL,
          INDEX idx_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      \`);
    }

    // 기존 Admin 확인
    const [existing] = await connection.execute(
      'SELECT id FROM admins WHERE username = ?',
      ['$BANK_ADMIN_USERNAME']
    );

    if (existing.length > 0) {
      console.log('⚠️  이미 존재하는 Admin 아이디입니다.');
      await connection.end();
      return;
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash('$BANK_ADMIN_PASSWORD', 10);
    const adminId = crypto.randomUUID();

    // Admin 계정 생성
    await connection.execute(
      'INSERT INTO admins (id, username, password, role) VALUES (?, ?, ?, ?)',
      [adminId, '$BANK_ADMIN_USERNAME', hashedPassword, '$BANK_ADMIN_ROLE']
    );

    console.log('✅ Bank Admin 계정 생성 완료!');
    console.log('   아이디: $BANK_ADMIN_USERNAME');
    console.log('   역할: $BANK_ADMIN_ROLE');
    console.log('   ID: ' + adminId);

    await connection.end();
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

createBankAdmin();
EOF

echo ""

# Lico Admin 계정 생성
echo "2. Lico Admin 계정 생성 중..."
cd ~/lpm/lico/server

read -p "Lico Admin 아이디: " LICO_ADMIN_USERNAME
read -sp "Lico Admin 비밀번호: " LICO_ADMIN_PASSWORD
echo ""
read -p "Lico Admin 역할 (SUPER_ADMIN/ADMIN): " LICO_ADMIN_ROLE

if [ -z "$LICO_ADMIN_USERNAME" ] || [ -z "$LICO_ADMIN_PASSWORD" ]; then
    echo "❌ 아이디와 비밀번호를 입력해주세요."
    exit 1
fi

if [ -z "$LICO_ADMIN_ROLE" ]; then
    LICO_ADMIN_ROLE="ADMIN"
fi

# Node.js 스크립트로 Admin 계정 생성
node <<EOF
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function createLicoAdmin() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lico_db'
    });

    // Admin 테이블이 있는지 확인
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'admins'"
    );

    if (tables.length === 0) {
      console.log('Admin 테이블 생성 중...');
      await connection.execute(\`
        CREATE TABLE IF NOT EXISTS admins (
          id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('SUPER_ADMIN', 'ADMIN') DEFAULT 'ADMIN',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP NULL,
          INDEX idx_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      \`);
    }

    // 기존 Admin 확인
    const [existing] = await connection.execute(
      'SELECT id FROM admins WHERE username = ?',
      ['$LICO_ADMIN_USERNAME']
    );

    if (existing.length > 0) {
      console.log('⚠️  이미 존재하는 Admin 아이디입니다.');
      await connection.end();
      return;
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash('$LICO_ADMIN_PASSWORD', 10);
    const adminId = crypto.randomUUID();

    // Admin 계정 생성
    await connection.execute(
      'INSERT INTO admins (id, username, password, role) VALUES (?, ?, ?, ?)',
      [adminId, '$LICO_ADMIN_USERNAME', hashedPassword, '$LICO_ADMIN_ROLE']
    );

    console.log('✅ Lico Admin 계정 생성 완료!');
    console.log('   아이디: $LICO_ADMIN_USERNAME');
    console.log('   역할: $LICO_ADMIN_ROLE');
    console.log('   ID: ' + adminId);

    await connection.end();
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

createLicoAdmin();
EOF

echo ""
echo "=== 완료 ==="
echo ""
echo "생성된 Admin 계정으로 로그인할 수 있습니다:"
echo "  - Bank: https://bank.berrple.com/admin-login"
echo "  - Lico: https://lico.berrple.com/admin-login"

