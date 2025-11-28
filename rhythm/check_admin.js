const mysql = require('mysql2/promise');

async function checkAdmin() {
  try {
    const args = process.argv.slice(2);
    const dbPassword = args[0] || '';

    if (!dbPassword) {
      console.log('사용법: node check_admin.js <DB비밀번호>');
      process.exit(1);
    }

    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: dbPassword,
      database: 'rhythm_db'
    });

    console.log('✅ 데이터베이스 연결 성공\n');

    // 모든 admin 계정 확인
    const [admins] = await connection.execute('SELECT id, username, role, created_at, last_login FROM admins');

    if (admins.length === 0) {
      console.log('⚠️  등록된 관리자 계정이 없습니다.');
      console.log('관리자 계정을 생성하려면: node create_admin.js <DB비밀번호>');
    } else {
      console.log('현재 등록된 관리자 계정:');
      console.log('='.repeat(80));
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. 아이디: ${admin.username}`);
        console.log(`   권한: ${admin.role}`);
        console.log(`   생성일: ${admin.created_at}`);
        console.log(`   마지막 로그인: ${admin.last_login || '없음'}`);
        console.log('-'.repeat(80));
      });
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

checkAdmin();
