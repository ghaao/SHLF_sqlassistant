import { SQLGenerationRequest, SQLGenerationResponse } from "@shared/schema";

// 내부 AI API 설정
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || "http://your-internal-ai-server";

interface InternalAIResponse {
  result?: string;
  explanation?: string;
  confidence?: number;
  error?: string;
}

export class InternalAIService {
  private apiKeys = {
    sqlCreation: process.env.SQL_ASSISTANT_API_KEY_SQL_CREATION || "",
    sqlExplanation: process.env.SQL_ASSISTANT_API_KEY_SQL_EXPLANATION || "",
    sqlComment: process.env.SQL_ASSISTANT_API_KEY_SQL_COMMENT || "",
    sqlTransformation: process.env.SQL_ASSISTANT_API_KEY_SQL_TRANSFORMATION || "",
    sqlGrammar: process.env.SQL_ASSISTANT_API_KEY_SQL_GRAMMAR || "",
  };

  /**
   * 자연어를 SQL로 변환
   */
  async generateSQL(request: SQLGenerationRequest): Promise<SQLGenerationResponse> {
    try {
      console.log("🤖 내부 AI로 SQL 생성 중...", request.naturalLanguage);
      
      const payload = {
        query: request.naturalLanguage,
        dialect: request.dialect,
        schema: request.schemaData,
      };

      const response = await this.callInternalAPI('sql-creation', payload, this.apiKeys.sqlCreation);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // SQL 문법 검증
      const validatedSQL = await this.validateSQLGrammar(response.result || "", request.dialect);
      
      // 설명 생성
      const explanation = await this.generateExplanation(validatedSQL, request.dialect);

      return {
        sqlQuery: validatedSQL,
        explanation: explanation,
        dialect: request.dialect,
        confidence: response.confidence || 0.8,
      };
    } catch (error) {
      console.error("내부 AI SQL 생성 오류:", error);
      throw new Error("SQL 쿼리 생성에 실패했습니다: " + (error as Error).message);
    }
  }

  /**
   * SQL 설명 생성
   */
  async explainSQL(sqlQuery: string, dialect: string): Promise<string> {
    try {
      console.log("📖 내부 AI로 SQL 설명 생성 중...");
      
      const payload = {
        sql_query: sqlQuery,
        dialect: dialect,
        language: "korean", // 한국어 설명 요청
      };

      const response = await this.callInternalAPI('sql-explanation', payload, this.apiKeys.sqlExplanation);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return response.explanation || "SQL 쿼리 설명을 생성할 수 없습니다.";
    } catch (error) {
      console.error("내부 AI SQL 설명 오류:", error);
      throw new Error("SQL 설명 생성에 실패했습니다: " + (error as Error).message);
    }
  }

  /**
   * SQL 문법 검증 및 교정
   */
  async validateSQLGrammar(sqlQuery: string, dialect: string): Promise<string> {
    try {
      console.log("✅ 내부 AI로 SQL 문법 검증 중...");
      
      const payload = {
        sql_query: sqlQuery,
        dialect: dialect,
      };

      const response = await this.callInternalAPI('sql-grammar', payload, this.apiKeys.sqlGrammar);
      
      if (response.error) {
        console.warn("SQL 문법 검증 실패, 원본 반환:", response.error);
        return sqlQuery; // 검증 실패시 원본 반환
      }

      return response.result || sqlQuery;
    } catch (error) {
      console.error("내부 AI SQL 문법 검증 오류:", error);
      return sqlQuery; // 오류시 원본 반환
    }
  }

  /**
   * SQL 주석 추가
   */
  async addSQLComments(sqlQuery: string, dialect: string): Promise<string> {
    try {
      console.log("💬 내부 AI로 SQL 주석 추가 중...");
      
      const payload = {
        sql_query: sqlQuery,
        dialect: dialect,
        language: "korean",
      };

      const response = await this.callInternalAPI('sql-comment', payload, this.apiKeys.sqlComment);
      
      if (response.error) {
        return sqlQuery; // 주석 추가 실패시 원본 반환
      }

      return response.result || sqlQuery;
    } catch (error) {
      console.error("내부 AI SQL 주석 추가 오류:", error);
      return sqlQuery;
    }
  }

  /**
   * SQL 방언 변환
   */
  async convertSQLDialect(sqlQuery: string, fromDialect: string, toDialect: string): Promise<string> {
    try {
      console.log(`🔄 내부 AI로 SQL 변환 중: ${fromDialect} → ${toDialect}`);
      
      const payload = {
        sql_query: sqlQuery,
        from_dialect: fromDialect,
        to_dialect: toDialect,
      };

      const response = await this.callInternalAPI('sql-transformation', payload, this.apiKeys.sqlTransformation);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return response.result || sqlQuery;
    } catch (error) {
      console.error("내부 AI SQL 변환 오류:", error);
      throw new Error("SQL 방언 변환에 실패했습니다: " + (error as Error).message);
    }
  }

  /**
   * 설명 생성 (내부 메서드)
   */
  private async generateExplanation(sqlQuery: string, dialect: string): Promise<string> {
    try {
      const explanation = await this.explainSQL(sqlQuery, dialect);
      return explanation;
    } catch (error) {
      console.error("설명 생성 실패:", error);
      return "이 SQL 쿼리는 요청하신 데이터를 조회합니다.";
    }
  }

  /**
   * 내부 AI API 호출
   */
  private async callInternalAPI(endpoint: string, payload: any, apiKey: string): Promise<InternalAIResponse> {
    try {
      const url = `${AI_API_BASE_URL}/${endpoint}`;
      
      console.log(`🌐 내부 AI API 호출: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 호출 실패 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`내부 AI API 호출 오류 (${endpoint}):`, error);
      return {
        error: `내부 AI 서비스 오류: ${(error as Error).message}`,
      };
    }
  }

  /**
   * API 키 유효성 검사
   */
  validateAPIKeys(): { isValid: boolean; missingKeys: string[] } {
    const missingKeys: string[] = [];
    
    Object.entries(this.apiKeys).forEach(([key, value]) => {
      if (!value || value.trim() === "") {
        missingKeys.push(key);
      }
    });

    return {
      isValid: missingKeys.length === 0,
      missingKeys,
    };
  }
}

export const internalAIService = new InternalAIService();