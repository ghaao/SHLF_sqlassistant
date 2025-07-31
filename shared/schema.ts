import { mysqlTable, text, int, boolean, timestamp, json, varchar, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// [추가] SQL Assistant 접속 로그 테이블
export const ztSqlAstntLogiLog = mysqlTable("ZT_SQL_ASTNT_LOGI_LOG", {
  sqlAstntLogiLogId: varchar("SQL_ASTNT_LOGI_LOG_ID", { length: 26 }).primaryKey(),
  prafNo: varchar("PRAF_NO", { length: 8 }).notNull(),  
  logiDt: timestamp("LOGI_DT").notNull(),
  systRgiDt: timestamp("SYST_RGI_DT").notNull(),
  systRgiPrafNo: varchar("SYST_RGI_PRAF_NO", { length: 8 }).notNull(),
  systRgiOgnzNo: varchar("SYST_RGI_OGNZ_NO", { length: 7 }).notNull(),
  systRgiSystCd: varchar("SYST_RGI_SYST_CD", { length: 3 }).notNull(),
  systRgiPrgrId: varchar("SYST_RGI_PRGR_ID", { length: 100 }).notNull(),
  systChgDt: timestamp("SYST_CHG_DT").notNull(),
  systChgPrafNo: varchar("SYST_CHG_PRAF_NO", { length: 8 }).notNull(),
  systChgOgnzNo: varchar("SYST_CHG_OGNZ_NO", { length: 7 }).notNull(),
  systChgSystCd: varchar("SYST_CHG_SYST_CD", { length: 3 }).notNull(),
  systChgPrgrId: varchar("SYST_CHG_PRGR_ID", { length: 100 }).notNull(),
});

// Session storage table for authentication
export const sessions = mysqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().notNull(),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Database schemas table
export const databaseSchemas = mysqlTable("database_schemas", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  dialect: text("dialect").notNull(), // mysql, postgresql, sqlite, etc.
  schemaData: json("schema_data").notNull(), // JSON representation of schema
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Queries table
export const queries = mysqlTable("queries", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id),
  schemaId: int("schema_id").references(() => databaseSchemas.id),
  naturalLanguage: text("natural_language").notNull(),
  sqlQuery: text("sql_query").notNull(),
  explanation: text("explanation"),
  dialect: text("dialect").notNull(),
  executionResult: json("execution_result"),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shared queries table
export const sharedQueries = mysqlTable("shared_queries", {
  id: int("id").primaryKey().autoincrement(),
  queryId: int("query_id").references(() => queries.id),
  shareId: varchar("share_id", { length: 255 }).notNull().unique(), // TEXT → VARCHAR로 변경
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  queries: many(queries),
  schemas: many(databaseSchemas),
}));

export const databaseSchemasRelations = relations(databaseSchemas, ({ one, many }) => ({
  user: one(users, {
    fields: [databaseSchemas.userId],
    references: [users.id],
  }),
  queries: many(queries),
}));

export const queriesRelations = relations(queries, ({ one, many }) => ({
  user: one(users, {
    fields: [queries.userId],
    references: [users.id],
  }),
  schema: one(databaseSchemas, {
    fields: [queries.schemaId],
    references: [databaseSchemas.id],
  }),
  sharedQueries: many(sharedQueries),
}));

export const sharedQueriesRelations = relations(sharedQueries, ({ one }) => ({
  query: one(queries, {
    fields: [sharedQueries.queryId],
    references: [queries.id],
  }),
}));


/* Insert schemas */
// [추가] 로그 삽입을 위한 타입 정의
export type InsertLoginLog = typeof ztSqlAstntLogiLog.$inferInsert;
export const insertUserSchema = createInsertSchema(users);
export const insertDatabaseSchemaSchema = createInsertSchema(databaseSchemas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertQuerySchema = createInsertSchema(queries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSharedQuerySchema = createInsertSchema(sharedQueries).omit({
  id: true,
  createdAt: true,
});

// Select schemas
export const selectUserSchema = createSelectSchema(users);
export const selectDatabaseSchemaSchema = createSelectSchema(databaseSchemas);
export const selectQuerySchema = createSelectSchema(queries);
export const selectSharedQuerySchema = createSelectSchema(sharedQueries);

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;
export type InsertDatabaseSchema = z.infer<typeof insertDatabaseSchemaSchema>;
export type DatabaseSchema = z.infer<typeof selectDatabaseSchemaSchema>;
export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = z.infer<typeof selectQuerySchema>;
export type InsertSharedQuery = z.infer<typeof insertSharedQuerySchema>;
export type SharedQuery = z.infer<typeof selectSharedQuerySchema>;

// API request/response types
export interface SQLGenerationRequest {
  naturalLanguage: string;
  dialect: string;
  schemaId?: number;
  schemaData?: any;
}

export interface SQLGenerationResponse {
  sqlQuery: string;
  explanation: string;
  dialect: string;
  confidence: number;
}

export interface QueryExecutionRequest {
  sqlQuery: string;
  dialect: string;
  schemaId?: number;
}

export interface QueryExecutionResponse {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime: number;
  rowCount?: number;
}

export interface ShareQueryRequest {
  queryId: number;
  expiresAt?: Date;
}

export interface ShareQueryResponse {
  shareId: string;
  shareUrl: string;
  expiresAt?: Date;
}