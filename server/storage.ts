import {
  users,
  databaseSchemas,
  queries,
  sharedQueries,
  ztSqlAstntLogiLog,
  type InsertLoginLog,
  type User,
  type UpsertUser,
  type InsertDatabaseSchema,
  type DatabaseSchema,
  type InsertQuery,
  type Query,
  type InsertSharedQuery,
  type SharedQuery,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql, isNull } from "drizzle-orm";

export interface IStorage {
  // 로그인 로그 생성
  createLoginLog(logData: InsertLoginLog): Promise<void>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Database Schema operations
  createSchema(schema: InsertDatabaseSchema): Promise<DatabaseSchema>;
  getSchema(id: number): Promise<DatabaseSchema | undefined>;
  getUserSchemas(userId: string): Promise<DatabaseSchema[]>;
  updateSchema(id: number, updates: Partial<InsertDatabaseSchema>): Promise<DatabaseSchema | undefined>;
  deleteSchema(id: number): Promise<boolean>;

  // Query operations
  createQuery(query: InsertQuery): Promise<Query>;
  getQuery(id: number): Promise<Query | undefined>;
  getUserQueries(userId: string, limit?: number): Promise<Query[]>;
  getUserFavoriteQueries(userId: string): Promise<Query[]>;
  updateQuery(id: number, updates: Partial<InsertQuery>): Promise<Query | undefined>;
  deleteQuery(id: number): Promise<boolean>;
  toggleQueryFavorite(id: number): Promise<Query | undefined>;
  searchQueries(userId: string, searchTerm: string): Promise<Query[]>;

