import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { createServer } from "http";
import { generateLogId } from "./utils";


// 세션 저장소 설정을 위한 타입 확장
declare module "express-session" {
  interface SessionData {
    loggedIn: boolean;
    sqlAstntLogiLogId: string;
    prafNo: string;
    ognzNo: string;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());  // CORS 미들웨어 - 모든 출처에서의 요청을 허용

// 1. 세션 미들웨어를 먼저 정의합니다.
const sessionStore = MemoryStore(session);
const sessionParser = session({
  store: new sessionStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET || "a-very-secret-key-that-you-should-change",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 3 },
});
app.use(sessionParser);

// 2. 세션 기반 접속 로그 기록 미들웨어
app.use(async (req, res, next) => {
  app.set('trust proxy', true); // 프록시 서버를 거쳐도 실제 사용자 IP를 가져오도록 설정

  if (!req.session.loggedIn) {
    try {
      const sqlAstntLogiLogId = generateLogId();                // LOGIN_ID를 생성
      const userIpAddress = req.ip || req.socket.remoteAddress; // 요청 객체에서 사용자 IP 주소 추출
      const prafNoFromRequest = req.body?.prafNo || 'ZZZZZZZZ'; // POST 요청의 body에서 prafNo, ognzNo 수신, 'ZZZZZZZZ'를 기본값
      const ognzNoFromRequest = req.body?.ognzNo || 'ZZZZZZZ';

      const logData = {
        sqlAstntLogiLogId: sqlAstntLogiLogId,
        prafNo: prafNoFromRequest,
        logiDt: new Date(),
        logiIpAddr: userIpAddress,
        systRgiDt: new Date(),
        systRgiPrafNo: prafNoFromRequest,
        systRgiOgnzNo: ognzNoFromRequest,
        systRgiSystCd: "ISA",
        systRgiPrgrId: "SQL Assistant",
        systChgDt: new Date(),
        systChgPrafNo: prafNoFromRequest,
        systChgOgnzNo: ognzNoFromRequest,
        systChgSystCd: "ISA",
        systChgPrgrId: "SQL Assistant",
      };

      await storage.createLoginLog(logData);
      
      // 추출한 정보들을 세션에 저장.
      req.session.sqlAstntLogiLogId = sqlAstntLogiLogId;
      req.session.prafNo = prafNoFromRequest;
      req.session.ognzNo = ognzNoFromRequest;

      // 모든 정보가 저장된 후 로그인 상태로 변경
      req.session.loggedIn = true; 

    } catch (error) {
      console.error("Failed to write login log:", error);
    }
  }
  next();
});

(async () => {
  // WebSocket을 위해 여기서 sessionParser를 다시 참조합니다.
  // Express 앱으로 HTTP 서버를 생성합니다.
  const httpServer = createServer(app);

  // registerRoutes에 httpServer, app, sessionParser를 모두 전달합니다.
  await registerRoutes(httpServer, app, sessionParser);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 18027;
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();