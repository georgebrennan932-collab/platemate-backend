import { Link, useLocation } from "wouter";
import { Camera, Book, Calculator, Target, ChefHat, Brain, Award } from "lucide-react";
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
      href: "/calculator",
      icon: Calculator,
      label: "Calc",
      isActive: location === "/calculator"
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
      href: "/rewards",
      icon: Award,
      label: "Rewards",
      isActive: location === "/rewards"
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-border/50 z-40 w-full overflow-x-auto">
      <div className="max-w-md mx-auto px-1 py-2 w-full">
        <div className="flex justify-around items-center w-full min-w-fit">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center p-1.5 rounded-lg transition-all duration-200 min-w-0 flex-1 max-w-none text-center",
                    "hover:bg-primary/10 hover:scale-105",
                    item.isActive 
                      ? "text-primary bg-primary/10 scale-105" 
                      : "text-black dark:text-white hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="h-4 w-4 mb-0.5" />
                  <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}