import {
  ztSqlAstntLogiLog,
  ztSqlAstntCvrsLog,
  type InsertLoginLog,
  type InsertCvrsLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql, isNull } from "drizzle-orm";

export interface IStorage {
  // 로그인 로그 생성
  createLoginLog(logData: InsertLoginLog): Promise<void>;
  createCvrsLog(logData: InsertCvrsLog): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  /**
   * SQL Assistant 접속 로그를 생성합니다.
   */
  async createLoginLog(logData: InsertLoginLog): Promise<void> {
    await db.insert(ztSqlAstntLogiLog).values(logData);
    console.log(`📝 로그인 로그 기록 완료: PRAF_NO=${logData.prafNo}`);
  }

  /**
   * SQL Assistant 대화(CVRS) 로그를 생성합니다.
   */
  async createCvrsLog(logData: InsertCvrsLog): Promise<void> {
    await db.insert(ztSqlAstntCvrsLog).values(logData);
    // 오타 수정: cvsSeq -> cvrsSeq
    console.log(`📝 대화 로그 기록 완료: CVRS_ID=${logData.cvrsId}, SEQ=${logData.cvrsSeq}`);
  }
}

export const storage = new DatabaseStorage();