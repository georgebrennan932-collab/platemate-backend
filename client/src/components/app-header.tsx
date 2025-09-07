import { Leaf, History, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Leaf className="text-2xl h-6 w-6" />
          <h1 className="text-xl font-bold">PlateMate</h1>
        </div>
        <div className="flex items-center space-x-2">
          {isAuthenticated && user && (
            <div className="flex items-center space-x-2 mr-2">
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {user.firstName || user.email || 'User'}
                </span>
              </div>
            </div>
          )}
          <button 
            className="p-2 rounded-full hover:bg-primary/80 transition-colors"
            data-testid="button-history"
          >
            <History className="text-lg h-5 w-5" />
          </button>
          {isAuthenticated && (
            <a href="/api/logout">
              <button 
                className="p-2 rounded-full hover:bg-primary/80 transition-colors"
                data-testid="button-logout"
                title="Logout"
              >
                <LogOut className="text-lg h-5 w-5" />
              </button>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
