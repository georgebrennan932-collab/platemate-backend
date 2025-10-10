import { useEffect, useState } from 'react';
import { WifiOff, Wifi, CloudOff, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { offlineQueue } from '@/lib/offline-queue';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    // Subscribe to online/offline status changes
    const unsubscribe = offlineQueue.onStatusChange((online) => {
      setIsOnline(online);
      
      if (online) {
        // Trigger sync when coming back online
        offlineQueue.syncQueue().then((result) => {
          if (result && result.success > 0) {
            setShowSyncSuccess(true);
            setTimeout(() => setShowSyncSuccess(false), 3000);
          }
        });
      }
    });

    // Update queue count periodically
    const interval = setInterval(() => {
      setQueueCount(offlineQueue.getQueueCount());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (isOnline && queueCount === 0 && !showSyncSuccess) {
    return null; // Don't show anything when online and queue is empty
  }

  return (
    <AnimatePresence>
      {(!isOnline || queueCount > 0 || showSyncSuccess) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          {showSyncSuccess ? (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2">
              <CloudUpload className="h-5 w-5" />
              <span className="font-semibold">Synced successfully!</span>
            </div>
          ) : !isOnline ? (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2">
              <WifiOff className="h-5 w-5" />
              <span className="font-semibold">You're offline</span>
              {queueCount > 0 && (
                <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs">
                  {queueCount} queued
                </span>
              )}
            </div>
          ) : queueCount > 0 ? (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2">
              <CloudOff className="h-5 w-5 animate-pulse" />
              <span className="font-semibold">Syncing {queueCount} items...</span>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
