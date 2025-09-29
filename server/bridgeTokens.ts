import { randomBytes } from 'crypto';

interface BridgeToken {
  token: string;
  sessionId: string;
  expiresAt: number;
}

// In-memory store for bridge tokens (expires after 5 minutes)
const bridgeTokens = new Map<string, BridgeToken>();

// Clean up expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of bridgeTokens.entries()) {
    if (data.expiresAt < now) {
      bridgeTokens.delete(token);
    }
  }
}, 60 * 1000);

export function createBridgeToken(sessionId: string): string {
  // Generate a secure 256-bit random token
  const token = randomBytes(32).toString('hex');
  
  const bridgeToken: BridgeToken = {
    token,
    sessionId,
    expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
  };
  
  bridgeTokens.set(token, bridgeToken);
  
  console.log('🔑 Created bridge token for session:', sessionId);
  
  return token;
}

export function consumeBridgeToken(token: string): string | null {
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
