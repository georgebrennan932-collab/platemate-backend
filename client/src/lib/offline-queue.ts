/**
 * Offline Queue Service
 * Caches diary entries and analysis when device is offline
 * Automatically syncs when connection is restored
 */

import { buildApiUrl } from './api-config';

export interface QueuedEntry {
  id: string;
  type: 'diary' | 'analysis';
  data: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = 'platemate_offline_queue';
const MAX_RETRY_COUNT = 3;

class OfflineQueueService {
  private queue: QueuedEntry[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.loadQueue();
    this.setupEventListeners();
  }

  /**
   * Setup online/offline event listeners
   */
  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Device back online - starting sync...');
      this.isOnline = true;
      this.notifyListeners(true);
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Device offline - queueing enabled');
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  /**
   * Subscribe to online/offline status changes
   */
  onStatusChange(callback: (isOnline: boolean) => void) {
    this.listeners.add(callback);
    // Immediately call with current status
    callback(this.isOnline);
    
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  /**
   * Load queued entries from localStorage
   */
  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Loaded ${this.queue.length} queued entries from storage`);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Add entry to queue (when offline or failed online)
   */
  addToQueue(type: 'diary' | 'analysis', data: any): string {
    const entry: QueuedEntry = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(entry);
    this.saveQueue();
    
    console.log(`📥 Added ${type} entry to offline queue:`, entry.id);
    return entry.id;
  }

  /**
   * Get all queued entries
   */
  getQueue(): QueuedEntry[] {
    return [...this.queue];
  }

  /**
   * Get count of queued entries
   */
  getQueueCount(): number {
    return this.queue.length;
  }

  /**
   * Check if device is currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Sync all queued entries to server
   */
  async syncQueue() {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Syncing ${this.queue.length} queued entries...`);

    const entriesToSync = [...this.queue];
    const syncResults: { success: number; failed: number } = { success: 0, failed: 0 };

    for (const entry of entriesToSync) {
      try {
        await this.syncEntry(entry);
        // Remove from queue on success
        this.queue = this.queue.filter(e => e.id !== entry.id);
        syncResults.success++;
        console.log(`✅ Synced entry ${entry.id}`);
      } catch (error) {
        console.error(`❌ Failed to sync entry ${entry.id}:`, error);
        
        // Increment retry count
        const queueEntry = this.queue.find(e => e.id === entry.id);
        if (queueEntry) {
          queueEntry.retryCount++;
          
          // Remove if exceeded retry limit
          if (queueEntry.retryCount >= MAX_RETRY_COUNT) {
            this.queue = this.queue.filter(e => e.id !== entry.id);
            console.warn(`⚠️ Removed entry ${entry.id} after ${MAX_RETRY_COUNT} failed attempts`);
          }
        }
        
        syncResults.failed++;
      }
    }

    this.saveQueue();
    this.syncInProgress = false;

    console.log(`🏁 Sync complete: ${syncResults.success} succeeded, ${syncResults.failed} failed`);
    
    return syncResults;
  }

  /**
   * Sync a single entry to the server
   */
  private async syncEntry(entry: QueuedEntry): Promise<void> {
    if (entry.type === 'diary') {
      // Sync diary entry
      const response = await fetch(buildApiUrl('/api/diary'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry.data)
      });

      if (!response.ok) {
        throw new Error(`Failed to sync diary entry: ${response.status}`);
      }
    } else if (entry.type === 'analysis') {
      // For analysis entries, re-run the analysis
      const formData = new FormData();
      
      // Convert base64 back to file if needed
      if (entry.data.imageData) {
        const blob = await fetch(entry.data.imageData).then(r => r.blob());
        formData.append('image', blob);
      }

      const response = await fetch(buildApiUrl('/api/analyze'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to sync analysis: ${response.status}`);
      }
    }
  }

  /**
   * Clear all queued entries (use with caution!)
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
    console.log('🗑️ Offline queue cleared');
  }

  /**
   * Manually trigger sync (useful for testing)
   */
  async forceSyncresponse() {
    await this.syncQueue();
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueService();
