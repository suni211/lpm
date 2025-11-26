"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = exports.query = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = promise_1.default.createPool({
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
const query = async (sql, params) => {
    const [rows] = await pool.query(sql, params);
    return rows;
};
exports.query = query;
// Helper function to get connection for transactions
const getConnection = async () => {
    return await pool.getConnection();
};
exports.getConnection = getConnection;
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
exports.default = pool;
//# sourceMappingURL=db.js.map