// Smart invalidation helper to reduce excessive API calls
import { QueryClient } from '@tanstack/react-query';

interface InvalidationBatch {
  queryKeys: string[];
  timestamp: number;
}

class SmartInvalidation {
  private invalidationBatches = new Map<string, InvalidationBatch>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 500; // 500ms debounce
  
  constructor(private queryClient: QueryClient) {}

  // Batch and debounce invalidations to prevent excessive API calls
  invalidateQueries(queryKey: string[]) {
    const key = queryKey.join('/');
    
    // Update or create batch entry
    this.invalidationBatches.set(key, {
      queryKeys: queryKey,
      timestamp: Date.now()
    });

    // Clear existing timeout and set new one
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  // Process all batched invalidations at once
  private processBatch() {
    if (this.invalidationBatches.size === 0) return;

    console.log(`🔄 Processing ${this.invalidationBatches.size} batched invalidations`);
    
    // Group by API endpoint for efficient processing
    const apiGroups: Record<string, string[][]> = {};
    
    this.invalidationBatches.forEach((batch, key) => {
      const apiEndpoint = batch.queryKeys[0]; // e.g., '/api/diary'
      if (!apiGroups[apiEndpoint]) {
        apiGroups[apiEndpoint] = [];
      }
      apiGroups[apiEndpoint].push(batch.queryKeys);
    });

    // Execute invalidations by API group
    Object.keys(apiGroups).forEach(endpoint => {
      const queryKeyGroups = apiGroups[endpoint];
      // Use the most generic query key to invalidate all related queries
      this.queryClient.invalidateQueries({ 
        queryKey: [endpoint]
        // Let staleTime control refetch timing
      });
      
      console.log(`🔄 Invalidated ${endpoint} (${queryKeyGroups.length} operations batched)`);
    });

    // Clear the batch
    this.invalidationBatches.clear();
    this.batchTimeout = null;
  }

  // Selective invalidation for specific operations
  invalidateSelectively(queryKey: string[], condition?: () => boolean) {
    if (condition && !condition()) {
      console.log(`⏭️ Skipped invalidation for ${queryKey.join('/')} - condition not met`);
      return;
    }
    
    this.invalidateQueries(queryKey);
  }

  // Force immediate invalidation (for critical operations)
  invalidateImmediately(queryKey: string[]) {
    console.log(`⚡ Immediate invalidation for ${queryKey.join('/')}`);
    this.queryClient.invalidateQueries({ queryKey });
  }
}

// Singleton instance
let smartInvalidationInstance: SmartInvalidation | null = null;

export function createSmartInvalidation(queryClient: QueryClient): SmartInvalidation {
  if (!smartInvalidationInstance) {
    smartInvalidationInstance = new SmartInvalidation(queryClient);
  }
  return smartInvalidationInstance;
}

export function getSmartInvalidation(): SmartInvalidation {
  if (!smartInvalidationInstance) {
    throw new Error('SmartInvalidation not initialized. Call createSmartInvalidation first.');
  }
  return smartInvalidationInstance;
}