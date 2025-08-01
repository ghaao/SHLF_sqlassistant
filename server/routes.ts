import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { internalAIService } from "./services/sqlassistantai"; // 올바른 import 추가
import { queryExecutor } from "./services/queryExecutor";
import { seedDatabase } from "./seedData";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  insertDatabaseSchemaSchema,
  insertQuerySchema,
  insertSharedQuerySchema,
  type SQLGenerationRequest,
  type QueryExecutionRequest,
  type ShareQueryRequest,
} from "@shared/schema";
import { exec } from "child_process";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // API 키 검증
  const keyValidation = internalAIService.validateAPIKeys();
  if (!keyValidation.isValid) {
    console.warn('일부 AI API 키가 누락되었습니다:', keyValidation.missingKeys);
  }
  
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

  const activeRequests = new Map<string, boolean>();

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'generate_sql':
            await handleGenerateSQL(ws, data);
            break;
          case 'execute_query':
            await handleExecuteQuery(ws, data);
            break;
          case 'explain_sql':
            await handleExplainSQL(ws, data);
            break;
          case 'cancel_request':
            handleCancelRequest(data.requestId);
            break;
          default:
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown message type: ' + data.type 
            }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message: ' + (error as Error).message 
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // 연결이 끊어지면 해당 클라이언트의 활성 요청들을 정리
      // 실제 구현에서는 클라이언트별 요청 추적이 필요
    });
  });

  // 요청 취소 핸들러
  function handleCancelRequest(requestId: string) {
    if (requestId && activeRequests.has(requestId)) {
      activeRequests.set(requestId, false); // 요청을 취소됨으로 표시
      console.log('Request cancelled:', requestId);
    }
  }

  // Schema management
  app.post('/api/schemas', async (req, res) => {
    try {
      const schemaData = insertDatabaseSchemaSchema.parse(req.body);
      const schema = await storage.createSchema(schemaData);
      res.json(schema);
    } catch (error) {
      res.status(400).json({ message: "Invalid schema data: " + (error as Error).message });
    }
  });

  app.get('/api/schemas', async (req, res) => {
    try {
      // For development, use a default user ID
      const userId = req.query.userId as string || "demo-user";
      
      const schemas = await storage.getUserSchemas(userId);
      res.json(schemas);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schemas: " + (error as Error).message });
    }
  });

  app.get('/api/schemas/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const schema = await storage.getSchema(id);
      
      if (!schema) {
        return res.status(404).json({ message: "Schema not found" });
      }
      
      res.json(schema);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schema: " + (error as Error).message });
    }
  });

  app.put('/api/schemas/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertDatabaseSchemaSchema.partial().parse(req.body);
      const schema = await storage.updateSchema(id, updates);
      
      if (!schema) {
        return res.status(404).json({ message: "Schema not found" });
      }
      
      res.json(schema);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data: " + (error as Error).message });
    }
  });

  app.delete('/api/schemas/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSchema(id);
      
      if (!success) {
        return res.status(404).json({ message: "Schema not found" });
      }
      
      res.json({ message: "Schema deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete schema: " + (error as Error).message });
    }
  });

  // Query management
  app.post('/api/queries', async (req, res) => {
    try {
      const queryData = insertQuerySchema.parse(req.body);
      const query = await storage.createQuery(queryData);
      res.json(query);
    } catch (error) {
      res.status(400).json({ message: "Invalid query data: " + (error as Error).message });
    }
  });

  app.get('/api/queries', async (req, res) => {
    try {
      // For development, use a default user ID
      const userId = req.query.userId as string || "demo-user";
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const search = req.query.search as string;
      
      let queries;
      if (search) {
        queries = await storage.searchQueries(userId, search);
      } else {
        queries = await storage.getUserQueries(userId, limit);
      }
      
      res.json(queries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queries: " + (error as Error).message });
    }
  });

  app.get('/api/queries/favorites', async (req, res) => {
    try {
      // For development, use a default user ID
      const userId = req.query.userId as string || "demo-user";
      
      const queries = await storage.getUserFavoriteQueries(userId);
      res.json(queries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorite queries: " + (error as Error).message });
    }
  });

  app.post('/api/queries/:id/favorite', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const query = await storage.toggleQueryFavorite(id);
      
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      res.json(query);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle favorite: " + (error as Error).message });
    }
  });

  app.delete('/api/queries/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteQuery(id);
      
      if (!success) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      res.json({ message: "Query deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete query: " + (error as Error).message });
    }
  });

  // SQL generation - 내부 AI 서비스 사용
  app.post('/api/sql/generate', async (req, res) => {
    try {
      const request = z.object({
        naturalLanguage: z.string().min(1),
        dialect: z.string().min(1),
        schemaId: z.number().optional(),
        schemaData: z.any().optional(),
        mode: z.enum(['create', 'explain', 'grammar', 'comment', 'transform']).default('create'),
      }).parse(req.body);
      
      let result;
      
      switch (request.mode) {
        case 'explain':
          const explanation = await internalAIService.explainSQL(request.naturalLanguage, request.dialect);
          result = { explanation };
          break;
        case 'grammar':
          const correctedSQL = await internalAIService.validateSQLGrammar(request.naturalLanguage, request.dialect);
          result = { sqlQuery: correctedSQL };
          break;
        case 'comment':
          const commentedSQL = await internalAIService.addSQLComments(request.naturalLanguage, request.dialect);
          result = { sqlQuery: commentedSQL };
          break;
        case 'transform':
          const transformedSQL = await internalAIService.convertSQLDialect(request.naturalLanguage, 'mysql', request.dialect);     
          result = { sqlQuery: transformedSQL };
          break;
        case 'create':
        default:
          result = await internalAIService.generateSQL(request);
          break;
      }
      
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to generate SQL: " + (error as Error).message });
    }
  });

  app.post('/api/sql/explain', async (req, res) => {
    try {
      const { sqlQuery, dialect } = z.object({
        sqlQuery: z.string().min(1),
        dialect: z.string().min(1),
      }).parse(req.body);
      
      const explanation = await internalAIService.explainSQL(sqlQuery, dialect);
      res.json({ explanation });
    } catch (error) {
      res.status(400).json({ message: "Failed to explain SQL: " + (error as Error).message });
    }
  });

  app.post('/api/sql/convert', async (req, res) => {
    try {
      const { sqlQuery, fromDialect, toDialect } = z.object({
        sqlQuery: z.string().min(1),
        fromDialect: z.string().min(1),
        toDialect: z.string().min(1),
      }).parse(req.body);
      
      const convertedQuery = await internalAIService.convertSQLDialect(sqlQuery, fromDialect, toDialect);
      res.json({ convertedQuery });
    } catch (error) {
      res.status(400).json({ message: "Failed to convert SQL: " + (error as Error).message });
    }
  });

  app.post('/api/sql/comment', async (req, res) => {
    try {
      const { sqlQuery, dialect } = z.object({
        sqlQuery: z.string().min(1),
        dialect: z.string().min(1),
      }).parse(req.body);
      
      const commentedQuery = await internalAIService.addSQLComments(sqlQuery, dialect);
      res.json({ commentedQuery });
    } catch (error) {
      res.status(400).json({ message: "Failed to add comments to SQL: " + (error as Error).message });
    }
  });

  // Query execution
  app.post('/api/sql/execute', async (req, res) => {
    try {
      const request = z.object({
        sqlQuery: z.string().min(1),
        dialect: z.string().min(1),
        schemaId: z.number().optional(),
      }).parse(req.body);
      
      const result = await queryExecutor.executeQuery(request);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to execute query: " + (error as Error).message });
    }
  });

  app.post('/api/sql/validate', async (req, res) => {
    try {
      const { sqlQuery, dialect } = z.object({
        sqlQuery: z.string().min(1),
        dialect: z.string().min(1),
      }).parse(req.body);
      
      const result = await queryExecutor.validateQuery(sqlQuery, dialect);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to validate query: " + (error as Error).message });
    }
  });

  // Query sharing
  app.post('/api/queries/:id/share', async (req, res) => {
    try {
      const queryId = parseInt(req.params.id);
      const { expiresAt } = z.object({
        expiresAt: z.string().optional(),
      }).parse(req.body);
      
      const shareId = nanoid(16);
      const sharedQuery = await storage.createSharedQuery({
        queryId,
        shareId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });
      
      const baseUrl = req.protocol + '://' + req.get('host');
      const shareUrl = `${baseUrl}/shared/${shareId}`;
      
      res.json({
        shareId,
        shareUrl,
        expiresAt: sharedQuery.expiresAt,
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to share query: " + (error as Error).message });
    }
  });

  app.get('/api/shared/:shareId', async (req, res) => {
    try {
      const shareId = req.params.shareId;
      const sharedQuery = await storage.getSharedQueryWithQuery(shareId);
      
      if (!sharedQuery) {
        return res.status(404).json({ message: "Shared query not found or expired" });
      }
      
      res.json(sharedQuery);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shared query: " + (error as Error).message });
    }
  });

  // Cleanup task
  app.post('/api/cleanup/expired-shares', async (req, res) => {
    try {
      const count = await storage.cleanupExpiredSharedQueries();
      res.json({ message: `Cleaned up ${count} expired shared queries` });
    } catch (error) {
      res.status(500).json({ message: "Failed to cleanup expired shares: " + (error as Error).message });
    }
  });

  // Development seeding endpoint
  app.post('/api/seed', async (req, res) => {
    try {
      await seedDatabase();
      res.json({ message: "Database seeded successfully with sample data" });
    } catch (error) {
      res.status(500).json({ message: "Failed to seed database: " + (error as Error).message });
    }
  });

  // WebSocket message handlers
  async function handleGenerateSQL(ws: WebSocket, data: any) {
    const requestId = data.requestId || Date.now().toString();
    activeRequests.set(requestId, true);
    
    try {
      const request: SQLGenerationRequest = data.payload;
      const mode = data.mode || 'create'; // 기본값을 'create'로 변경
      
      // 요청이 취소되었는지 확인
      if (!activeRequests.get(requestId)) {
        return; // 취소된 요청은 처리하지 않음
      }
      
      let result;
      
      switch (mode) {
        case 'explain':
          const explanation = await internalAIService.explainSQL(request.naturalLanguage, request.dialect);
          result = { explanation };
          break;
        case 'grammar':
          const correctedSQL = await internalAIService.validateSQLGrammar(request.naturalLanguage, request.dialect);
          result = { sqlQuery: correctedSQL, dialect: request.dialect, confidence: 0.8 };
          break;
        case 'comment':
          const commentedSQL = await internalAIService.addSQLComments(request.naturalLanguage, request.dialect);
          result = { sqlQuery: commentedSQL, dialect: request.dialect, confidence: 0.8 };
          break;
        case 'transform':
          const transformedSQL = await internalAIService.convertSQLDialect(request.naturalLanguage, 'mysql', request.dialect);     
          result = { sqlQuery: transformedSQL, dialect: request.dialect, confidence: 0.8 };
          break;
        case 'create':
        default:
          result = await internalAIService.generateSQL(request);
          break;
      }
      
      // 다시 한번 취소 확인
      if (!activeRequests.get(requestId)) {
        return;
      }
      
      // Save query to database for history
      try {
        await storage.createQuery({
          userId: "demo-user",
          naturalLanguage: request.naturalLanguage,
          sqlQuery: result.sqlQuery || '',
          dialect: result.dialect || request.dialect,
          explanation: result.explanation || '',
          schemaId: request.schemaId,
          isFavorite: false,
        });
      } catch (saveError) {
        console.error('Failed to save query to database:', saveError);
      }
      
      // 요청이 여전히 활성 상태인 경우에만 응답 전송
      if (ws.readyState === WebSocket.OPEN && activeRequests.get(requestId)) {
        ws.send(JSON.stringify({
          type: 'sql_generated',
          payload: result,
          requestId: requestId,
        }));
      }
    } catch (error) {
      if (ws.readyState === WebSocket.OPEN && activeRequests.get(requestId)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to generate SQL: ' + (error as Error).message,
          requestId: requestId,
        }));
      }
    } finally {
      // 요청 완료 후 정리
      activeRequests.delete(requestId);
    }
  }
  
  async function handleExecuteQuery(ws: WebSocket, data: any) {
    try {
      const request: QueryExecutionRequest = data.payload;
      const result = await queryExecutor.executeQuery(request);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'query_executed',
          payload: result,
          requestId: data.requestId,
        }));
      }
    } catch (error) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to execute query: ' + (error as Error).message,
          requestId: data.requestId,
        }));
      }
    }
  }

  async function handleExplainSQL(ws: WebSocket, data: any) {
    try {
      const { sqlQuery, dialect } = data.payload;
      const explanation = await internalAIService.explainSQL(sqlQuery, dialect);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'sql_explained',
          payload: { explanation },
          requestId: data.requestId,
        }));
      }
    } catch (error) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to explain SQL: ' + (error as Error).message,
          requestId: data.requestId,
        }));
      }
    }
  }

  return httpServer;
}