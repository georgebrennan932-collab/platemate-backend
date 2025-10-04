import { nanoid } from 'nanoid';

const GUEST_ID_KEY = 'platemate_guest_id';

export function getGuestId(): string {
  // Check if we already have a guest ID in localStorage
  const existingId = localStorage.getItem(GUEST_ID_KEY);
  
  if (existingId) {
    return existingId;
  }
  
  // Generate a new guest ID
  const guestId = `guest_${nanoid()}`;
  localStorage.setItem(GUEST_ID_KEY, guestId);
  
  return guestId;
}

export function clearGuestId(): void {
  localStorage.removeItem(GUEST_ID_KEY);
}

export function isGuestId(id: string): boolean {
  return id.startsWith('guest_');
}
