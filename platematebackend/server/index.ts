import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import emailAuthRoutes from "./email-auth";
import { appTokenMiddleware } from "./middleware/app-token-middleware";

const app = express();

// Disable ETags globally to prevent 304 Not Modified responses
app.set("etag", false);

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from 'public' directory (before token middleware)
app.use(express.static("public"));

// App token validation middleware (now in BLOCKING mode)
app.use(appTokenMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

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
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      log(logLine);
    }
  });

  next();
});

// Register authentication routes
app.use("/api", emailAuthRoutes);

(async () => {
  const server = await registerRoutes(app);

  // Initialize gamification challenges
  try {
    const { challengeService } = await import("./services/challenge-service");
    await challengeService.initializeChallenges();
  } catch (error) {
    console.error("⚠️ Failed to initialize challenges:", error);
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // Development vs production setup
  const isDeployment = process.env.NODE_ENV === "production";
  if (!isDeployment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ✅ FIXED: use 0.0.0.0 for Render deployment
  const PORT = parseInt(process.env.PORT || "5000", 10);
  app.listen(PORT, "0.0.0.0", () => {
    log(`✅ Server running on port ${PORT}`);
  });
})();

