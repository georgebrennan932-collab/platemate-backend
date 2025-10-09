import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import Database from "@replit/database";

const router = Router();
const db = new Database();

// In-memory session storage (sessions = { token: email })
const sessions: Record<string, string> = {};

// Helper function to get user key in Replit DB
const getUserKey = (email: string) => `user:${email}`;

// POST /api/register - create a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if password meets minimum requirements
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const userKey = getUserKey(email);
    const existingUser: any = await db.get(userKey);

    if (existingUser && existingUser.ok === true) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in Replit Database
    const userData = {
      passwordHash,
      createdAt: Date.now()
    };

    await db.set(userKey, userData);

    // Generate session token
    const token = uuidv4();
    sessions[token] = email;

    res.json({
      success: true,
      token,
      user: {
        email
      }
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/login - verify user credentials
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const userKey = getUserKey(email);
    const userResult: any = await db.get(userKey);

    if (!userResult || userResult.ok !== true || !userResult.value) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userResult.value;

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate session token
    const token = uuidv4();
    sessions[token] = email;

    res.json({
      success: true,
      token,
      user: {
        email
      }
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/checkSession - verify session token validity
router.get("/checkSession", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const email = sessions[token];
    if (!email) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Verify user still exists in database
    const userKey = getUserKey(email);
    const userResult: any = await db.get(userKey);

    if (!userResult || userResult.ok !== true) {
      delete sessions[token];
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        email
      }
    });
  } catch (error: any) {
    console.error("Check session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/logout - end a user session
router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }

    // Remove session
    if (sessions[token]) {
      delete sessions[token];
      return res.json({ success: true, message: "Logged out successfully" });
    }

    res.status(400).json({ error: "Invalid token" });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
