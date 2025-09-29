import { History, LogOut, User, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import platemateLogo from "@/assets/platemate-logo.png";
import { useState, useRef, useEffect } from "react";

export function AppHeader() {
  const { user, isAuthenticated } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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
            <p className="text-xs text-muted-foreground">Voice-powered nutrition companion</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!isAuthenticated && (
            <div className="flex items-center space-x-2">
              <a href="/api/login">
                <button 
                  className="p-2 px-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-sm backdrop-blur-sm hover:scale-105 smooth-transition border border-blue-400/30 shadow-md"
                  data-testid="button-login"
                  title="Sign in with Replit"
                >
                  Sign In
                </button>
              </a>
              <a href="https://replit.com/signup" target="_blank" rel="noopener noreferrer">
                <button 
                  className="p-2 px-4 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium text-sm backdrop-blur-sm hover:scale-105 smooth-transition border border-green-400/30 shadow-md"
                  data-testid="button-signup"
                  title="Create a Replit account"
                >
                  Sign Up
                </button>
              </a>
            </div>
          )}
          {isAuthenticated && user && (
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
          )}
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