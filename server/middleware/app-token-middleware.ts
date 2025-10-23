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

  const skipPaths = [
    '/api/health',
    '/blocked-access',
    '/api/token-mode'
  ];

  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const appToken = req.headers['x-app-token'] as string;
  const expectedToken = process.env.APP_ACCESS_TOKEN;

  if (!expectedToken) {
    console.warn('⚠️ APP_ACCESS_TOKEN not configured');
    return next();
  }

  const isValidToken = appToken === expectedToken;

  if (!isValidToken) {
    const logMessage = `🔒 Invalid/missing app token from ${req.ip} - ${req.method} ${req.path}`;
    
    if (currentMode === TokenValidationMode.PERMISSIVE) {
      console.log(`${logMessage} (PERMISSIVE MODE - allowing)`);
      return next();
    }

    if (currentMode === TokenValidationMode.BLOCKING) {
      console.warn(`${logMessage} (BLOCKING MODE - rejecting)`);
      
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ 
          message: 'Access denied. This API is only accessible through the official PlateMate app.',
          code: 'INVALID_APP_TOKEN'
        });
      }
      
      return res.redirect('/blocked-access');
    }
  }

  next();
}
