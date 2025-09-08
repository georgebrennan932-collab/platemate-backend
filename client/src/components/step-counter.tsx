import React, { useState, useEffect } from 'react';
import { Footprints, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface StepData {
  count: number;
  date: string;
  goal: number;
}

export function StepCounter() {
  const [steps, setSteps] = useState<number>(0);
  const [goal, setGoal] = useState<number>(10000);
  const [isOpen, setIsOpen] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayKey = () => new Date().toISOString().split('T')[0];

  // Load today's steps from localStorage
  useEffect(() => {
    const todayKey = getTodayKey();
    const stored = localStorage.getItem(`platemate-steps-${todayKey}`);
    const goalStored = localStorage.getItem('platemate-step-goal');
    
    if (stored) {
      const stepData: StepData = JSON.parse(stored);
      setSteps(stepData.count);
      if (stepData.goal) setGoal(stepData.goal);
    }
    
    if (goalStored) {
      setGoal(parseInt(goalStored));
    }
  }, []);

  // Save steps to localStorage whenever they change
  const saveSteps = (newSteps: number, newGoal?: number) => {
    const todayKey = getTodayKey();
    const stepData: StepData = {
      count: newSteps,
      date: todayKey,
      goal: newGoal || goal
    };
    
    localStorage.setItem(`platemate-steps-${todayKey}`, JSON.stringify(stepData));
    if (newGoal) {
      localStorage.setItem('platemate-step-goal', newGoal.toString());
    }
  };

  const addSteps = (amount: number) => {
    const newSteps = Math.max(0, steps + amount);
    setSteps(newSteps);
    saveSteps(newSteps);
  };

  const updateGoal = (newGoal: number) => {
    const goalValue = Math.max(1000, newGoal);
    setGoal(goalValue);
    saveSteps(steps, goalValue);
  };

  const resetSteps = () => {
    setSteps(0);
    saveSteps(0);
  };

  const percentage = Math.min((steps / goal) * 100, 100);
  const isGoalReached = steps >= goal;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className={`p-2 rounded-xl backdrop-blur-sm hover:scale-105 smooth-transition border relative overflow-hidden ${
            isGoalReached 
              ? 'bg-gradient-to-br from-green-100/70 to-emerald-200/50 dark:from-emerald-900/30 dark:to-green-800/20 border-green-200/40 dark:border-emerald-700/30' 
              : 'bg-gradient-to-br from-blue-100/50 to-blue-200/30 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200/30 dark:border-blue-700/20'
          }`}
          data-testid="button-step-counter"
          title={`${steps.toLocaleString()} / ${goal.toLocaleString()} steps`}
        >
          {/* Progress background */}
          <div 
            className={`absolute inset-0 ${
              isGoalReached 
                ? 'bg-gradient-to-r from-green-200/30 to-emerald-300/20 dark:from-emerald-600/10 dark:to-green-500/5'
                : 'bg-gradient-to-r from-blue-200/30 to-blue-300/20 dark:from-blue-600/10 dark:to-blue-500/5'
            } transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
          
          {/* Icon and count */}
          <div className="relative flex items-center space-x-1">
            <Footprints className={`h-4 w-4 ${
              isGoalReached 
                ? 'text-green-600 dark:text-emerald-400' 
                : 'text-blue-600 dark:text-blue-400'
            }`} />
            <span className={`text-xs font-bold ${
              isGoalReached 
                ? 'text-green-700 dark:text-emerald-300' 
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {steps >= 1000 ? `${(steps/1000).toFixed(1)}k` : steps}
            </span>
          </div>
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-72 p-4" align="end" sideOffset={5}>
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg">Daily Steps</h3>
            <div className="text-3xl font-bold text-primary">
              {steps.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Goal: {goal.toLocaleString()} steps
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(percentage)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  isGoalReached 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Quick add buttons */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Quick Add</div>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSteps(100)}
                className="text-xs"
              >
                +100
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSteps(500)}
                className="text-xs"
              >
                +500
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => addSteps(1000)}
                className="text-xs"
              >
                +1k
              </Button>
            </div>
          </div>

          {/* Manual adjustment */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Manual Adjust</div>
            <div className="flex items-center justify-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSteps(-100)}
                disabled={steps < 100}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-mono min-w-[60px] text-center">
                {steps}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSteps(100)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Goal setting */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Daily Goal</div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={goal}
                onChange={(e) => updateGoal(parseInt(e.target.value) || 10000)}
                className="flex-1 px-3 py-1 text-sm border rounded-md bg-background"
                min="1000"
                max="50000"
                step="500"
                data-testid="input-step-goal"
              />
              <span className="text-sm text-muted-foreground">steps</span>
            </div>
          </div>

          {/* Reset button */}
          <Button
            variant="outline"
            size="sm"
            onClick={resetSteps}
            className="w-full text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            data-testid="button-reset-steps"
          >
            Reset Today
          </Button>

          {isGoalReached && (
            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm font-medium text-green-700 dark:text-green-300">
                🎉 Goal Reached!
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Great job staying active today!
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}