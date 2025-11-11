import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
export const sessions = pgTable("sessions", {
    token: text("token").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});
export const users = pgTable("users", {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at").defaultNow(),
});
