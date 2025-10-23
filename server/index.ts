import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import emailAuthRoutes from "./email-auth";
import { appTokenMiddleware } from "./middleware/app-token-middleware";

const app = express();

// Disable ETags globally to prevent 304 Not Modified responses
app.set('etag', false);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from public directory (before token middleware)
app.use(express.static('public'));

// App token validation middleware (now in BLOCKING mode)
app.use(appTokenMiddleware);

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

// Register email/password authentication routes
app.use("/api", emailAuthRoutes);

(async () => {
  const server = await registerRoutes(app);
  
  // Initialize gamification challenges in database
  try {
    const { challengeService } = await import("./services/challenge-service");
    await challengeService.initializeChallenges();
  } catch (error) {
    console.error("Failed to initialize challenges:", error);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  
  // Force development mode for now to show live changes
  // Only use deployment mode when NODE_ENV is production
  const isDeployment = process.env.NODE_ENV === "production";
  
  if (!isDeployment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
