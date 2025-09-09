import React, { useState, useEffect, useRef } from 'react';
import { Footprints, Plus, Minus, Play, Pause, Activity } from 'lucide-react';
import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';
import { healthConnectService } from '@/lib/health-connect-service';

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
  const [isHealthConnectConnected, setIsHealthConnectConnected] = useState<boolean>(false);
  const [lastHealthConnectSync, setLastHealthConnectSync] = useState<Date | null>(null);
  
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
          setHasMotionPermission(true);
          console.log('✓ Motion sensor access available on native');
        } catch (error) {
          console.log('✗ Motion sensor access denied:', error);
          setHasMotionPermission(false);
        }
      } else {
        // Check if DeviceMotionEvent is available and test it
        if ('DeviceMotionEvent' in window) {
          // Test if motion events actually fire
          const testMotion = () => {
            let motionDetected = false;
            
            const testHandler = (event: DeviceMotionEvent) => {
              if (event.accelerationIncludingGravity) {
                motionDetected = true;
                console.log('✓ Motion events are working');
                setHasMotionPermission(true);
                window.removeEventListener('devicemotion', testHandler);
              }
            };
            
            window.addEventListener('devicemotion', testHandler);
            
            // If no motion after 3 seconds, assume motion isn't available
            setTimeout(() => {
              if (!motionDetected) {
                console.log('✗ Device motion events not firing - motion sensors may not be available');
                setHasMotionPermission(false);
                window.removeEventListener('devicemotion', testHandler);
              }
            }, 3000);
          };

          // Request permission for motion on iOS 13+
          if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            (DeviceMotionEvent as any).requestPermission()
              .then((response: string) => {
                if (response === 'granted') {
                  console.log('✓ Device motion permission granted');
                  testMotion();
                } else {
                  console.log('✗ Device motion permission denied');
                  setHasMotionPermission(false);
                }
              })
              .catch(() => {
                console.log('✗ Error requesting motion permission');
                setHasMotionPermission(false);
              });
          } else {
            // For non-iOS devices, just test directly
            console.log('✓ Device motion available on web - testing...');
            testMotion();
          }
        } else {
          console.log('✗ Device motion not available on web');
          setHasMotionPermission(false);
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

  // Initialize Health Connect integration
  useEffect(() => {
    const initHealthConnect = async () => {
      const connected = await healthConnectService.initialize();
      setIsHealthConnectConnected(connected);
      if (connected) {
        setLastHealthConnectSync(new Date());
        // Auto-sync if connected and it's been more than 30 minutes
        const lastSync = lastHealthConnectSync;
        if (!lastSync || Date.now() - lastSync.getTime() > 30 * 60 * 1000) {
          syncWithHealthConnect();
        }
      }
    };
    initHealthConnect();
  }, []);

  // Step detection algorithm
  const detectStep = (acceleration: { x: number; y: number; z: number }) => {
    const now = Date.now();
    const timeSinceLastStep = now - lastStepTime.current;
    
    // Calculate magnitude of acceleration change (more reliable for step detection)
    const deltaX = acceleration.x - lastAcceleration.current.x;
    const deltaY = acceleration.y - lastAcceleration.current.y;
    const deltaZ = acceleration.z - lastAcceleration.current.z;
    
    const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    
    // Add to buffer for smoothing
    stepBuffer.current.push(magnitude);
    if (stepBuffer.current.length > 20) {
      stepBuffer.current.shift();
    }
    
    // Only start detecting after we have enough data
    if (stepBuffer.current.length >= 5) {
      // Calculate average and detect significant changes
      const average = stepBuffer.current.reduce((a, b) => a + b, 0) / stepBuffer.current.length;
      const threshold = Math.max(0.5, average + 0.3); // Dynamic threshold with minimum
      
      // Debug logging (remove in production)
      if (magnitude > 0.1) {
        console.log(`Motion: ${magnitude.toFixed(2)}, Threshold: ${threshold.toFixed(2)}, Time: ${timeSinceLastStep}`);
      }
      
      // Detect step if magnitude exceeds threshold and enough time has passed
      if (magnitude > threshold && timeSinceLastStep > 400) { // Min 400ms between steps
        console.log('🚶 Step detected!');
        lastStepTime.current = now;
        addSteps(1);
      }
    }
    
    lastAcceleration.current = acceleration;
  };

  // Start/stop automatic step tracking
  const toggleAutoTracking = async () => {
    if (!hasMotionPermission) {
      alert('Motion sensor permission is required for automatic step tracking. On mobile devices, you may need to enable motion access in your browser settings.');
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
      console.log('Step tracking stopped');
    } else {
      // Start tracking
      try {
        // Reset detection variables
        stepBuffer.current = [];
        lastStepTime.current = 0;
        lastAcceleration.current = { x: 0, y: 0, z: 0 };
        
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
          console.log('Capacitor motion listener started');
        } else {
          // Use DeviceMotionEvent for web
          const handleMotion = (event: DeviceMotionEvent) => {
            if (event.accelerationIncludingGravity) {
              // Log raw motion data for debugging
              const acc = event.accelerationIncludingGravity;
              console.log(`Raw motion: x=${acc.x?.toFixed(2)}, y=${acc.y?.toFixed(2)}, z=${acc.z?.toFixed(2)}`);
              
              detectStep({
                x: acc.x || 0,
                y: acc.y || 0,
                z: acc.z || 0
              });
            } else {
              console.log('No acceleration data in motion event');
            }
          };
          
          window.addEventListener('devicemotion', handleMotion);
          motionListener.current = handleMotion;
          console.log('Device motion listener started - shake or walk with your device!');
        }
        
        setIsAutoTracking(true);
        localStorage.setItem('platemate-auto-tracking', 'true');
      } catch (error) {
        console.error('Failed to start motion tracking:', error);
        alert('Failed to start automatic step tracking. Make sure your device supports motion sensors and you\'re using HTTPS.');
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

  // Sync with Health Connect
  const syncWithHealthConnect = async () => {
    if (!isHealthConnectConnected) return;
    
    try {
      const result = await healthConnectService.syncWithLocalSteps();
      if (result.synced) {
        setSteps(result.steps);
        setLastHealthConnectSync(new Date());
        console.log('✓ Health Connect sync completed:', result.steps);
      }
    } catch (error) {
      console.error('Health Connect sync failed:', error);
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
            <div className="space-y-2">
              <div className="text-sm font-medium">Automatic Tracking</div>
              {hasMotionPermission ? (
                <>
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
                      📱 Automatically counting your steps<br/>
                      <span className="text-xs opacity-75">Shake or walk with your device - check console for motion data</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ⚠️ Motion sensors not available
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Use manual step tracking instead
                  </div>
                </div>
              )}
            </div>

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

            {/* Test button for debugging */}
            {isAutoTracking && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Test Detection</div>
                <button
                  onClick={() => {
                    console.log('Test step added');
                    addSteps(1);
                  }}
                  className="w-full px-3 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  Add Test Step
                </button>
              </div>
            )}

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