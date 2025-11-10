import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// User sessions table
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// (Optional) Example users table if you need it later:
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});
