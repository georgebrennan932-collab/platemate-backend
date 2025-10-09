// Singleton session storage
// This module exports a single shared sessions map used by both auth-middleware and email-auth

export const sessions: Record<string, string> = {};
