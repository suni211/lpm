// Lico Admin 계정 생성 스크립트
// 사용법: node create_admin.js <username> <password> [role]

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function createAdmin(username, password, role = 'ADMIN') {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lico_db'
    });

    console.log(`\n=== Lico Admin 계정 생성 ===`);
    console.log(`데이터베이스: ${process.env.DB_NAME || 'lico_db'}`);

    // Admin 테이블 생성
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('SUPER_ADMIN', 'ADMIN') DEFAULT 'ADMIN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 기존 Admin 확인
    const [existing] = await connection.execute(
      'SELECT id FROM admins WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      console.log(`⚠️  이미 존재하는 Admin 아이디: ${username}`);
      await connection.end();
      return;
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = crypto.randomUUID();

    // Admin 계정 생성
    await connection.execute(
      'INSERT INTO admins (id, username, password, role) VALUES (?, ?, ?, ?)',
      [adminId, username, hashedPassword, role]
    );

    console.log(`✅ Lico Admin 계정 생성 완료!`);
    console.log(`   아이디: ${username}`);
    console.log(`   역할: ${role}`);
    console.log(`   ID: ${adminId}`);

    await connection.end();
  } catch (error) {
    console.error('❌ 오류:', error.message);
    throw error;
  }
}

// 명령줄 인자로 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('사용법: node create_admin.js <username> <password> [role]');
    console.log('예시: node create_admin.js admin admin123 SUPER_ADMIN');
    process.exit(1);
  }

  const [username, password, role = 'ADMIN'] = args;

  createAdmin(username, password, role)
    .then(() => {
      console.log('\n✅ 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 실패:', error);
      process.exit(1);
    });
}

module.exports = { createAdmin };

