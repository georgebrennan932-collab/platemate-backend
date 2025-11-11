import 'module-alias/register';
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";
import emailAuthRoutes from "./email-auth";
import { appTokenMiddleware } from "./middleware/app-token-middleware";

const app = express();

app.set("etag", false);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(appTokenMiddleware);

// Logging middleware (typed)
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
          // ignore stringify errors
        }
      }
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      log(logLine);
    }
  });

  next();
});

app.use("/api", emailAuthRoutes);

(async () => {
  const server = await registerRoutes(app);

  // Initialize gamification challenges (best-effort)
  try {
    const { challengeService } = await import("./services/challenge-service");
    await challengeService.initializeChallenges();
  } catch (error) {
    console.error("⚠️ Failed to initialize challenges:", error);
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || 500;
    res.status(status).json({ message: err?.message || "Internal Server Error" });
  });

  // 🧠 Brute-force Render deployment binding
  serveStatic(app);

  // Ignore whatever Node thinks; force host & port for Render
  const PORT = parseInt(process.env.PORT || "10000", 10);
  const HOST = "0.0.0.0"; // hardcoded to bind publicly

  app.listen(PORT, HOST, () => {
    console.log(`✅ [FORCED] Server running on Render at http://${HOST}:${PORT}`);
  });
})(); // 👈 closes the async IIFE
