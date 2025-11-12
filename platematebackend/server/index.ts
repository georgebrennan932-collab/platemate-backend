// server/index.ts

import "module-alias/register.js";
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic, log } from "./vite.js";
import emailAuthRoutes from "./email-auth.js";
import { appTokenMiddleware } from "./middleware/app-token-middleware.js";

const app = express();

/* ---------- Core middleware ---------- */
app.set("etag", false);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(appTokenMiddleware);

/* ---------- Simple health check ---------- */
app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});

/* ---------- Request logging (typed) ---------- */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  // keep a bound reference to the original res.json
  const originalResJson = res.json.bind(res);

  // override res.json in a TS-friendly way
  (res as any).json = ((bodyJson: any, ...args: any[]) => {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  }) as typeof res.json;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
          /* ignore stringify errors */
        }
      }
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      log(logLine);
    }
  });

  next();
});

/* ---------- Routes ---------- */
app.use("/api", emailAuthRoutes);

(async () => {
  // register app routes that may need async setup
  await registerRoutes(app);

  // best-effort init of challenge data (don’t crash app if it fails)
  try {
    const { challengeService } = await import("./services/challenge-service.js");
    await challengeService.initializeChallenges();
  } catch (err) {
    console.error("⚠️ Failed to initialize challenges:", err);
  }

  /* ---------- Global error handler ---------- */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || 500;
    res.status(status).json({ message: err?.message || "Internal Server Error" });
  });

  /* ---------- Static (if you serve any) ---------- */
  serveStatic(app);

  /* ---------- Railway bind (PORT provided by platform) ---------- */
  const PORT = Number(process.env.PORT ?? 8080);
  const HOST = "0.0.0.0";
  app.listen(PORT, HOST, () => {
    console.log(`🚆 Server listening on http://${HOST}:${PORT}`);
  });
})();
