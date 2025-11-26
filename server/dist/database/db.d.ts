import { Pool, PoolConnection } from 'mysql2/promise';
declare const pool: Pool;
export declare const query: (sql: string, params?: any[]) => Promise<any[]>;
export declare const getConnection: () => Promise<PoolConnection>;
export default pool;
//# sourceMappingURL=db.d.ts.map