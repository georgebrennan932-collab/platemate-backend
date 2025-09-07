import { Leaf, History } from "lucide-react";

export function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Leaf className="text-2xl h-6 w-6" />
          <h1 className="text-xl font-bold">PlateMate</h1>
        </div>
        <button 
          className="p-2 rounded-full hover:bg-primary/80 transition-colors"
          data-testid="button-history"
        >
          <History className="text-lg h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
