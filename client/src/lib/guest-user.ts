/**
 * Guest user management utilities
 * Allows users to use the app without authentication
 */

const GUEST_USER_KEY = 'platemate_guest_user';
const GUEST_MODE_KEY = 'platemate_guest_mode';

export interface GuestUser {
  id: string;
  createdAt: string;
  isGuest: true;
}

/**
 * Generate a unique guest user ID
 */
function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Check if currently in guest mode
 */
export function isGuestMode(): boolean {
  return localStorage.getItem(GUEST_MODE_KEY) === 'true';
}

/**
 * Get or create guest user
 */
export function getGuestUser(): GuestUser {
  const existing = localStorage.getItem(GUEST_USER_KEY);
  
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch {
      // Invalid data, create new
    }
  }
  
  const guestUser: GuestUser = {
    id: generateGuestId(),
    createdAt: new Date().toISOString(),
    isGuest: true
  };
  
  localStorage.setItem(GUEST_USER_KEY, JSON.stringify(guestUser));
  localStorage.setItem(GUEST_MODE_KEY, 'true');
  
  return guestUser;
}

/**
 * Enable guest mode
 */
export function enableGuestMode(): GuestUser {
  localStorage.setItem(GUEST_MODE_KEY, 'true');
  return getGuestUser();
}

/**
 * Disable guest mode (called after successful authentication)
 */
export function disableGuestMode(): void {
  localStorage.removeItem(GUEST_MODE_KEY);
  // Keep guest user data for migration
}

/**
 * Clear all guest data (after successful migration or logout)
 */
export function clearGuestData(): void {
  localStorage.removeItem(GUEST_USER_KEY);
  localStorage.removeItem(GUEST_MODE_KEY);
  localStorage.removeItem('platemate_guest_diary');
  localStorage.removeItem('platemate_guest_weights');
  localStorage.removeItem('platemate_guest_goals');
}

/**
 * Check if there's guest data to migrate
 */
export function hasGuestDataToMigrate(): boolean {
  const diary = localStorage.getItem('platemate_guest_diary');
  const weights = localStorage.getItem('platemate_guest_weights');
  
  return !!(diary || weights);
}
