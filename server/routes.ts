import type { Express, Request, Response, RequestHandler } from "express";
import { type Server, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { SessionData } from "express-session";
import { storage } from "./storage";
import { internalAIService, SQLAssistantAIService } from "./services/sqlassistantai";
import { generateLogId } from "./utils";
import { nanoid } from "nanoid";
import { exec } from "child_process";

// 프론트엔드에서 보내는 데이터의 타입을 정의
interface SQLGenerationRequest {
  naturalLanguage: string;
  dialect: string;
  cvrsId: string | null;
  cvrsSeq: number;
  schemaData?: any;
}

// WebSocket 객체에 session 정보를 포함하도록 타입을 확장
interface WebSocketWithSession extends WebSocket {
  session?: SessionData;
}

// registerRoutes가 Express 앱 대신 http.Server 인스턴스를 받도록 변경
export async function registerRoutes(httpServer: Server, app: Express, sessionParser: RequestHandler): Promise<Server> {
  const wss = new WebSocketServer({ noServer: true });

  // upgrade 핸들러 내부에서 sessionParser를 먼저 실행
  httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
    // 1. 먼저 세션 미들웨어를 수동으로 실행하여 request 객체에 session 정보를 채웁니다.
    sessionParser(request as Request, {} as Response, () => {
      // 2. 세션 정보가 정상적으로 채워졌는지 확인합니다.
      // @ts-ignore
      if (request.session) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          const wsWithSession = ws as WebSocketWithSession;
          // @ts-ignore
          wsWithSession.session = request.session;
          wss.emit('connection', wsWithSession, request);
        });
      } else {
        // 세션 정보가 없거나 유효하지 않으면 연결을 거부합니다.
        console.log('WebSocket connection rejected: No valid session found.');
        socket.destroy();
      }
    });
  });
  
  // SQL 포맷팅을 위한 API 엔드포인트
  app.post('/api/format-sql', (req, res) => {
    const unformattedSql = req.body.sql;

    if (!unformattedSql || typeof unformattedSql !== 'string') {
      return res.status(400).json({ error: 'SQL to format must be a non-empty string.' });
    }

    // Java Wrapper를 실행할 명령어
    // -cp 옵션으로 jar파일과 클래스 파일이 있는 폴더를 모두 지정합니다.
    const command = `java -cp "java:java/SQLinForm_API.jar" FormatterWrapper`;

    // 자식 프로세스를 생성하여 Java 코드를 실행합니다.
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        // stderr에 담긴 Java 오류를 클라이언트에 전달
        return res.status(500).json({ error: stderr || 'Failed to format SQL.' });
      }

      // 성공 시, 포맷팅된 SQL(stdout)을 응답으로 보냅니다.
      res.json({ formattedSql: stdout });
    });

    // Node.js에서 받은 SQL을 Java 프로세스의 표준 입력(stdin)으로 전달합니다.
    if (child.stdin) {
      child.stdin.write(unformattedSql);
      child.stdin.end();
    }
  });

  // --- WebSocket 로직 ---
  const activeRequests = new Map<string, boolean>();

  wss.on('connection', (ws: WebSocketWithSession) => {
    console.log('WebSocket client connected with session');
    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'generate_sql') {
          await handleGenerateSQL(ws, data);
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });
    // 연결이 끊어지면 해당 클라이언트의 활성 요청들을 정리
    // 실제 구현에서는 클라이언트별 요청 추적이 필요
    ws.on('close', () => console.log('WebSocket client disconnected'));
  });

  // WebSocket message handlers
  async function handleGenerateSQL(ws: WebSocketWithSession, data: any) {
    const requestId = data.requestId || `req_${Date.now()}`;
    activeRequests.set(requestId, true);
    
    // 1. 세션 정보 가져오기
    const session = ws.session;
    if (!session || !session.loggedIn || !session.sqlAstntLogiLogId) {
      ws.send(JSON.stringify({ type: 'error', message: '인증되지 않은 요청입니다. 다시 로그인해주세요.' }));
      return;
    }

    try {
      const request: SQLGenerationRequest = data.payload;
      const mode = (data.mode || 'create') as keyof SQLAssistantAIService['apiKeys'];
      
      if (!activeRequests.get(requestId)) return;

      // 2. 대화 ID 및 순번 관리
      const cvrsId = data.cvrsId || `cvrs_${Date.now()}_${nanoid(8)}`;
      let cvrsSeq = data.cvrsSeq || 0;

      // 3. 사용자 질문 로그 기록
      cvrsSeq++;
      await storage.createCvrsLog({
        sqlAstntCvrsLogId: generateLogId(),
        cvrsId: cvrsId,
        cvrsSeq: cvrsSeq,
        cvrsMnboCd: 'USER',
        sqlAstntLogiLogId: session.sqlAstntLogiLogId,
        cvrsDt: new Date(),
        aiFncCd: mode,
        cvrsCt: request.naturalLanguage,
        systRgiDt: new Date(),
        systRgiPrafNo: session.prafNo,
        systRgiOgnzNo: session.ognzNo,
        systRgiSystCd: "ISA",
        systRgiPrgrId: "SQL Assistant",
        systChgDt: new Date(),
        systChgPrafNo: session.prafNo,
        systChgOgnzNo: session.ognzNo,
        systChgSystCd: "ISA",
        systChgPrgrId: "SQL Assistant",
      });

      // AI 서비스 호출
      const aiResponseText = await internalAIService.processRequest(mode, request.naturalLanguage, request.schemaData);

      if (!activeRequests.get(requestId)) return;

      // 4. AI 답변 로그 기록
      cvrsSeq++;
      await storage.createCvrsLog({
        sqlAstntCvrsLogId: generateLogId(),
        cvrsId,
        cvrsSeq,
        cvrsMnboCd: 'AI',
        sqlAstntLogiLogId: session.sqlAstntLogiLogId,
        cvrsDt: new Date(),
        aiFncCd: mode,
        cvrsCt: aiResponseText,
        systRgiDt: new Date(),
        systRgiPrafNo: session.prafNo,
        systRgiOgnzNo: session.ognzNo,
        systRgiSystCd: "ISA",
        systRgiPrgrId: "SQL Assistant",
        systChgDt: new Date(),
        systChgPrafNo: session.prafNo,
        systChgOgnzNo: session.ognzNo,
        systChgSystCd: "ISA",
        systChgPrgrId: "SQL Assistant",
      });
      
      // 프론트엔드로 답변 전송
      const resultPayload = {
        mode, 
        responseText: aiResponseText,
        cvrsId, // 다음 요청에 사용하도록 클라이언트에 전달
        cvrsSeq // 현재까지의 순번 전달
      };
      
      ws.send(JSON.stringify({
        type: 'ai_response',
        payload: resultPayload,
        requestId: requestId,
      }));

    } catch (error) {
      console.error(`Request ${requestId} failed:`, error);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'AI 요청 처리 중 오류가 발생했습니다: ' + (error as Error).message,
          requestId: requestId
        }));
      }
    } finally {
      activeRequests.delete(requestId);
    }
  }

  return httpServer;
}