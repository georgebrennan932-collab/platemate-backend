import { History, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@shared/schema";
import platemateLogo from "@/assets/platemate-logo.png";
import { StepCounter } from "./step-counter";

export function AppHeader() {
  const { user, isAuthenticated } = useAuth();

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
            {isAuthenticated && <StepCounter />}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2 mr-2">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-white/10 to-white/5 dark:from-gray-800/50 dark:to-gray-700/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <User className="h-4 w-4 text-foreground/80" />
                <span className="text-sm font-medium text-foreground/90">
                  {(user as UserType)?.firstName || (user as UserType)?.email || 'User'}
                </span>
              </div>
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
