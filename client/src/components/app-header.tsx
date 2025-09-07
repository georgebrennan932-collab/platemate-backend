import { Leaf, History, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="modern-card glass-enhanced border-b border-border/50 p-4 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">PlateMate</h1>
        </div>
        <div className="flex items-center space-x-2">
          {isAuthenticated && user && (
            <div className="flex items-center space-x-2 mr-2">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-white/10 to-white/5 dark:from-gray-800/50 dark:to-gray-700/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <User className="h-4 w-4 text-foreground/80" />
                <span className="text-sm font-medium text-foreground/90">
                  {(user as any)?.firstName || (user as any)?.email || 'User'}
                </span>
              </div>
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
