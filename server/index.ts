import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// CORS configuration for mobile app support
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000', 
      'capacitor://localhost',
      'ionic://localhost',
      'http://10.0.2.2:5000', // Android emulator
      'http://127.0.0.1:5000',
      'https://b3ef8bbc-4987-4bf0-84a0-21447c42de4e-00-d9egvcnatzxk.kirk.replit.dev', // Deployed Replit URL
    ];
    
    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check Replit dev domain pattern
    if (/^https:\/\/.*\.replit\.dev$/.test(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log(`❌ CORS rejected origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'User-Agent', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log mobile/WebView requests for debugging
  const userAgent = req.get('User-Agent') || '';
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('wv')) {
    console.log(`📱 Mobile request: ${req.method} ${path} | Origin: ${origin} | UA: ${userAgent.substring(0, 50)}...`);
  }

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
  console.log(`🔍 Environment check: app.get("env") = "${app.get("env")}", NODE_ENV = "${process.env.NODE_ENV}"`);
  
  // Force development mode for React app to work
  if (app.get("env") === "development" || process.env.NODE_ENV !== "production") {
    console.log("✅ Using Vite dev server for React app");
    await setupVite(app, server);
  } else {
    console.log("❌ Using static server (would show landing page)");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 8000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const PORT = process.env.PORT || 3000;
  server.listen({
    port: PORT,
    host: "0.0.0.0",
  }, () => {
    console.log(`✅ PlateMate running on port ${PORT}`);
  });
})();
