// One-time script to reset all user accounts
// Run this with: npx tsx server/reset-users.ts

import Database from "@replit/database";

const db = new Database();

async function resetAllUsers() {
  console.log("🔄 Starting user account reset...\n");
  
  try {
    // List all user keys
    const userKeysResult = await db.list("user:");
    
    if (!userKeysResult.ok) {
      console.error("❌ Error listing user keys:", userKeysResult.error);
      process.exit(1);
    }
    
    const userKeys = userKeysResult.value || [];
    console.log(`👥 Found ${userKeys.length} user accounts`);
    
    // Delete all user keys
    for (const key of userKeys) {
      await db.delete(key);
      console.log(`  ✅ Deleted: ${key}`);
    }
    
    // List all reset token keys
    const resetKeysResult = await db.list("reset:");
    
    if (!resetKeysResult.ok) {
      console.error("⚠️  Warning: Could not list reset keys:", resetKeysResult.error);
    } else {
      const resetKeys = resetKeysResult.value || [];
      console.log(`\n🔑 Found ${resetKeys.length} reset tokens`);
      
      // Delete all reset keys
      for (const key of resetKeys) {
        await db.delete(key);
        console.log(`  ✅ Deleted: ${key}`);
      }
    }
    
    console.log("\n✨ All user accounts have been reset!");
    console.log("📝 Users will need to register again with email and security question.");
    
  } catch (error) {
    console.error("❌ Error resetting users:", error);
    process.exit(1);
  }
}

resetAllUsers();
