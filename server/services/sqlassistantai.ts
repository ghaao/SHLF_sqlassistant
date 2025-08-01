// sqlassistantai.ts 수정

import { SQLGenerationRequest, SQLGenerationResponse } from "@shared/schema";

// 내부 AI API 설정 - Dify API 스트리밍 형식에 맞춤
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || "http://10.172.33.161:18020/v1/chat-messages";

interface DifyAPIRequest {
  inputs: Record<string, any>;
  query: string;
  response_mode: "streaming";
  conversation_id?: string;
  user: string;
}

interface DifyStreamingResponse {
  event: 'message' | 'message_end' | 'error' | 'ping';
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  created_at?: number;
  error?: string;
}

export class SQLAssistantAIService {
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
      console.log("🤖 SQL Assistant AI로 SQL 생성 중...", request.naturalLanguage);
      
      const query = this.buildSQLGenerationPrompt(request);
      const response = await this.callDifyStreamingAPI(query, this.apiKeys.sqlCreation);
      
      if (!response) {
        throw new Error("AI 응답이 비어있습니다");
      }

      // AI 응답 파싱
      const result = this.parseSQLResponse(response, request.dialect);
      
      return result;
    } catch (error) {
      console.error("SQL Assistant AI SQL 생성 오류:", error);
      throw new Error("SQL 쿼리 생성에 실패했습니다: " + (error as Error).message);
    }
  }

  /**
   * SQL 설명 생성
   */
  async explainSQL(sqlQuery: string, dialect: string): Promise<string> {
    try {
      console.log("📖 SQL Assistant AI로 SQL 설명 생성 중...");
      
      const query = `다음 ${dialect} SQL 쿼리를 한국어로 자세히 설명해주세요:\n\n${sqlQuery}`;
      const response = await this.callDifyStreamingAPI(query, this.apiKeys.sqlExplanation);
      
      return response || "SQL 쿼리 설명을 생성할 수 없습니다.";
    } catch (error) {
      console.error("SQL Assistant AI SQL 설명 오류:", error);
      throw new Error("SQL 설명 생성에 실패했습니다: " + (error as Error).message);
    }
  }

  /**
   * SQL 문법 검증 및 교정
   */
  async validateSQLGrammar(sqlQuery: string, dialect: string): Promise<string> {
    try {
      console.log("✅ SQL Assistant AI로 SQL 문법 검증 중...");
      
      const query = `다음 ${dialect} SQL 쿼리의 문법을 검증하고 필요시 교정해주세요. 교정된 SQL만 응답해주세요:\n\n${sqlQuery}`;
      const response = await this.callDifyStreamingAPI(query, this.apiKeys.sqlGrammar);
      
      return this.extractSQLFromResponse(response || sqlQuery);
    } catch (error) {
      console.error("SQL Assistant AI SQL 문법 검증 오류:", error);
      return sqlQuery; // 오류시 원본 반환
    }
  }

  /**
   * SQL 주석 추가
   */
  async addSQLComments(sqlQuery: string, dialect: string): Promise<string> {
    try {
      console.log("💬 SQL Assistant AI로 SQL 주석 추가 중...");
      
      const query = `다음 ${dialect} SQL 쿼리에 한국어 주석을 추가해주세요:\n\n${sqlQuery}`;
      const response = await this.callDifyStreamingAPI(query, this.apiKeys.sqlComment);
      
      return this.extractSQLFromResponse(response || sqlQuery);
    } catch (error) {
      console.error("SQL Assistant AI SQL 주석 추가 오류:", error);
      return sqlQuery;
    }
  }

  /**
   * SQL 방언 변환
   */
  async convertSQLDialect(sqlQuery: string, fromDialect: string, toDialect: string): Promise<string> {
    try {
      console.log(`🔄 SQL Assistant AI로 SQL 변환 중: ${fromDialect} → ${toDialect}`);
      
      const query = `다음 ${fromDialect} SQL을 ${toDialect}로 변환해주세요:\n\n${sqlQuery}`;
      const response = await this.callDifyStreamingAPI(query, this.apiKeys.sqlTransformation);
      
      return this.extractSQLFromResponse(response || sqlQuery);
    } catch (error) {
      console.error("SQL Assistant AI SQL 변환 오류:", error);
      throw new Error("SQL 방언 변환에 실패했습니다: " + (error as Error).message);
    }
  }

  /**
   * SQL 생성 프롬프트 구축
   */
  private buildSQLGenerationPrompt(request: SQLGenerationRequest): string {
    let prompt = `자연어 요청을 ${request.dialect} SQL 쿼리로 변환해주세요.

요청: ${request.naturalLanguage}

응답 형식:
SQL: [생성된 SQL 쿼리]
설명: [한국어로 쿼리 설명]
신뢰도: [0-1 사이의 숫자]`;

    if (request.schemaData) {
      prompt += `\n\n데이터베이스 스키마:\n${JSON.stringify(request.schemaData, null, 2)}`;
    }

    return prompt;
  }

  /**
   * SQL 응답 파싱
   */
  private parseSQLResponse(response: string, dialect: string): SQLGenerationResponse {
    try {
      // 응답에서 SQL, 설명, 신뢰도 추출
      const sqlMatch = response.match(/SQL:\s*([\s\S]*?)(?=\n설명:|$)/i);
      const explanationMatch = response.match(/설명:\s*([\s\S]*?)(?=\n신뢰도:|$)/i);
      const confidenceMatch = response.match(/신뢰도:\s*([0-9.]+)/i);

      const sqlQuery = sqlMatch ? sqlMatch[1].trim() : response;
      const explanation = explanationMatch ? explanationMatch[1].trim() : "SQL 쿼리가 생성되었습니다.";
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8;

      return {
        sqlQuery: this.cleanSQL(sqlQuery),
        explanation,
        dialect,
        confidence: Math.max(0, Math.min(1, confidence)),
      };
    } catch (error) {
      console.error("SQL 응답 파싱 오류:", error);
      return {
        sqlQuery: this.extractSQLFromResponse(response),
        explanation: "SQL 쿼리가 생성되었습니다.",
        dialect,
        confidence: 0.7,
      };
    }
  }

  /**
   * 응답에서 SQL 추출
   */
  private extractSQLFromResponse(response: string): string {
    // SQL 코드 블록 추출
    const sqlBlockMatch = response.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
    if (sqlBlockMatch) {
      return this.cleanSQL(sqlBlockMatch[1]);
    }

    // SQL: 로 시작하는 부분 추출
    const sqlLineMatch = response.match(/SQL:\s*([\s\S]*?)(?=\n|$)/i);
    if (sqlLineMatch) {
      return this.cleanSQL(sqlLineMatch[1]);
    }

    return this.cleanSQL(response);
  }

  /**
   * SQL 정리
   */
  private cleanSQL(sql: string): string {
    return sql
      .replace(/^```(?:sql)?\s*/i, '')
      .replace(/\s*```$/, '')
      .replace(/^SQL:\s*/i, '')
      .trim();
  }

  /**
   * Dify Streaming API 호출
   */
  private async callDifyStreamingAPI(query: string, apiKey: string): Promise<string> {
    try {
      console.log(`🌐 Dify Streaming API 호출: ${AI_API_BASE_URL}`);
      
      const payload: DifyAPIRequest = {
        inputs: {},
        query: query,
        response_mode: "streaming",  // streaming 모드 사용
        conversation_id: "",
        user: "sql-assistant-user"
      };

      const response = await fetch(AI_API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
        inputs: {},
        query: query,
        response_mode: "streaming",
        conversation_id: "",
        user: "sql-assistant-user"
      }),
    });

      if (!response.ok) {
      throw new Error('API 호출 실패 (${response.status}): ${await response.text()}');
      }

      return await this.handleStreamingResponse(response);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('네트워크 연결을 확인해주세요');
      }
      throw error;
    }
  }

  /**
   * 스트리밍 응답 처리
   */
  private async handleStreamingResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("응답 스트림을 읽을 수 없습니다");
    }

    const decoder = new TextDecoder();
    let fullAnswer = '';
    let isComplete = false;

    try {
      while (!isComplete) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as DifyStreamingResponse;
              
              if (data.event === 'message' && data.answer) {
                fullAnswer += data.answer;
              }
              
              if (data.event === 'message_end') {
                isComplete = true;
                break;
              }
            } catch (parseError) {
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullAnswer;
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

// 기존 InternalAIService는 제거하고 SQLAssistantAIService만 사용
export const internalAIService = new SQLAssistantAIService();