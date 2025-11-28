const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function createAdmin() {
  try {
    const args = process.argv.slice(2);
    const dbPassword = args[0] || '';
    const adminUsername = args[1] || 'admin';
    const adminPassword = args[2] || 'admin123';

    if (!dbPassword) {
      console.log('사용법: node create_admin.js <DB비밀번호> [관리자아이디] [관리자비밀번호]');
      console.log('예시: node create_admin.js mydbpass admin admin123');
      process.exit(1);
    }

    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: dbPassword,
      database: 'rhythm_db'
    });

    console.log('✅ 데이터베이스 연결 성공');

    // 기존 admin 계정 확인
    const [existing] = await connection.execute(
      'SELECT username FROM admins WHERE username = ?',
      [adminUsername]
    );

    if (existing.length > 0) {
      console.log(`⚠️  관리자 계정 "${adminUsername}"이 이미 존재합니다.`);
      console.log('다른 사용자명을 사용하세요.');
      await connection.end();
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminId = uuidv4();

    await connection.execute(
      `INSERT INTO admins (id, username, password, role) VALUES (?, ?, ?, ?)`,
      [adminId, adminUsername, hashedPassword, 'SUPER_ADMIN']
    );

    console.log('');
    console.log('🎉 관리자 계정 생성 완료!');
    console.log('='.repeat(50));
    console.log(`   아이디: ${adminUsername}`);
    console.log(`   비밀번호: ${adminPassword}`);
    console.log(`   권한: SUPER_ADMIN`);
    console.log('='.repeat(50));
    console.log('');
    console.log('로그인: http://localhost:3003/admin');
    console.log('');

    await connection.end();
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

createAdmin();
