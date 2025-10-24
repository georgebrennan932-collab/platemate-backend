import React, { useEffect, useRef, useState } from "react";
import { Flame, Beef, Wheat, Droplets, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { NutritionGoals } from "@shared/schema";
// Confetti disabled: import { ConfettiCelebration, useConfetti } from "@/components/confetti-celebration";
import { motion } from "framer-motion";

interface ProgressIndicatorsProps {
  goals: NutritionGoals | undefined;
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  };
}

export function ProgressIndicators({ goals, consumed }: ProgressIndicatorsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Use default values if goals are not set - ensure UI is always visible
  const defaultGoals = {
    dailyCalories: 2000,
    dailyProtein: 150,
    dailyCarbs: 250,
    dailyFat: 65,
    dailyWater: 2000
  };
  
  const activeGoals = goals || defaultGoals;

  // Confetti disabled per user request
  // const previousAchievements = useRef<Record<string, boolean>>({});
  // const { shouldTrigger, triggerConfetti, resetTrigger } = useConfetti();

  const calculateProgress = (consumed: number, target: number) => {
    return Math.min((consumed / target) * 100, 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 70) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const progressData = [
    {
      icon: Flame,
      label: "Calories",
      consumed: consumed.calories,
      target: activeGoals.dailyCalories || 2000,
      unit: "",
      testId: "progress-calories"
    },
    {
      icon: Beef,
      label: "Protein",
      consumed: consumed.protein,
      target: activeGoals.dailyProtein || 150,
      unit: "g",
      testId: "progress-protein"
    },
    {
      icon: Wheat,
      label: "Carbs",
      consumed: consumed.carbs,
      target: activeGoals.dailyCarbs || 250,
      unit: "g",
      testId: "progress-carbs"
    },
    {
      icon: Droplets,
      label: "Fat",
      consumed: consumed.fat,
      target: activeGoals.dailyFat || 65,
      unit: "g",
      testId: "progress-fat"
    }
  ];

  // Confetti celebration disabled per user request
  // useEffect(() => {
  //   progressData.forEach(({ label, consumed, target }) => {
  //     const progress = calculateProgress(consumed, target);
  //     const isAchieved = progress >= 100;
  //     const wasAchieved = previousAchievements.current[label] || false;
  //     
  //     if (isAchieved && !wasAchieved) {
  //       triggerConfetti();
  //       console.log(`🎉 ${label} goal achieved! Triggering confetti celebration`);
  //     }
  //     
  //     previousAchievements.current[label] = isAchieved;
  //   });
  // }, [progressData, triggerConfetti]);

  return (
    <div className="relative">
      {/* Tap indicator when collapsed */}
      {!isExpanded && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20 bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2"
        >
          <span>Tap to expand</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </motion.div>
      )}
      
      <div 
        className={`relative ${isExpanded ? 'space-y-6' : ''} cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse nutrition cards" : "Expand nutrition cards"}
      >
        {progressData.map(({ icon: Icon, label, consumed, target, unit, testId }, index) => {
          const progress = calculateProgress(consumed, target);
          const progressColor = getProgressColor(progress);
          const isAchieved = progress >= 100;
          
          // Define color schemes for each nutrient
          const colorSchemes = {
            'Calories': {
              bg: 'from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10',
              icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
              text: 'text-red-700 dark:text-red-300',
              accent: 'text-red-600 dark:text-red-400'
            },
            'Protein': {
              bg: 'from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10',
              icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
              text: 'text-blue-700 dark:text-blue-300',
              accent: 'text-blue-600 dark:text-blue-400'
            },
            'Carbs': {
              bg: 'from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10',
              icon: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
              text: 'text-orange-700 dark:text-orange-300',
              accent: 'text-orange-600 dark:text-orange-400'
            },
            'Fat': {
              bg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10',
              icon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
              text: 'text-yellow-700 dark:text-yellow-300',
              accent: 'text-yellow-600 dark:text-yellow-400'
            }
          };
          
          const colors = colorSchemes[label as keyof typeof colorSchemes];
          
          // Calculate stacked position when collapsed - using negative margin instead of absolute positioning
          const stackOffset = isExpanded ? 0 : index * 2;
          const stackScale = isExpanded ? 1 : 1 - (index * 0.01);
          const stackOpacity = isExpanded ? 1 : (index === 0 ? 1 : 0.9);
          const stackZIndex = isExpanded ? 10 : (4 - index);
          const negativeMargin = !isExpanded && index > 0 ? '-228px' : '0';
          
          return (
            <motion.div 
              key={label}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ 
                opacity: stackOpacity,
                scale: stackScale,
                y: stackOffset,
                zIndex: stackZIndex
              }}
              transition={{ 
                duration: 0.4,
                ease: "easeOut",
                type: "spring",
                stiffness: 150,
                damping: 20
              }}
              whileHover={isExpanded ? { scale: 1.03, transition: { duration: 0.2 } } : {}}
              className={`relative bg-gradient-to-br ${colors.bg} rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50 overflow-hidden`}
              style={{ 
                pointerEvents: isExpanded || index === 0 ? 'auto' : 'none',
                marginTop: negativeMargin
              }}
              data-testid={testId}
            >
            {/* Decorative background element */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 dark:bg-black/10 rounded-full"></div>
            
            {/* Header with icon and label */}
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center space-x-3">
                <div 
                  className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center shadow-md`}
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${colors.text}`}>{label}</h3>
                  <p className="text-sm text-muted-foreground">Daily Progress</p>
                </div>
              </div>
              
              {isAchieved && (
                <div 
                  className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center space-x-1"
                  role="status"
                  aria-label={`${label} goal achieved`}
                >
                  <span aria-hidden="true">🎯</span>
                  <span>Goal achieved!</span>
                </div>
              )}
            </div>
            
            {/* Large consumption numbers */}
            <div className="mb-4 relative z-10">
              <div className={`text-4xl font-bold ${colors.accent} mb-1`}>
                {Math.round(consumed)}{unit}
                <span className="text-2xl text-muted-foreground font-normal"> / {target}{unit}</span>
              </div>
              <div className={`text-lg font-semibold ${colors.text}`}>
                {Math.round(progress)}% of goal
              </div>
            </div>
            
            {/* Enhanced progress bar */}
            <div className="relative z-10 space-y-2">
              <div 
                className="w-full bg-white/30 dark:bg-black/20 rounded-full h-4 shadow-inner"
                role="progressbar"
                aria-label={`${label} progress`}
                aria-valuenow={Math.round(consumed)}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuetext={`${Math.round(consumed)} of ${target} ${unit}`}
              >
                <div 
                  className={`h-4 rounded-full transition-all duration-1000 ease-out ${
                    isAchieved 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                      : `${progressColor.replace('bg-', 'bg-gradient-to-r from-')} to-opacity-80`
                  } shadow-lg`}
                  style={{width: `${Math.min(progress, 100)}%`}}
                  aria-hidden="true"
                />
              </div>
              
              {/* Progress indicator */}
              <div className="flex justify-between items-center">
                <div className={`text-sm font-medium ${colors.text}`} aria-live="polite">
                  {progress < 50 ? 'Keep going! 💪' : 
                   progress < 90 ? 'Almost there! 🚀' : 
                   isAchieved ? 'Excellent! ✨' : 'So close! 🎯'}
                </div>
                {!isAchieved && (
                  <div className="text-sm text-muted-foreground" aria-live="polite">
                    {Math.round(target - consumed)}{unit} remaining
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}