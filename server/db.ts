import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// MySQL connection pool 생성
export const pool = mysql.createPool(process.env.DATABASE_URL);

// drizzle 생성자를 MySQL용으로 변경 (mode 속성 추가)
export const db = drizzle(pool, { 
  schema,
  mode: 'default'
});