# MySQL2 마이그레이션 가이드

## 변경 사항

1. **import 변경**:
```typescript
// Before
import pool from '../database/db';

// After
import { query, getConnection } from '../database/db';
```

2. **일반 쿼리 변경**:
```typescript
// Before
const result = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
const user = result.rows[0];

// After
const result = await query('SELECT * FROM users WHERE id = ?', [id]);
const user = result[0];
```

3. **트랜잭션 변경**:
```typescript
// Before
const client = await pool.connect();
await client.query('BEGIN');
// ...
await client.query('COMMIT');
client.release();

// After
const client = await getConnection();
await client.beginTransaction();
// queries using client.query() - 이건 [rows, fields] 반환
await client.commit();
client.release();
```

4. **INSERT 결과 처리**:
```typescript
// Before (PostgreSQL)
const result = await pool.query('INSERT INTO ... RETURNING *');
const newRow = result.rows[0];

// After (MariaDB)
const [result]: any = await pool.query('INSERT INTO ...');
const newId = result.insertId;
const newRow = await query('SELECT * FROM ... WHERE id = ?', [newId]);
```

## 빠른 수정 방법

전체 server/src 폴더에서 검색/치환:
- `pool.query` → `query`
- `result.rows[0]` → `result[0]`
- `result.rows` → `result`
- `.rows.map` → `.map`
