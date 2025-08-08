import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";
import type { PoolConnection } from 'mysql2/promise';


if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 1. 연결 풀(Pool)을 먼저 생성합니다.
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
});

// 2. 생성된 풀(pool)에 'connection' 이벤트 리스너를 추가합니다.
// 이 코드는 풀에서 새로운 데이터베이스 연결이 생성될 때마다 실행됩니다.
pool.on('connection', (connection: PoolConnection) => {
  console.log('⚡️ New DB connection established, forcing charset to utf8mb4...');
  
  // "이 연결은 무조건 utf8mb4 문자셋을 사용하겠습니다" 라고 MySQL 서버에 명령합니다.
  connection.query("SET NAMES utf8mb4");
});

// drizzle 생성자를 MySQL용으로 변경 (mode 속성 추가)
export const db = drizzle(pool, { 
  schema,
  mode: 'default'
});