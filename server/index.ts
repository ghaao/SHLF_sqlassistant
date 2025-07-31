// server/index.ts

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { pool } from "./db";

// 세션 저장소 설정을 위한 타입 확장
declare module "express-session" {
  interface SessionData {
    loggedIn: boolean;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS 미들웨어 - 모든 출처에서의 요청을 허용
app.use(cors());

// 1. 세션 미들웨어 설정
const sessionStore = MemoryStore(session);
app.use(
  session({
    store: new sessionStore({
      checkPeriod: 86400000, // 24시간마다 만료된 세션 정리
    }),
    secret: process.env.SESSION_SECRET || "a-very-secret-key-that-you-should-change",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 3, // <-- 세션 유효 시간 3시간
    },
  }),
);

// 2. 세션 기반 접속 로그 기록 미들웨어 (이하 변경 없음)
app.use(async (req, res, next) => {
  if (!req.session.loggedIn) {
    try {
      const generateLogId = (): string => {
        const now = new Date();
        
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
        const microseconds = milliseconds + '000';

        const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        
        return `${year}${month}${day}${hours}${minutes}${seconds}${microseconds}${randomPart}`;
      };

      const logData = {
        sqlAstntLogiLogId: generateLogId(),
        prafNo: "TESTUSER",
        logiDt: new Date(),
        systRgiDt: new Date(),
        systRgiPrafNo: "SYSPRAF",
        systRgiOgnzNo: "SYSOGNZ",
        systRgiSystCd: "ISA",
        systRgiPrgrId: "SQL Assistant",
        systChgDt: new Date(),
        systChgPrafNo: "SYSPRAF",
        systChgOgnzNo: "SYSOGNZ",
        systChgSystCd: "ISA",
        systChgPrgrId: "SQL Assistant",
      };

      await storage.createLoginLog(logData);
      req.session.loggedIn = true;

    } catch (error) {
      console.error("Failed to write login log:", error);
    }
  }
  next();
});

// ... (이하 파일 내용 동일)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();