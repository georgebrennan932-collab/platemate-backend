import { Link, useLocation } from "wouter";
import { Camera, Book, Calculator, Target, ChefHat, Brain, Trophy, Lightbulb, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DropdownNavigation() {
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
      href: "/calculator",
      icon: Calculator,
      label: "Calculator",
      isActive: location === "/calculator"
    },
    {
      href: "/ai-coach",
      icon: Lightbulb,
      label: "AI Coach",
      isActive: location === "/ai-coach"
    },
    {
      href: "/goals",
      icon: Target,
      label: "Goals",
      isActive: location === "/goals"
    },
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      isActive: location === "/profile"
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="fixed top-4 left-4 z-50 h-12 w-12 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-border/50 shadow-lg hover:scale-105 transition-transform"
          data-testid="button-menu"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-56 ml-4 mt-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-border/50"
        data-testid="dropdown-navigation-menu"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isAICoach = item.href === "/ai-coach";
          return (
            <Link key={item.href} href={item.href}>
              <DropdownMenuItem
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors min-h-[48px]",
                  isAICoach
                    ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold hover:from-teal-700 hover:to-cyan-700 shadow-md"
                    : item.isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-foreground hover:bg-accent"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
                aria-current={item.isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-base">{item.label}</span>
              </DropdownMenuItem>
            </Link>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
