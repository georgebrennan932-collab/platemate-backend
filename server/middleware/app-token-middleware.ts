import { Request, Response, NextFunction } from "express";

export enum TokenValidationMode {
  PERMISSIVE = "permissive",
  BLOCKING = "blocking",
  DISABLED = "disabled"
}

let currentMode: TokenValidationMode = TokenValidationMode.PERMISSIVE;

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

  // In PERMISSIVE and BLOCKING modes, only protect API endpoints
  // Allow all static assets, pages, and resources to load freely
  // This ensures Android app works without complex header injection for every resource type
  
  const protectedPaths = [
    '/api/'
  ];

  // Skip paths that should always be accessible
  const alwaysAllowPaths = [
    '/api/health',
    '/api/token-mode'
  ];

  // Check if this is an always-allowed path
  if (alwaysAllowPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Check if this path requires token validation
  const requiresToken = protectedPaths.some(path => req.path.startsWith(path));
  
  if (!requiresToken) {
    // Not an API endpoint - allow freely
    return next();
  }

  // This is a protected API endpoint - check token
  const appToken = req.headers['x-app-token'] as string;
  const expectedToken = process.env.APP_ACCESS_TOKEN;

  if (!expectedToken) {
    console.warn('⚠️ APP_ACCESS_TOKEN not configured');
    return next();
  }

  const isValidToken = appToken === expectedToken;

  if (!isValidToken) {
    const logMessage = `🔒 Invalid/missing app token - ${req.method} ${req.path}`;
    
    if (currentMode === TokenValidationMode.PERMISSIVE) {
      console.log(`${logMessage} (PERMISSIVE MODE - allowing)`);
      return next();
    }

    if (currentMode === TokenValidationMode.BLOCKING) {
      console.warn(`${logMessage} (BLOCKING MODE - rejecting)`);
      return res.status(403).json({ 
        message: 'Access denied. This API is only accessible through the official PlateMate app.',
        code: 'INVALID_APP_TOKEN'
      });
    }
  }

  next();
}
