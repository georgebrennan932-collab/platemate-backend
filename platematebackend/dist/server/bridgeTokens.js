import { randomBytes } from 'crypto';
// In-memory store for bridge tokens (expires after 5 minutes)
const bridgeTokens = new Map();
// Clean up expired tokens every minute
setInterval(() => {
    const now = Date.now();
    const tokensToDelete = [];
    bridgeTokens.forEach((data, token) => {
        if (data.expiresAt < now) {
            tokensToDelete.push(token);
        }
    });
    tokensToDelete.forEach(token => bridgeTokens.delete(token));
}, 60 * 1000);
export function createBridgeToken(sessionId) {
    // Generate a secure 256-bit random token
    const token = randomBytes(32).toString('hex');
    const bridgeToken = {
        token,
        sessionId,
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
    };
    bridgeTokens.set(token, bridgeToken);
    console.log('🔑 Created bridge token for session:', sessionId);
    return token;
}
export function consumeBridgeToken(token) {
    const bridgeToken = bridgeTokens.get(token);
    if (!bridgeToken) {
        console.log('❌ Bridge token not found or expired:', token);
        return null;
    }
    if (bridgeToken.expiresAt < Date.now()) {
        bridgeTokens.delete(token);
        console.log('❌ Bridge token expired:', token);
        return null;
    }
    // Token can only be used once - delete it immediately
    bridgeTokens.delete(token);
    console.log('✅ Bridge token consumed for session:', bridgeToken.sessionId);
    return bridgeToken.sessionId;
}
