// One-time script to reset all user accounts
// Run this ONCE with: npx tsx server/reset-users.ts

import Database from "@replit/database";

const db = new Database();

async function resetAllUsers() {
  console.log("🔄 Starting user account reset...");
  
  try {
    // Get all keys from the database
    const allKeys = await db.list();
    console.log(`📋 Found ${allKeys.length} total keys in database`);
    
    // Filter for user-related keys
    const userKeys = allKeys.filter(key => 
      key.startsWith('user:') || key.startsWith('reset:')
    );
    
    console.log(`👥 Found ${userKeys.length} user-related keys to delete`);
    
    // Delete all user keys
    for (const key of userKeys) {
      await db.delete(key);
      console.log(`  ✅ Deleted: ${key}`);
    }
    
    console.log("\n✨ All user accounts have been reset!");
    console.log("📝 Users will need to register again with their email and security question.");
    
  } catch (error) {
    console.error("❌ Error resetting users:", error);
    process.exit(1);
  }
}

resetAllUsers();
