import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Disable ETag generation globally to prevent 304 Not Modified responses
// that break frontend query client (it treats 304 as error instead of cache hit)
app.disable('etag');

// Log deployment environment details for debugging
console.log("🚀 ===== SERVER STARTUP DEBUG ======");
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT}`);
console.log(`🔑 API Keys Status:`);
console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set (' + process.env.OPENAI_API_KEY.substring(0, 8) + '...)' : '❌ Missing'}`);
console.log(`  - GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '✅ Set (' + process.env.GOOGLE_API_KEY.substring(0, 8) + '...)' : '❌ Missing'}`);
console.log(`  - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set (' + process.env.GEMINI_API_KEY.substring(0, 8) + '...)' : '❌ Missing'}`);
console.log(`  - USDA_API_KEY: ${process.env.USDA_API_KEY ? '✅ Set (' + process.env.USDA_API_KEY.substring(0, 8) + '...)' : '❌ Missing'}`);
console.log(`🌐 REPLIT_DOMAINS: ${process.env.REPLIT_DOMAINS || 'Not set'}`);
console.log(`💾 DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set (PostgreSQL)' : '❌ Missing'}`);
console.log("🚀 ===================================\n");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  
  // Force development mode for now to show live changes
  // Only use deployment mode when NODE_ENV is production
  const isDeployment = process.env.NODE_ENV === "production";
  console.log(`🔧 Development mode forced: NODE_ENV=${process.env.NODE_ENV}, isDeployment=${isDeployment}`);
  
  if (!isDeployment) {
    console.log("🔧 Setting up Vite for development mode");
    await setupVite(app, server);
  } else {
    console.log("🔧 Serving static files for deployment mode");
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
    console.log(`\n🌍 Server ready! Environment: ${(process.env.REPLIT_DEPLOYMENT === '1' || process.env.REPLIT_DEPLOYMENT === 'true') ? 'DEPLOYMENT' : 'DEVELOPMENT'}\n`);
  });
})();
