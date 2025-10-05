import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { createBridgeToken } from "./bridgeTokens";

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
      secure: true,
      sameSite: 'none', // Required for mobile WebView cross-origin cookies
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
    console.log(`🔐 Login attempt - req.hostname: ${req.hostname}`);
    
    // Store returnUrl in session if provided (for mobile OAuth)
    const returnUrl = req.query.returnUrl as string | undefined;
    if (returnUrl) {
      // SECURITY: Validate returnUrl to prevent open redirects
      if (!returnUrl.startsWith('platemate://auth-complete')) {
        console.error('❌ Invalid returnUrl - must start with platemate://auth-complete');
        return res.status(400).json({ error: 'Invalid return URL' });
      }
      console.log(`📱 Mobile OAuth - validated returnUrl: ${returnUrl}`);
      (req.session as any).returnUrl = returnUrl;
    }
    
    // Use the first domain from REPLIT_DOMAINS for authentication
    const domain = process.env.REPLIT_DOMAINS!.split(",")[0];
    console.log(`🔐 Using domain for auth: ${domain}`);
    
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Signup route - uses OAuth flow just like login (Replit will show signup if user doesn't exist)
  app.get("/api/signup", (req, res, next) => {
    console.log(`🔐 Signup attempt - req.hostname: ${req.hostname}`);
    
    // Store returnUrl in session if provided (for mobile OAuth)
    const returnUrl = req.query.returnUrl as string | undefined;
    if (returnUrl) {
      // SECURITY: Validate returnUrl to prevent open redirects
      if (!returnUrl.startsWith('platemate://auth-complete')) {
        console.error('❌ Invalid returnUrl - must start with platemate://auth-complete');
        return res.status(400).json({ error: 'Invalid return URL' });
      }
      console.log(`📱 Mobile OAuth signup - validated returnUrl: ${returnUrl}`);
      (req.session as any).returnUrl = returnUrl;
    }
    
    // Use the first domain from REPLIT_DOMAINS for authentication
    const domain = process.env.REPLIT_DOMAINS!.split(",")[0];
    console.log(`🔐 Using domain for signup: ${domain}`);
    
    // Trigger OAuth flow (Replit will show signup form if user doesn't exist)
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log(`🔐 Callback attempt - req.hostname: ${req.hostname}`);
    console.log(`🔐 Callback query params:`, req.query);
    console.log(`🔐 Callback full URL:`, req.url);
    
    // Use the first domain from REPLIT_DOMAINS for authentication
    const domain = process.env.REPLIT_DOMAINS!.split(",")[0];
    console.log(`🔐 Using domain for callback: ${domain}`);
    
    passport.authenticate(`replitauth:${domain}`, (err: any, user: any) => {
      if (err) {
        console.error('❌ Authentication error:', err);
        return res.redirect("/api/login");
      }
      
      if (!user) {
        console.log('❌ No user returned from authentication');
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('❌ Login error:', err);
          return res.redirect("/api/login");
        }
        
        // Check if this is a mobile OAuth flow with returnUrl
        const returnUrl = (req.session as any).returnUrl;
        
        if (returnUrl) {
          console.log(`📱 Mobile OAuth complete - generating bridge token`);
          
          // Create a bridge token for the mobile app
          const bridgeToken = createBridgeToken(req.sessionID);
          
          // Clear the returnUrl from session
          delete (req.session as any).returnUrl;
          
          // Redirect back to the mobile app with the bridge token
          const redirectUrl = `${returnUrl}?token=${bridgeToken}`;
          console.log(`📱 Redirecting to mobile app: ${redirectUrl}`);
          return res.redirect(redirectUrl);
        }
        
        // Normal web flow - redirect to home
        console.log(`🌐 Web OAuth complete - redirecting to /`);
        res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}/landing`,
        }).href
      );
    });
  });

  // Endpoint to get Google Web Client ID for frontend
  app.get("/api/auth/google/config", (req, res) => {
    res.json({
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
    });
  });

  // Native Google Sign-In endpoint for mobile apps
  app.post("/api/auth/google/mobile", async (req, res) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ error: 'ID token is required' });
      }

      console.log('🔐 Mobile Google Sign-In - verifying ID token');

      // Verify the Google ID token using Google's public keys
      const { OAuth2Client } = await import('google-auth-library');
      const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
      
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_WEB_CLIENT_ID!,
      });
      
      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(401).json({ error: 'Invalid ID token' });
      }

      console.log('✅ Google ID token verified:', payload.email);

      // Create or update user in our database
      const userId = payload.sub!;
      await storage.upsertUser({
        id: userId,
        email: payload.email!,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        profileImageUrl: payload.picture || null,
      });

      // Create a session for this user
      const user: any = {
        claims: {
          sub: userId,
          email: payload.email,
          first_name: payload.given_name,
          last_name: payload.family_name,
          profile_image_url: payload.picture,
          exp: payload.exp,
        },
        access_token: idToken,
        expires_at: payload.exp,
      };

      // Log in the user
      req.logIn(user, (err) => {
        if (err) {
          console.error('❌ Failed to create session:', err);
          return res.status(500).json({ error: 'Failed to create session' });
        }

        console.log('✅ Session created for user:', payload.email);
        
        // Return success with user info
        res.json({
          success: true,
          user: {
            id: userId,
            email: payload.email,
            firstName: payload.given_name || '',
            lastName: payload.family_name || '',
            profileImageUrl: payload.picture || null,
          }
        });
      });
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      res.status(401).json({ 
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : String(error)
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