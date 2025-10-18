import { Link, useLocation } from "wouter";
import { Camera, Book, Activity, Target, ChefHat, Brain, Trophy, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    {
      href: "/",
      icon: Camera,
      label: "Home",
      isActive: location === "/" || location === "/home"
    },
    {
      href: "/diary",
      icon: Book,
      label: "Diary",
      isActive: location === "/diary"
    },
    {
      href: "/insights",
      icon: Lightbulb,
      label: "Insights",
      isActive: location === "/insights"
    },
    {
      href: "/activity",
      icon: Activity,
      label: "Activity",
      isActive: location === "/activity"
    },
    {
      href: "/coaching",
      icon: Brain,
      label: "Coach",
      isActive: location === "/coaching"
    },
    {
      href: "/goals",
      icon: Target,
      label: "Goals",
      isActive: location === "/goals"
    },
    {
      href: "/recipes",
      icon: ChefHat,
      label: "Recipes",
      isActive: location === "/recipes"
    },
    {
      href: "/challenges",
      icon: Trophy,
      label: "Challenges",
      isActive: location === "/challenges"
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-border/50 z-40 w-full overflow-x-auto">
      {/* Add safe area padding for mobile devices */}
      <div className="max-w-md mx-auto px-2 py-3 pb-6 w-full">
        <div className="flex justify-around items-center w-full min-w-fit gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] text-center touch-manipulation",
                    "hover:bg-primary/10 hover:scale-105 active:scale-95",
                    item.isActive 
                      ? "text-primary bg-primary/10 scale-105" 
                      : "text-black dark:text-white hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  aria-label={`Navigate to ${item.label}`}
                  aria-current={item.isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5 mb-1" aria-hidden="true" />
                  <span className="text-[10px] font-medium whitespace-nowrap leading-tight">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}