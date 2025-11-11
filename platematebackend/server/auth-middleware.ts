import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

 export interface AuthenticatedRequest extends Request {
  headers: Record<string, any>;
  user?: any;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ✅ Get user by email (adjust if your token stores userId instead)
    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, decoded.email),
    });

    if (!result) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = result;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
