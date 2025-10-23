import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";

export enum TokenValidationMode {
  PERMISSIVE = "permissive",
  BLOCKING = "blocking",
  DISABLED = "disabled"
}

let currentMode: TokenValidationMode = TokenValidationMode.BLOCKING;

export function setTokenValidationMode(mode: TokenValidationMode) {
  currentMode = mode;
  console.log(`🔐 App token validation mode changed to: ${mode}`);
}

export function getTokenValidationMode(): TokenValidationMode {
  return currentMode;
}

export function appTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  if (currentMode === TokenValidationMode.DISABLED) {
    return next();
  }

  // Paths that are always accessible (no token required)
  const publicPaths = [
    '/blocked-access.html',
    '/blocked-access',
    '/api/health',
    '/api/token-mode'
  ];

  // Check if this is a public path
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Check token for ALL other paths
  const appToken = req.headers['x-app-token'] as string;
  const expectedToken = process.env.APP_ACCESS_TOKEN;

  if (!expectedToken) {
    console.warn('⚠️ APP_ACCESS_TOKEN not configured');
    return next();
  }

  const isValidToken = appToken === expectedToken;

  if (!isValidToken) {
    const logMessage = `🔒 Access denied: invalid/missing token - ${req.method} ${req.path}`;
    
    if (currentMode === TokenValidationMode.PERMISSIVE) {
      console.log(`${logMessage} (PERMISSIVE MODE - allowing)`);
      return next();
    }

    if (currentMode === TokenValidationMode.BLOCKING) {
      console.warn(`${logMessage} (BLOCKING MODE - blocking)`);
      
      // For API endpoints, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ 
          message: 'Access denied. This service is only accessible through the official PlateMate app.',
          code: 'INVALID_APP_TOKEN'
        });
      }
      
      // For all other pages, serve blocked access HTML
      const htmlPath = path.join(process.cwd(), 'public', 'blocked-access.html');
      return res.status(403).sendFile(htmlPath);
    }
  }

  next();
}
