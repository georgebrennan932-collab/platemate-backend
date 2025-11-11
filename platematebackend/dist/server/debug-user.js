// Debug script to check user data in Replit DB
const db = new Database();
async function debugUser() {
    const email = "platematetestreview@gmail.com";
    const userKey = `user:${email}`;
    console.log(`\n🔍 Checking user data for: ${email}`);
    console.log(`📝 User key: ${userKey}\n`);
    const result = await db.get(userKey);
    console.log("📦 Raw result:", JSON.stringify(result, null, 2));
    if (result && result.ok === true && result.value) {
        console.log("\n✅ User found!");
        console.log("📊 User data structure:");
        console.log("  - Has passwordHash:", !!result.value.passwordHash);
        console.log("  - Has securityAnswerHash:", !!result.value.securityAnswerHash);
        console.log("  - Has createdAt:", !!result.value.createdAt);
        console.log("  - Has updatedAt:", !!result.value.updatedAt);
        console.log("\n🔑 Password hash preview:", result.value.passwordHash?.substring(0, 30) + "...");
    }
    else {
        console.log("❌ User not found or invalid structure");
    }
}
debugUser().catch(console.error);
export {};
