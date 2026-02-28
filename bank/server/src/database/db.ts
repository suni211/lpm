import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'minecraft_bank',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const query = async (sql: string, params?: any[]) => {
  const [results] = await pool.query(sql, params);
  return results as any[];
};

// 트랜잭션을 위한 연결 가져오기
export const getConnection = async () => {
  return await pool.getConnection();
};

export { pool };
export default pool;
