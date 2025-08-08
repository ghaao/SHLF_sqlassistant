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
    create: process.env.SQL_ASSISTANT_API_KEY_SQL_CREATION || "",
    explain: process.env.SQL_ASSISTANT_API_KEY_SQL_EXPLANATION || "",
    comment: process.env.SQL_ASSISTANT_API_KEY_SQL_COMMENT || "",
    transform: process.env.SQL_ASSISTANT_API_KEY_SQL_TRANSFORMATION || "",
    grammar: process.env.SQL_ASSISTANT_API_KEY_SQL_GRAMMAR || "",
  };


  // 모든 AI 기능 요청을 처리하는 단일 메소드
  async processRequest(
    mode: keyof typeof this.apiKeys,
    userQuery: string,
    schemaData?: any
  ): Promise<string> {
    try {
      console.log(`🤖 SQL Assistant AI (${mode}) 처리 중...`);

      let finalQuery = userQuery;
      if (schemaData) {
        finalQuery += `\n\n### 데이터베이스 스키마:\n${JSON.stringify(schemaData, null, 2)}`;
      }

      const apiKey = this.apiKeys[mode];
      if (!apiKey) throw new Error(`${mode}에 대한 API 키가 없습니다.`);

      // AI의 답변을 그대로 반환합니다.
      return await this.callDifyStreamingAPI(finalQuery, apiKey);

    } catch (error) {
      console.error(`SQL Assistant AI (${mode}) 오류:`, error);
      throw new Error(`${mode} 요청 처리 실패: ${(error as Error).message}`);
    }
  }

  /**
   * Dify Streaming API 호출
   */
  private async callDifyStreamingAPI(query: string, apiKey: string): Promise<string> {
    try {
      console.log(`🌐 Dify Streaming API 호출: ${AI_API_BASE_URL}`);
      
      const payload: DifyAPIRequest = {
        inputs: {}, // 프롬프트가 내부 정의되어 있으므로 비워둠
        query: query,
        response_mode: "streaming",
        user: "sql-assistant-user"
      };

      const response = await fetch(AI_API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
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