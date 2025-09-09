import React, { useEffect, useRef } from "react";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { NutritionGoals } from "@shared/schema";
import { ConfettiCelebration, useConfetti } from "@/components/confetti-celebration";

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
  if (!goals) return null;

  // Track previous achievement status to trigger confetti only on new achievements
  const previousAchievements = useRef<Record<string, boolean>>({});
  const { shouldTrigger, triggerConfetti, resetTrigger } = useConfetti();

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
      target: goals.dailyCalories || 2000,
      unit: "",
      testId: "progress-calories"
    },
    {
      icon: Beef,
      label: "Protein",
      consumed: consumed.protein,
      target: goals.dailyProtein || 150,
      unit: "g",
      testId: "progress-protein"
    },
    {
      icon: Wheat,
      label: "Carbs",
      consumed: consumed.carbs,
      target: goals.dailyCarbs || 250,
      unit: "g",
      testId: "progress-carbs"
    },
    {
      icon: Droplets,
      label: "Fat",
      consumed: consumed.fat,
      target: goals.dailyFat || 65,
      unit: "g",
      testId: "progress-fat"
    }
  ];

  // Check for newly achieved goals and trigger confetti
  useEffect(() => {
    progressData.forEach(({ label, consumed, target }) => {
      const progress = calculateProgress(consumed, target);
      const isAchieved = progress >= 100;
      const wasAchieved = previousAchievements.current[label] || false;
      
      if (isAchieved && !wasAchieved) {
        triggerConfetti();
        console.log(`🎉 ${label} goal achieved! Triggering confetti celebration`);
      }
      
      previousAchievements.current[label] = isAchieved;
    });
  }, [progressData, triggerConfetti]);

  return (
    <div className="space-y-4">
      {progressData.map(({ icon: Icon, label, consumed, target, unit, testId }) => {
        const progress = calculateProgress(consumed, target);
        
        return (
          <div key={label} className="space-y-2" data-testid={testId}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{label}</span>
              </div>
              <span className="text-muted-foreground">
                {Math.round(consumed)}{unit} / {target}{unit}
              </span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
              data-testid={`${testId}-bar`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(progress)}% of goal</span>
              {progress >= 100 && (
                <span className="text-green-600 font-medium">Goal achieved! 🎯</span>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Confetti celebration */}
      <ConfettiCelebration 
        trigger={shouldTrigger} 
        onComplete={resetTrigger}
        duration={2500}
        particleCount={40}
      />
    </div>
  );
}