import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import Database from "@replit/database";
import { sessions } from "./session-store";

const router = Router();
const db = new Database();

// Helper function to get user key in Replit DB
const getUserKey = (email: string) => `user:${email}`;

// POST /api/register - create a new user
router.post("/register", async (req, res) => {
  try {
    const { email, password, securityAnswer } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Validate security answer
    if (!securityAnswer || securityAnswer.trim().length === 0) {
      return res.status(400).json({ error: "Security answer is required" });
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

    // Hash password and security answer
    const passwordHash = await bcrypt.hash(password, 10);
    const securityAnswerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);

    // Create user in Replit Database
    const userData = {
      passwordHash,
      securityAnswerHash,
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

// POST /api/reset-password-verify - verify email and security answer for password reset
router.post("/reset-password-verify", async (req, res) => {
  try {
    const { email, securityAnswer } = req.body;

    // Validate input
    if (!email || !securityAnswer) {
      return res.status(400).json({ error: "Email and security answer are required" });
    }

    // Find user by email
    const userKey = getUserKey(email);
    const userResult: any = await db.get(userKey);

    if (!userResult || userResult.ok !== true || !userResult.value) {
      return res.status(401).json({ error: "Invalid email or security answer" });
    }

    const user = userResult.value;

    // Verify security answer (case-insensitive)
    const isValid = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.securityAnswerHash);
    
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or security answer" });
    }

    // Generate a temporary reset token (valid for 15 minutes)
    const resetToken = uuidv4();
    const resetKey = `reset:${resetToken}`;
    await db.set(resetKey, {
      email,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

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

// POST /api/reset-password - reset password using reset token
router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Validate input
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: "Reset token and new password are required" });
    }

    // Check if password meets minimum requirements
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Verify reset token
    const resetKey = `reset:${resetToken}`;
    const resetData: any = await db.get(resetKey);

    if (!resetData || resetData.ok !== true || !resetData.value) {
      return res.status(401).json({ error: "Invalid or expired reset token" });
    }

    const { email, expiresAt } = resetData.value;

    // Check if token is expired
    if (Date.now() > expiresAt) {
      await db.delete(resetKey);
      return res.status(401).json({ error: "Reset token has expired" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const userKey = getUserKey(email);
    const userResult: any = await db.get(userKey);
    
    if (!userResult || userResult.ok !== true || !userResult.value) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = {
      ...userResult.value,
      passwordHash,
      updatedAt: Date.now()
    };

    await db.set(userKey, userData);

    // Delete reset token
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
