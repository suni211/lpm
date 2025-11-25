#!/bin/bash

# MariaDB 타입 오류 일괄 수정 스크립트

echo "🔧 MariaDB 타입 오류 수정 중..."

# 1. import 문 변경
find server/src -name "*.ts" -type f -exec sed -i "s/import pool from '..\/database\/db'/import pool, { query, getConnection } from '..\/database\/db'/g" {} \;
find server/src -name "*.ts" -type f -exec sed -i "s/import pool from '..\/..\/database\/db'/import pool, { query, getConnection } from '..\/..\/database\/db'/g" {} \;
find server/src -name "*.ts" -type f -exec sed -i "s/import pool from '.\/database\/db'/import pool, { query, getConnection } from '.\/database\/db'/g" {} \;

# 2. pool.query를 query로 변경 (간단한 쿼리)
find server/src -name "*.ts" -type f -exec sed -i "s/await pool\.query(/await query(/g" {} \;
find server/src -name "*.ts" -type f -exec sed -i "s/pool\.query(/query(/g" {} \;

# 3. result.rows[0] -> result[0]
find server/src -name "*.ts" -type f -exec sed -i "s/result\.rows\[0\]/result[0]/g" {} \;

# 4. result.rows -> result
find server/src -name "*.ts" -type f -exec sed -i "s/result\.rows\.map(/result.map(/g" {} \;
find server/src -name "*.ts" -type f -exec sed -i "s/result\.rows\.length/result.length/g" {} \;
find server/src -name "*.ts" -type f -exec sed -i "s/result\.rows/result/g" {} \;

# 5. $1, $2 등 PostgreSQL 플레이스홀더를 ? 로 변경
for i in {1..20}; do
  find server/src -name "*.ts" -type f -exec sed -i "s/\\\$${i}/\?/g" {} \;
done

# 6. 트랜잭션 관련
find server/src -name "*.ts" -type f -exec sed -i "s/const client = await pool\.connect()/const client = await getConnection()/g" {} \;
find server/src -name "*.ts" -type f -exec sed -i "s/await client\.query('BEGIN')/await client.beginTransaction()/g" {} \;
find server/src -name "*.ts" -type f -exec sed -i "s/await client\.query('COMMIT')/await client.commit()/g" {} \;
find server/src -name "*.ts" -type f -exec sed -i "s/await client\.query('ROLLBACK')/await client.rollback()/g" {} \;

echo "✅ 일괄 수정 완료!"
echo "⚠️  수동 확인 필요:"
echo "   1. INSERT ... RETURNING * 문 확인"
echo "   2. 트랜잭션 내 client.query() 수동 수정"
echo "   3. npm run build로 빌드 테스트"
