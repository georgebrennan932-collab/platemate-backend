import { Link, useLocation } from "wouter";
import { Camera, Book, Calculator, Target, ChefHat, Brain, Trophy, Lightbulb, Menu, User, Images, GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function DropdownNavigation() {
  const [location] = useLocation();
  const [position, setPosition] = useState({ x: 16, y: 16 }); // Default top-left

  // Clamp position to viewport bounds
  const clampPosition = (pos: { x: number; y: number }) => {
    const buttonSize = 56; // 14 * 4 (h-14 in tailwind)
    const margin = 8;
    
    const maxX = window.innerWidth - buttonSize - margin;
    const maxY = window.innerHeight - buttonSize - margin;
    
    return {
      x: Math.max(margin, Math.min(pos.x, maxX)),
      y: Math.max(margin, Math.min(pos.y, maxY))
    };
  };

  // Load position from localStorage on mount
  useEffect(() => {
    const defaultPos = { x: 16, y: 16 };
    const stored = localStorage.getItem('dropdown-menu-position');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate that x and y are finite numbers
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number' && 
            Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          // Validate and clamp stored position
          const clamped = clampPosition(parsed);
          setPosition(clamped);
          // Update localStorage if position was clamped
          if (clamped.x !== parsed.x || clamped.y !== parsed.y) {
            localStorage.setItem('dropdown-menu-position', JSON.stringify(clamped));
          }
        } else {
          // Invalid data, reset to default
          setPosition(defaultPos);
          localStorage.setItem('dropdown-menu-position', JSON.stringify(defaultPos));
        }
      } catch (e) {
        console.error('Failed to load menu position:', e);
        // Reset to default on parse error
        setPosition(defaultPos);
        localStorage.setItem('dropdown-menu-position', JSON.stringify(defaultPos));
      }
    }

    // Handle window resize to keep button in bounds
    const handleResize = () => {
      setPosition(current => {
        const clamped = clampPosition(current);
        if (clamped.x !== current.x || clamped.y !== current.y) {
          localStorage.setItem('dropdown-menu-position', JSON.stringify(clamped));
          return clamped;
        }
        return current;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save position to localStorage when it changes
  const handleDragEnd = (event: any, info: any) => {
    const rawX = position.x + info.offset.x;
    const rawY = position.y + info.offset.y;
    
    // Validate before clamping
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
      console.error('Invalid drag position:', { rawX, rawY });
      return;
    }
    
    const newPosition = clampPosition({ x: rawX, y: rawY });
    setPosition(newPosition);
    localStorage.setItem('dropdown-menu-position', JSON.stringify(newPosition));
  };

  const navItems = [
    {
      href: "/",
      icon: Camera,
      label: "Home",
      isActive: location === "/" || location === "/home"
    },
    {
      href: "/diary?tab=diary",
      icon: Book,
      label: "Diary",
      isActive: location === "/diary" || location.startsWith("/diary?")
    },
    {
      href: "/progress-photos",
      icon: Images,
      label: "Progress Photos",
      isActive: location === "/progress-photos"
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
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 50
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            drag
            dragMomentum={false}
            dragElastic={0}
            onDragEnd={handleDragEnd}
            className="h-14 w-14 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-border/50 shadow-lg hover:scale-105 transition-transform relative group inline-flex items-center justify-center cursor-move touch-none"
            data-testid="button-menu"
            aria-label="Open navigation menu (draggable)"
          >
            <Menu className="h-6 w-6" />
            <GripVertical className="h-3 w-3 absolute bottom-0 right-0 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
          </motion.button>
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
    </div>
  );
}
