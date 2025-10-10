import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStreakData, getStreakMessage, type StreakData } from '@/lib/streak-tracker';

export function StreakCounter() {
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  useEffect(() => {
    // Load streak data on mount
    const data = getStreakData();
    setStreakData(data);
    
    // Listen for streak updates
    const handleStreakUpdate = () => {
      const updatedData = getStreakData();
      setStreakData(updatedData);
    };
    
    window.addEventListener('streakUpdated', handleStreakUpdate);
    return () => window.removeEventListener('streakUpdated', handleStreakUpdate);
  }, []);

  if (!streakData) {
    return null;
  }

  const { currentStreak, longestStreak } = streakData;
  const message = getStreakMessage(currentStreak);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-purple-500/80 to-purple-600/80 dark:from-purple-600/80 dark:to-purple-700/80 rounded-2xl p-6 border-2 border-purple-400/50 dark:border-purple-500/50 shadow-lg"
      data-testid="streak-counter"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={currentStreak > 0 ? {
              scale: [1, 1.2, 1],
              rotate: [0, -10, 10, -10, 0]
            } : {}}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3
            }}
          >
            <Flame className={`h-8 w-8 ${currentStreak > 0 ? 'text-orange-400' : 'text-white/50'}`} />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Daily Streak
            </h3>
            <p className="text-sm text-purple-100">
              {message}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-orange-400" data-testid="streak-current">
            {currentStreak}
          </div>
          <div className="text-xs text-purple-100">
            {currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>
      
      {longestStreak > currentStreak && (
        <div className="pt-4 border-t border-white/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-100">
              Personal Best
            </span>
            <span className="font-semibold text-orange-300" data-testid="streak-longest">
              {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
