import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Check if this is a mobile app request
    const userAgent = req.get('User-Agent') || '';
    const isMobile = userAgent.includes('Capacitor') || userAgent.includes('Mobile');
    
    if (isMobile) {
      // For mobile apps, redirect to a mobile-friendly OAuth flow
      const authUrl = `https://replit.com/oidc/auth?` +
        `client_id=${process.env.REPL_ID}&` +
        `redirect_uri=https://${req.hostname}/api/callback&` +
        `response_type=code&` +
        `scope=openid email profile offline_access&` +
        `prompt=login consent`;
      
      res.redirect(authUrl);
    } else {
      // Regular web browser authentication
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    }
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    console.log("🚪 Logout request received");
    console.log("🔍 Current session ID:", req.sessionID);
    console.log("🔍 User authenticated:", req.isAuthenticated());
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      // Destroy the session completely
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        
        // Clear ALL possible session cookies aggressively
        const cookieOptions = [
          { name: 'connect.sid', options: { path: '/', httpOnly: true, secure: false, sameSite: 'lax' as const } },
          { name: 'connect.sid', options: { path: '/', httpOnly: true, secure: true, sameSite: 'lax' as const } },
          { name: 'connect.sid', options: { path: '/' } },
          { name: 'session', options: { path: '/' } },
          { name: 'sid', options: { path: '/' } },
        ];
        
        cookieOptions.forEach(({ name, options }) => {
          res.clearCookie(name, options);
        });
        
        // Set headers to prevent caching
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        console.log("🚪 Session destroyed and all cookies cleared");
        // Return success status
        res.status(200).json({ 
          success: true, 
          message: "Logged out successfully",
          cleared: true
        });
      });
    });
  });

  // Keep GET endpoint for backwards compatibility but redirect to POST
  app.get("/api/logout", (req, res) => {
    res.redirect(307, '/api/logout');
  });

  // Authentication status endpoint
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json({
        authenticated: true,
        user: {
          id: user?.sub || user?.id || 'user',
          name: user?.name || user?.preferred_username || 'User',
          email: user?.email
        }
      });
    } else {
      res.status(401).json({
        authenticated: false,
        message: "Not authenticated"
      });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};