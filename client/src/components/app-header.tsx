import { History, LogOut, User, ChevronDown, ChevronUp, Footprints } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import platemateLogo from "@/assets/platemate-logo.png";
import { useState, useRef, useEffect } from "react";

export function AppHeader() {
  const { user, isAuthenticated } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [steps, setSteps] = useState<number>(0);
  const [goal, setGoal] = useState<number>(10000);
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  // Load current steps from localStorage
  useEffect(() => {
    const loadSteps = () => {
      const todayKey = new Date().toISOString().split('T')[0];
      const stored = localStorage.getItem(`platemate-steps-${todayKey}`);
      const goalStored = localStorage.getItem('platemate-step-goal');
      
      if (stored) {
        try {
          const stepData = JSON.parse(stored);
          setSteps(stepData.count || 0);
          if (stepData.goal) setGoal(stepData.goal);
        } catch {
          setSteps(0);
        }
      }
      
      if (goalStored) {
        setGoal(parseInt(goalStored));
      }
    };

    loadSteps();
    
    // Listen for custom events for real-time updates within the same tab
    const handleStepUpdate = () => {
      loadSteps();
    };
    
    window.addEventListener('platemate-steps-updated', handleStepUpdate);
    
    // Also check every few seconds as fallback
    const interval = setInterval(loadSteps, 2000);
    
    return () => {
      window.removeEventListener('platemate-steps-updated', handleStepUpdate);
      clearInterval(interval);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfile]);

  return (
    <header className="modern-card glass-enhanced border-b border-border/50 p-4 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
            <img 
              src={platemateLogo} 
              alt="PlateMate Logo" 
              className="w-full h-full object-contain"
              data-testid="logo-platemate"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold gradient-text">PlateMate</h1>
            {isAuthenticated && (
              <div 
                className="flex items-center space-x-1 mt-1 px-2 py-1 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200/30 dark:border-blue-700/30 cursor-pointer hover:scale-105 transition-transform relative group"
                onClick={() => {
                  const now = Date.now();
                  const timeSinceLastClick = now - lastClickTime;
                  
                  if (timeSinceLastClick < 500) {
                    // Double click detected - reset steps and stop motion tracking
                    const todayKey = new Date().toISOString().split('T')[0];
                    const stepData = {
                      count: 0,
                      date: todayKey,
                      goal: goal
                    };
                    localStorage.setItem(`platemate-steps-${todayKey}`, JSON.stringify(stepData));
                    setSteps(0);
                    
                    // Trigger custom event for real-time updates
                    window.dispatchEvent(new CustomEvent('platemate-steps-updated'));
                    
                    // Also clear any motion listeners to prevent old counts coming back
                    if ((window as any).currentMotionHandler) {
                      window.removeEventListener('devicemotion', (window as any).currentMotionHandler);
                      (window as any).currentMotionHandler = null;
                    }
                    
                    console.log('Steps reset to 0 and all motion tracking cleared');
                  } else {
                    // Single click - add test steps
                    const todayKey = new Date().toISOString().split('T')[0];
                    const stored = localStorage.getItem(`platemate-steps-${todayKey}`);
                    let currentSteps = 0;
                    if (stored) {
                      try {
                        const stepData = JSON.parse(stored);
                        currentSteps = stepData.count || 0;
                      } catch {}
                    }
                    const newSteps = currentSteps + 50; // Add 50 steps when clicked
                    const stepData = {
                      count: newSteps,
                      date: todayKey,
                      goal: goal
                    };
                    localStorage.setItem(`platemate-steps-${todayKey}`, JSON.stringify(stepData));
                    setSteps(newSteps);
                    
                    // Trigger custom event for real-time updates
                    window.dispatchEvent(new CustomEvent('platemate-steps-updated'));
                    console.log(`Added 50 steps, total: ${newSteps}`);
                  }
                  
                  setLastClickTime(now);
                }}
                title="💡 Click: +50 steps | Double-tap: Reset to 0"
              >
                <Footprints className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {steps >= 1000 ? `${(steps/1000).toFixed(1)}k` : steps}/{goal >= 1000 ? `${(goal/1000).toFixed(1)}k` : goal}
                </span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
                  <div className="text-center">
                    <div className="font-bold">💡 Step Counter Tips</div>
                    <div className="mt-1">Click: +50 steps</div>
                    <div>Double-tap: Reset to 0</div>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isAuthenticated && user ? (
            <div className="relative mr-2" ref={profileRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center space-x-1 p-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 dark:from-gray-800/50 dark:to-gray-700/30 backdrop-blur-sm hover:scale-110 smooth-transition border border-white/10 dark:border-gray-700/30"
                data-testid="button-profile"
                title="Profile"
              >
                <User className="h-5 w-5 text-foreground/80" />
                {showProfile ? (
                  <ChevronUp className="h-3 w-3 text-foreground/60" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-foreground/60" />
                )}
              </button>
              
              {showProfile && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px] backdrop-blur-md z-50">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-foreground/80" />
                    <span className="text-sm font-medium text-foreground/90">
                      {(user as UserType)?.firstName || (user as UserType)?.email || 'User'}
                    </span>
                  </div>
                  {(user as UserType)?.email && (user as UserType)?.firstName && (
                    <div className="text-xs text-foreground/60 mt-1 ml-6">
                      {(user as UserType)?.email}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
          <button 
            className="p-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 dark:from-gray-800/50 dark:to-gray-700/30 backdrop-blur-sm hover:scale-110 smooth-transition border border-white/10 dark:border-gray-700/30"
            data-testid="button-history"
            title="View History"
          >
            <History className="h-5 w-5 text-foreground/80" />
          </button>
          {isAuthenticated && (
            <a href="/api/logout">
              <button 
                className="p-3 rounded-xl bg-gradient-to-br from-red-100/50 to-red-200/30 dark:from-red-900/20 dark:to-red-800/10 backdrop-blur-sm hover:scale-110 smooth-transition border border-red-200/30 dark:border-red-700/20 hover:from-red-200/70 hover:to-red-300/50"
                data-testid="button-logout"
                title="Logout"
              >
                <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
              </button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
