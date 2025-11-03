import { Link, useLocation } from "wouter";
import { Camera, Book, Calculator, Target, ChefHat, Brain, Trophy, Lightbulb, Menu, User, Images, GripVertical, CalendarClock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

export function DropdownNavigation() {
  const [location] = useLocation();
  const [position, setPosition] = useState({ x: 16, y: 100 }); // Start middle-left
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMountedRef = useRef(true);

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem('nav-menu-position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          if (isMountedRef.current) {
            setPosition(parsed);
          }
        }
      } catch (e) {
        // Silently ignore errors
      }
    }
  }, []);

  // Clamp position to viewport
  const clampToViewport = (x: number, y: number) => {
    const buttonSize = 56; // 14 * 4px
    const margin = 8;
    return {
      x: Math.max(margin, Math.min(x, window.innerWidth - buttonSize - margin)),
      y: Math.max(margin, Math.min(y, window.innerHeight - buttonSize - margin))
    };
  };

  // Start dragging
  const handleDragStart = (clientX: number, clientY: number) => {
    setHasMoved(false);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Handle dragging
  useEffect(() => {
    if (dragStart.x === 0 && dragStart.y === 0) return;

    let moved = false;

    const handleMove = (clientX: number, clientY: number) => {
      if (!isMountedRef.current) return;
      
      try {
        const deltaX = Math.abs(clientX - (position.x + dragStart.x));
        const deltaY = Math.abs(clientY - (position.y + dragStart.y));
        
        // If moved more than 5px, consider it a drag
        if (deltaX > 5 || deltaY > 5) {
          if (!moved) {
            moved = true;
            if (isMountedRef.current) {
              setHasMoved(true);
              setIsDragging(true);
              setDropdownOpen(false);
            }
          }
          
          if (isMountedRef.current) {
            const newPos = clampToViewport(
              clientX - dragStart.x,
              clientY - dragStart.y
            );
            setPosition(newPos);
          }
        }
      } catch (e) {
        // Silently ignore errors during drag
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      if (!isMountedRef.current) return;
      
      try {
        if (moved) {
          localStorage.setItem('nav-menu-position', JSON.stringify(position));
        }
        if (isMountedRef.current) {
          setDragStart({ x: 0, y: 0 });
          setTimeout(() => {
            if (isMountedRef.current) {
              setIsDragging(false);
              setHasMoved(false);
            }
          }, 100);
        }
      } catch (e) {
        // Silently ignore errors
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragStart, position]);

  // Prevent dropdown opening while dragging
  const handleClick = (e: React.MouseEvent) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  // Handle dropdown open/close
  const handleDropdownOpenChange = (open: boolean) => {
    // Don't allow opening if we just dragged
    if (!hasMoved) {
      setDropdownOpen(open);
    }
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
      href: "/shift-planner",
      icon: CalendarClock,
      label: "Shift Planner",
      isActive: location === "/shift-planner"
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
        zIndex: 50,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={buttonRef}
            variant="ghost"
            size="icon"
            className="h-14 w-14 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-border/50 shadow-lg hover:scale-105 transition-transform relative group cursor-move"
            style={{ touchAction: 'none' }}
            data-testid="button-menu"
            aria-label="Open navigation menu (tap) or drag to move"
            onClick={handleClick}
          >
            <Menu className="h-6 w-6" />
            <GripVertical className="h-3 w-3 absolute bottom-0 right-0 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
    </div>
  );
}
