// Singleton session storage with Replit Database persistence
// This module exports session management functions used by both auth-middleware and email-auth
import { db } from "./db";

const SESSION_PREFIX = "session:";

// In-memory cache for faster lookups
const sessionCache: Record<string, string> = {};

// Load all sessions from database into cache on startup
async function loadSessionsFromDatabase() {
  try {
    const allKeysResult: any = await db.list(SESSION_PREFIX);
    const allKeys = allKeysResult?.value || [];
    let loadedCount = 0;
    
    for (const key of allKeys) {
      const emailResult: any = await db.get(key);
      const email = emailResult?.value;
      if (email) {
        const token = key.replace(SESSION_PREFIX, "");
        sessionCache[token] = email;
        loadedCount++;
      }
    }
    
    console.log(`✅ Loaded ${loadedCount} sessions from database`);
  } catch (error) {
    console.error("Failed to load sessions from database:", error);
  }
}

// Initialize sessions on module load
loadSessionsFromDatabase();

export const sessions = new Proxy(sessionCache, {
  get(target, prop: string) {
    return target[prop];
  },
  
  set(target, prop: string, value: string) {
    target[prop] = value;
    // Persist to database asynchronously
    db.set(SESSION_PREFIX + prop, value).catch(err => {
      console.error("Failed to persist session to database:", err);
    });
    return true;
  },
  
  deleteProperty(target, prop: string) {
    delete target[prop];
    // Remove from database asynchronously
    db.delete(SESSION_PREFIX + prop).catch(err => {
      console.error("Failed to delete session from database:", err);
    });
    return true;
  }
});
