import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ss092888?',
  database: process.env.DB_NAME || 'lpm',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Helper function to execute queries and return rows
export const query = async (sql: string, params?: any[]): Promise<any[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows;
};

// Helper function to get connection for transactions
export const getConnection = async (): Promise<PoolConnection> => {
  return await pool.getConnection();
};

// Test connection
pool.getConnection()
  .then((connection) => {
    console.log('✅ MariaDB 데이터베이스 연결 성공');
    connection.release();
  })
  .catch((err) => {
    console.error('❌ MariaDB 연결 오류:', err);
    process.exit(-1);
  });

export default pool;
