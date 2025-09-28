// Firebase Admin SDK for server-side authentication
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let app: admin.app.App;

export function initializeFirebaseAdmin() {
  if (!app) {
    // For development, we can use the Firebase config provided
    // In production, you should use proper service account credentials
    const firebaseConfig = {
      projectId: "platemate2",
      // Note: For production, use proper service account JSON file
      // This is a simplified setup for development
    };

    try {
      app = admin.initializeApp(firebaseConfig);
      console.log("🔥 Firebase Admin SDK initialized successfully");
    } catch (error) {
      console.error("❌ Firebase Admin SDK initialization failed:", error);
      // Continue without Firebase Admin for development
    }
  }
  return app;
}

// Middleware to verify Firebase ID tokens
export async function verifyFirebaseToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For development mode, allow requests without auth tokens
    if (process.env.NODE_ENV === 'development') {
      console.log("🔓 Development mode: Allowing unauthenticated request");
      req.user = {
        claims: {
          sub: 'firebase-user-demo'
        }
      };
      return next();
    }
    
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Initialize Firebase Admin if not already done
    const adminApp = initializeFirebaseAdmin();
    
    if (!adminApp) {
      // Fallback for development when Firebase Admin is not properly configured
      console.log("🔓 Firebase Admin not configured, using development fallback");
      req.user = {
        claims: {
          sub: 'firebase-user-demo'
        }
      };
      return next();
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = {
      claims: {
        sub: decodedToken.uid,
        email: decodedToken.email,
        firebase_uid: decodedToken.uid
      }
    };
    
    console.log(`🔐 Authenticated user: ${decodedToken.uid}`);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    
    // For development, allow requests with invalid tokens
    if (process.env.NODE_ENV === 'development') {
      console.log("🔓 Development mode: Allowing request with invalid token");
      req.user = {
        claims: {
          sub: 'firebase-user-demo'
        }
      };
      return next();
    }
    
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// For backwards compatibility during transition
export const tempAuthMiddleware = verifyFirebaseToken;