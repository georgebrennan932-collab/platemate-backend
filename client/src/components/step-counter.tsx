import React, { useState, useEffect, useRef } from 'react';
import { Footprints, Plus, Minus, Play, Pause } from 'lucide-react';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';

interface StepData {
  count: number;
  date: string;
  goal: number;
}

export function StepCounter() {
  const [steps, setSteps] = useState<number>(0);
  const [goal, setGoal] = useState<number>(10000);
  const [isOpen, setIsOpen] = useState(false);
  const [isAutoTracking, setIsAutoTracking] = useState<boolean>(false);
  const [hasMotionPermission, setHasMotionPermission] = useState<boolean>(false);
  
  // Motion detection variables
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });
  const stepBuffer = useRef<number[]>([]);
  const lastStepTime = useRef<number>(0);
  const motionListener = useRef<any>(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayKey = () => new Date().toISOString().split('T')[0];

  // Initialize motion sensors and check permissions
  useEffect(() => {
    const initializeMotion = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Motion API doesn't require explicit permissions on mobile
          setHasMotionPermission(true);
          console.log('✓ Motion sensor access available on native');
        } catch (error) {
          console.log('✗ Motion sensor access denied:', error);
          setHasMotionPermission(false);
        }
      } else {
        // Check if DeviceMotionEvent is available on web
        if ('DeviceMotionEvent' in window) {
          setHasMotionPermission(true);
          console.log('✓ Device motion available on web');
        } else {
          console.log('✗ Device motion not available on web');
        }
      }
    };

    initializeMotion();
  }, []);

  // Load today's steps from localStorage
  useEffect(() => {
    const todayKey = getTodayKey();
    const stored = localStorage.getItem(`platemate-steps-${todayKey}`);
    const goalStored = localStorage.getItem('platemate-step-goal');
    const autoTrackingStored = localStorage.getItem('platemate-auto-tracking');
    
    if (stored) {
      const stepData: StepData = JSON.parse(stored);
      setSteps(stepData.count);
      if (stepData.goal) setGoal(stepData.goal);
    }
    
    if (goalStored) {
      setGoal(parseInt(goalStored));
    }

    if (autoTrackingStored === 'true') {
      setIsAutoTracking(true);
    }
  }, []);

  // Step detection algorithm
  const detectStep = (acceleration: { x: number; y: number; z: number }) => {
    const now = Date.now();
    const timeSinceLastStep = now - lastStepTime.current;
    
    // Calculate magnitude of acceleration
    const magnitude = Math.sqrt(
      acceleration.x * acceleration.x +
      acceleration.y * acceleration.y +
      acceleration.z * acceleration.z
    );
    
    // Add to buffer for smoothing
    stepBuffer.current.push(magnitude);
    if (stepBuffer.current.length > 10) {
      stepBuffer.current.shift();
    }
    
    // Calculate average and detect peaks
    const average = stepBuffer.current.reduce((a, b) => a + b, 0) / stepBuffer.current.length;
    const threshold = average + 2; // Adjust sensitivity
    
    // Detect step if magnitude exceeds threshold and enough time has passed
    if (magnitude > threshold && timeSinceLastStep > 300) { // Min 300ms between steps
      lastStepTime.current = now;
      addSteps(1);
    }
    
    lastAcceleration.current = acceleration;
  };

  // Start/stop automatic step tracking
  const toggleAutoTracking = async () => {
    if (!hasMotionPermission) {
      alert('Motion sensor permission is required for automatic step tracking');
      return;
    }

    if (isAutoTracking) {
      // Stop tracking
      if (motionListener.current) {
        if (Capacitor.isNativePlatform()) {
          motionListener.current.remove();
        } else {
          window.removeEventListener('devicemotion', motionListener.current);
        }
        motionListener.current = null;
      }
      setIsAutoTracking(false);
      localStorage.setItem('platemate-auto-tracking', 'false');
    } else {
      // Start tracking
      try {
        if (Capacitor.isNativePlatform()) {
          // Use Capacitor Motion API for native apps
          const listener = await Motion.addListener('accel', (event: any) => {
            detectStep({
              x: event.accelerationIncludingGravity?.x || 0,
              y: event.accelerationIncludingGravity?.y || 0,
              z: event.accelerationIncludingGravity?.z || 0
            });
          });
          motionListener.current = listener;
        } else {
          // Use DeviceMotionEvent for web
          const handleMotion = (event: DeviceMotionEvent) => {
            if (event.accelerationIncludingGravity) {
              detectStep({
                x: event.accelerationIncludingGravity.x || 0,
                y: event.accelerationIncludingGravity.y || 0,
                z: event.accelerationIncludingGravity.z || 0
              });
            }
          };
          
          window.addEventListener('devicemotion', handleMotion);
          motionListener.current = handleMotion;
        }
        
        setIsAutoTracking(true);
        localStorage.setItem('platemate-auto-tracking', 'true');
      } catch (error) {
        console.error('Failed to start motion tracking:', error);
        alert('Failed to start automatic step tracking');
      }
    }
  };

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
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded-lg backdrop-blur-sm hover:scale-105 smooth-transition border relative overflow-hidden ${
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
        <div className="relative flex items-center space-x-1 px-1">
          <Footprints className={`h-3 w-3 ${
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
          {isAutoTracking && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">Daily Steps</h3>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {steps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Goal: {goal.toLocaleString()} steps
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
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
            {/* Auto-tracking toggle */}
            {hasMotionPermission && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Automatic Tracking</div>
                <button
                  onClick={toggleAutoTracking}
                  className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                    isAutoTracking
                      ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
                      : 'bg-gray-50 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {isAutoTracking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span className="text-sm font-medium">
                    {isAutoTracking ? 'Stop Auto Count' : 'Start Auto Count'}
                  </span>
                </button>
                {isAutoTracking && (
                  <div className="text-xs text-green-600 dark:text-green-400 text-center">
                    📱 Automatically counting your steps
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="text-sm font-medium">Manual Add</div>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => addSteps(100)}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  +100
                </button>
                <button 
                  onClick={() => addSteps(500)}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  +500
                </button>
                <button 
                  onClick={() => addSteps(1000)}
                  className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  +1k
                </button>
              </div>
            </div>

            {/* Manual adjustment */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Manual Adjust</div>
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => addSteps(-100)}
                  disabled={steps < 100}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-mono min-w-[60px] text-center">
                  {steps}
                </span>
                <button
                  onClick={() => addSteps(100)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
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
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  min="1000"
                  max="50000"
                  step="500"
                  data-testid="input-step-goal"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">steps</span>
              </div>
            </div>

            {/* Reset button */}
            <button
              onClick={resetSteps}
              className="w-full px-3 py-1 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded"
              data-testid="button-reset-steps"
            >
              Reset Today
            </button>

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

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}