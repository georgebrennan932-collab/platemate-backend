import { Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MealMemory } from '@/lib/meal-memory';
import { getMealMemoryMessage } from '@/lib/meal-memory';

interface MealMemoryBadgeProps {
  memory: MealMemory | null;
  frequency?: { count: number; averageDaysBetween: number };
}

export function MealMemoryBadge({ memory, frequency }: MealMemoryBadgeProps) {
  if (!memory) return null;

  const message = getMealMemoryMessage(memory);
  if (!message) return null;

  const showFrequency = frequency && frequency.count > 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-300/50 dark:border-purple-500/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
              {message}
            </p>
            {showFrequency && (
              <div className="mt-2 flex items-center space-x-2 text-xs text-purple-700 dark:text-purple-300">
                <TrendingUp className="h-4 w-4" />
                <span>
                  You eat this about every {frequency.averageDaysBetween} days
                  {' '}({frequency.count} times total)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
