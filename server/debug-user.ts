// @ts-nocheck
import { Router } from "express";
import { db } from "./db";

const router = Router();

// Quick route to check if a user exists in the DB
router.get("/debug-user/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const userKey = `user:${email}`;

    // @ts-ignore
    const result = await db.get(userKey);

    res.json({
      success: true,
      email,
      data: result || "User not found",
    });
  } catch (error) {
    console.error("Error checking user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
