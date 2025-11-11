import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// ✅ Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL not found. Check your .env file.");
}

// ✅ Create Neon SQL client (HTTP mode for Render)
const sql = neon(process.env.DATABASE_URL);

// ✅ Initialize Drizzle ORM with your schema
export const db = drizzle(sql, { schema });
