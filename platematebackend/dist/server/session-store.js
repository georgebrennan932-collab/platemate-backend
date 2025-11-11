// Session storage using PostgreSQL (via Drizzle ORM)
import { db } from "./db";
import { eq } from "drizzle-orm";
import { sessions as sessionTable } from "./schema";
const sessionCache = {};
// Load all sessions from database into cache on startup
async function loadSessionsFromDatabase() {
    try {
        const allSessions = await db.select().from(sessionTable);
        let loadedCount = 0;
        for (const session of allSessions) {
            if (session.token && session.email) {
                sessionCache[session.token] = session.email;
                loadedCount++;
            }
        }
        console.log(`✅ Loaded ${loadedCount} sessions from database`);
    }
    catch (error) {
        console.error("Failed to load sessions from database:", error);
    }
}
loadSessionsFromDatabase();
export const sessions = new Proxy(sessionCache, {
    get(target, prop) {
        return target[prop];
    },
    set(target, prop, value) {
        target[prop] = value;
        db.insert(sessionTable)
            .values({ token: prop, email: value })
            .onConflictDoUpdate({ target: sessionTable.token, set: { email: value } })
            .catch((err) => console.error("Failed to persist session to database:", err));
        return true;
    },
    deleteProperty(target, prop) {
        delete target[prop];
        db.delete(sessionTable)
            .where(eq(sessionTable.token, prop))
            .catch((err) => console.error("Failed to delete session from database:", err));
        return true;
    },
});