  // Shared Query operations
  createSharedQuery(sharedQuery: InsertSharedQuery): Promise<SharedQuery>;
  getSharedQuery(shareId: string): Promise<SharedQuery | undefined>;
  getSharedQueryWithQuery(shareId: string): Promise<(SharedQuery & { query: Query }) | undefined>;
  deactivateSharedQuery(shareId: string): Promise<boolean>;
  cleanupExpiredSharedQueries(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // 로그인 로그 생성 함수 구현
  async createLoginLog(logData: InsertLoginLog): Promise<void> {
    await db.insert(ztSqlAstntLogiLog).values(logData);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // MySQL에서는 onConflictDoUpdate 대신 ON DUPLICATE KEY UPDATE 사용
    try {
      // 먼저 insert 시도
      const result = await db.insert(users).values(userData);
      
      // insert 성공 시 해당 사용자 조회
      return await this.getUser(userData.id) as User;
    } catch (error) {
      // 중복 키 에러인 경우 update 수행
      await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id));
      
      return await this.getUser(userData.id) as User;
    }
  }

  // Database Schema operations
  async createSchema(schema: InsertDatabaseSchema): Promise<DatabaseSchema> {
    return await db.transaction(async (tx) => {
      const beforeInsert = new Date();
      
      await tx.insert(databaseSchemas).values(schema);
      
      // 트랜잭션 내에서 방금 전 시간 이후 생성된 레코드 조회
      const [newSchema] = await tx
        .select()
        .from(databaseSchemas)
        .where(
          and(
            eq(databaseSchemas.userId, schema.userId!),
            eq(databaseSchemas.name, schema.name),
            sql`${databaseSchemas.createdAt} >= ${beforeInsert}`
          )
        )
        .orderBy(desc(databaseSchemas.createdAt))
        .limit(1);
      
      return newSchema as DatabaseSchema;
    });
  }

  async getSchema(id: number): Promise<DatabaseSchema | undefined> {
    const [schema] = await db
      .select()
      .from(databaseSchemas)
      .where(eq(databaseSchemas.id, id));
    return schema as DatabaseSchema;
  }

  async getUserSchemas(userId: string): Promise<DatabaseSchema[]> {
    const schemas = await db
      .select()
      .from(databaseSchemas)
      .where(eq(databaseSchemas.userId, userId))
      .orderBy(desc(databaseSchemas.createdAt));
    return schemas as DatabaseSchema[];
  }

  async updateSchema(id: number, updates: Partial<InsertDatabaseSchema>): Promise<DatabaseSchema | undefined> {
    await db
      .update(databaseSchemas)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(databaseSchemas.id, id));
    
    // 업데이트 후 해당 레코드 조회
    return await this.getSchema(id);
  }

  async deleteSchema(id: number): Promise<boolean> {
    // 삭제 전 존재 여부 확인
    const existsBefore = await this.getSchema(id);
    if (!existsBefore) return false;
    
    // 삭제 수행
    await db.delete(databaseSchemas).where(eq(databaseSchemas.id, id));
    
    // 삭제 후 존재 여부 확인
    const existsAfter = await this.getSchema(id);
    return !existsAfter;
  }

  // Query operations
  async createQuery(query: InsertQuery): Promise<Query> {
    return await db.transaction(async (tx) => {
      const beforeInsert = new Date();
      
      await tx.insert(queries).values(query);
      
      // 트랜잭션 내에서 방금 전 시간 이후 생성된 레코드 조회
      const [newQuery] = await tx
        .select()
        .from(queries)
        .where(
          and(
            eq(queries.userId, query.userId!),
            eq(queries.sqlQuery, query.sqlQuery),
            sql`${queries.createdAt} >= ${beforeInsert}`
          )
        )
        .orderBy(desc(queries.createdAt))
        .limit(1);
      
      return {
        ...newQuery,
        executionResult: newQuery.executionResult as any
      } as Query;
    });
  }

  async getQuery(id: number): Promise<Query | undefined> {
    const [query] = await db
      .select()
      .from(queries)
      .where(eq(queries.id, id));
    
    if (!query) return undefined;
    
    return {
      ...query,
      executionResult: query.executionResult as any
    } as Query;
  }

  async getUserQueries(userId: string, limit = 50): Promise<Query[]> {
    const results = await db
      .select()
      .from(queries)
      .where(eq(queries.userId, userId))
      .orderBy(desc(queries.createdAt))
      .limit(limit);
    
    return results.map(query => ({
      ...query,
      executionResult: query.executionResult as any
    })) as Query[];
  }

  async getUserFavoriteQueries(userId: string): Promise<Query[]> {
    const results = await db
      .select()
      .from(queries)
      .where(and(eq(queries.userId, userId), eq(queries.isFavorite, true)))
      .orderBy(desc(queries.createdAt));
    
    return results.map(query => ({
      ...query,
      executionResult: query.executionResult as any
    })) as Query[];
  }

  async updateQuery(id: number, updates: Partial<InsertQuery>): Promise<Query | undefined> {
    await db
      .update(queries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(queries.id, id));
    
    // 업데이트 후 해당 레코드 조회
    return await this.getQuery(id);
  }

  async deleteQuery(id: number): Promise<boolean> {
    // 삭제 전 존재 여부 확인
    const existsBefore = await this.getQuery(id);
    if (!existsBefore) return false;
    
    // 삭제 수행
    await db.delete(queries).where(eq(queries.id, id));
    
    // 삭제 후 존재 여부 확인
    const existsAfter = await this.getQuery(id);
    return !existsAfter;
  }

  async toggleQueryFavorite(id: number): Promise<Query | undefined> {
    await db
      .update(queries)
      .set({ 
        isFavorite: sql`NOT ${queries.isFavorite}`, 
        updatedAt: new Date() 
      })
      .where(eq(queries.id, id));
    
    // 업데이트 후 해당 레코드 조회
    return await this.getQuery(id);
  }

  async searchQueries(userId: string, searchTerm: string): Promise<Query[]> {
    const results = await db
      .select()
      .from(queries)
      .where(
        and(
          eq(queries.userId, userId),
          or(
            ilike(queries.naturalLanguage, `%${searchTerm}%`),
            ilike(queries.sqlQuery, `%${searchTerm}%`),
            ilike(queries.explanation, `%${searchTerm}%`)
          )
        )
      )
      .orderBy(desc(queries.createdAt));
    
    return results.map(query => ({
      ...query,
      executionResult: query.executionResult as any
    })) as Query[];
  }

  // Shared Query operations
  async createSharedQuery(sharedQuery: InsertSharedQuery): Promise<SharedQuery> {
    return await db.transaction(async (tx) => {
      await tx.insert(sharedQueries).values(sharedQuery);
      
      // shareId는 unique하므로 바로 조회 가능
      const [newSharedQuery] = await tx
        .select()
        .from(sharedQueries)
        .where(eq(sharedQueries.shareId, sharedQuery.shareId))
        .limit(1);
      
      return newSharedQuery;
    });
  }

  async getSharedQuery(shareId: string): Promise<SharedQuery | undefined> {
    const [sharedQuery] = await db
      .select()
      .from(sharedQueries)
      .where(
        and(
          eq(sharedQueries.shareId, shareId),
          eq(sharedQueries.isActive, true),
          or(
            isNull(sharedQueries.expiresAt),
            sql`${sharedQueries.expiresAt} > NOW()`
          )
        )
      );
    return sharedQuery;
  }

  async getSharedQueryWithQuery(shareId: string): Promise<(SharedQuery & { query: Query }) | undefined> {
    const [result] = await db
      .select()
      .from(sharedQueries)
      .innerJoin(queries, eq(sharedQueries.queryId, queries.id))
      .where(
        and(
          eq(sharedQueries.shareId, shareId),
          eq(sharedQueries.isActive, true),
          or(
            isNull(sharedQueries.expiresAt),
            sql`${sharedQueries.expiresAt} > NOW()`
          )
        )
      );
    
    if (!result) return undefined;
    
    return {
      ...result.shared_queries,
      query: {
        ...result.queries,
        executionResult: result.queries.executionResult as any
      } as Query,
    };
  }

  async deactivateSharedQuery(shareId: string): Promise<boolean> {
    // 업데이트 전 존재하는 활성 쿼리인지 확인
    const existsBefore = await this.getSharedQuery(shareId);
    if (!existsBefore) return false;
    
    // 비활성화 수행
    await db
      .update(sharedQueries)
      .set({ isActive: false })
      .where(eq(sharedQueries.shareId, shareId));
    
    // 업데이트 후 확인 (비활성화되어 getSharedQuery에서 조회되지 않아야 함)
    const existsAfter = await this.getSharedQuery(shareId);
    return !existsAfter;
  }

  async cleanupExpiredSharedQueries(): Promise<number> {
    // 만료된 쿼리들을 먼저 조회
    const expiredQueries = await db
      .select({ id: sharedQueries.id })
      .from(sharedQueries)
      .where(
        and(
          eq(sharedQueries.isActive, true),
          sql`${sharedQueries.expiresAt} <= NOW()`
        )
      );
    
    if (expiredQueries.length === 0) return 0;
    
    // 만료된 쿼리들을 비활성화
    await db
      .update(sharedQueries)
      .set({ isActive: false })
      .where(
        and(
          eq(sharedQueries.isActive, true),
          sql`${sharedQueries.expiresAt} <= NOW()`
        )
      );
    
    return expiredQueries.length;
  }
}

export const storage = new DatabaseStorage();