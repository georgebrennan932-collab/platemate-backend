import { Request, Response, NextFunction } from "express";
import { sessions } from "./session-store";

import { db } from "./db";

// Middleware to validate email/password auth session
export async function emailAuthMiddleware(req: any, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      // No token provided - continue as unauthenticated
      return next();
    }

    const email = sessions[token];
    
    if (!email) {
      // Invalid token - continue as unauthenticated
      return next();
    }

    // Verify user still exists in database
    const userKey = `user:${email}`;
    const userResult: any = await db.get(userKey);

    if (!userResult || userResult.ok !== true) {
      // User no longer exists - clean up session
      delete sessions[token];
      return next();
    }

    // Attach user info to request
    // Use email as the userId for consistency
    req.user = {
      email,
      // Add claims.sub for compatibility with old routes
      claims: {
        sub: email
      }
    };

    next();
  } catch (error) {
    console.error("Email auth middleware error:", error);
    next(); // Continue even if middleware fails
  }
}

// Middleware to require authentication
export function requireAuth(req: any, res: Response, next: NextFunction) {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
