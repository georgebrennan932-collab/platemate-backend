import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { sessions } from "./session-store";
import { storage } from "./storage";
import { db } from "./db";

const router = Router();

// Helper function to get user key in Replit DB
const getUserKey = (email: string) => `user:${email}`;

// POST /api/register - create a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, securityAnswer } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!securityAnswer || securityAnswer.trim().length === 0) {
      return res.status(400).json({ error: "Security answer is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const userKey = getUserKey(email);

    // @ts-ignore -- ignore NeonDatabase type mismatch
    const existingUser: any = await db.get(userKey);
    const existingUserData = existingUser?.value;

    if (existingUserData && existingUserData.passwordHash) {
      return res.status(400).json({ error: "User already exists. Please login instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const securityAnswerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);

    const userData = {
      passwordHash,
      securityAnswerHash,
      createdAt: existingUserData?.createdAt || Date.now(),
      migratedAt: existingUserData ? Date.now() : undefined
    };

    // @ts-ignore
    await db.set(userKey, userData);

    await storage.upsertUser({
      id: email,
      email,
    });

    const token = uuidv4();
    sessions[token] = email;

    res.json({ success: true, token, user: { email } });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/login - verify user credentials
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userKey = getUserKey(email);

    // @ts-ignore
    const userResult: any = await db.get(userKey);

    if (!userResult || userResult.ok !== true || !userResult.value) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userResult.value;
    if (!user.passwordHash) {
      return res.status(401).json({
        error: "Account needs password setup. Please use 'Forgot Password' to reset.",
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await storage.upsertUser({ id: email, email });

    const token = uuidv4();
    sessions[token] = email;

    res.json({ success: true, token, user: { email } });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// GET /api/checkSession
router.get("/checkSession", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "No token provided" });

    const email = sessions[token];
    if (!email) return res.status(401).json({ error: "Invalid or expired token" });

    const userKey = getUserKey(email);
    // @ts-ignore
    const userResult: any = await db.get(userKey);

    if (!userResult || userResult.ok !== true) {
      delete sessions[token];
      return res.status(401).json({ error: "User not found" });
    }

    res.json({ success: true, user: { email } });
  } catch (error: any) {
    console.error("Check session error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/logout
router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(400).json({ error: "No token provided" });

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

// POST /api/reset-password-verify
router.post("/reset-password-verify", async (req, res) => {
  try {
    const { email, securityAnswer } = req.body;

    if (!email || !securityAnswer) {
      return res.status(400).json({ error: "Email and security answer are required" });
    }

    const userKey = getUserKey(email);
    // @ts-ignore
    const userResult: any = await db.get(userKey);

    if (!userResult || userResult.ok !== true || !userResult.value) {
      return res.status(401).json({ error: "Invalid email or security answer" });
    }

    const user = userResult.value;
    const isValid = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.securityAnswerHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or security answer" });
    }

    const resetToken = uuidv4();
    const resetKey = `reset:${resetToken}`;
    // @ts-ignore
    await db.set(resetKey, { email, expiresAt: Date.now() + 15 * 60 * 1000 });

    res.json({
      success: true,
      resetToken,
      message: "Security answer verified. You can now reset your password."
    });
  } catch (error: any) {
    console.error("Reset password verify error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: "Reset token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const resetKey = `reset:${resetToken}`;
    // @ts-ignore
    const resetData: any = await db.get(resetKey);

    if (!resetData || resetData.ok !== true || !resetData.value) {
      return res.status(401).json({ error: "Invalid or expired reset token" });
    }

    const { email, expiresAt } = resetData.value;
    if (Date.now() > expiresAt) {
      // @ts-ignore
      await db.delete(resetKey);
      return res.status(401).json({ error: "Reset token has expired" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const userKey = getUserKey(email);

    // @ts-ignore
    const userResult: any = await db.get(userKey);
    if (!userResult || userResult.ok !== true || !userResult.value) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = { ...userResult.value, passwordHash, updatedAt: Date.now() };

    // @ts-ignore
    await db.set(userKey, userData);

    // @ts-ignore
    await db.delete(resetKey);

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password."
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
