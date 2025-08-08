import { mysqlTable, text, int, boolean, timestamp, json, varchar, index } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// SQL Assistant 접속 로그 테이블
export const ztSqlAstntLogiLog = mysqlTable("ZT_SQL_ASTNT_LOGI_LOG", {
  sqlAstntLogiLogId: varchar("SQL_ASTNT_LOGI_LOG_ID", { length: 26 }).primaryKey(),
  prafNo: varchar("PRAF_NO", { length: 8 }).notNull(),
  logiDt: timestamp("LOGI_DT").notNull(),
  logiIpAddr: varchar("LOGI_IP_ADDR", { length: 40 }), // IP 주소를 저장할 컬럼
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
}, (table) => ({
    logiDtIndex: index("logi_dt_idx").on(table.logiDt),
}));

// SQL Assistant 대화(CVRS) 로그 테이블
export const ztSqlAstntCvrsLog = mysqlTable("ZT_SQL_ASTNT_CVRS_LOG", {
  sqlAstntCvrsLogId: varchar("SQL_ASTNT_CVRS_LOG_ID", { length: 26 }).primaryKey(),
  sqlAstntLogiLogId: varchar("SQL_ASTNT_LOGI_LOG_ID", { length: 26 }).notNull(),
  aiFncCd: varchar("AI_FNC_CD", { length: 20 }).notNull(),
  cvrsId: varchar("CVRS_ID", { length: 30 }).notNull(),
  cvrsSeq: int("CVRS_SEQ").notNull(),
  cvrsMnboCd: varchar("CVRS_MNBO_CD", { length: 10 }).notNull(), // 'USER', 'AI'
  cvrsDt: timestamp("CVRS_DT").notNull(),
  cvrsCt: text("CVRS_CT"),
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
}, (table) => ({
    cvrsIdSeqIndex: index("cvrs_id_seq_idx").on(table.cvrsId, table.cvrsSeq),
    cvrsDtIndex: index("cvrs_dt_idx").on(table.cvrsDt),
}));

/* Insert schemas */
// [추가] 로그 삽입을 위한 타입 정의
export type InsertLoginLog = typeof ztSqlAstntLogiLog.$inferInsert;
export type InsertCvrsLog = typeof ztSqlAstntCvrsLog.$inferInsert;