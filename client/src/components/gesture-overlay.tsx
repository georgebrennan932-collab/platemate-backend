import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Zap, RotateCcw, RotateCw, MousePointer2 } from 'lucide-react';

interface GestureIndicator {
  id: string;
  type: 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'shake' | 'tilt-left' | 'tilt-right' | 'double-tap';
  confidence: number;
  timestamp: number;
}

export function GestureOverlay() {
  const [indicators, setIndicators] = useState<GestureIndicator[]>([]);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    // Show hints initially, then hide after 5 seconds
    const hintsTimer = setTimeout(() => setShowHints(false), 5000);
    setShowHints(true);

    return () => clearTimeout(hintsTimer);
  }, []);

  // Function to show gesture feedback
  const showGesture = (type: GestureIndicator['type'], confidence: number) => {
    const id = Date.now().toString();
    const indicator: GestureIndicator = {
      id,
      type,
      confidence,
      timestamp: Date.now()
    };

    setIndicators(prev => [...prev, indicator]);

    // Remove after animation
    setTimeout(() => {
      setIndicators(prev => prev.filter(i => i.id !== id));
    }, 1500);
  };

  // Expose showGesture globally for the gesture service
  useEffect(() => {
    (window as any).showGestureOverlay = showGesture;
    return () => {
      delete (window as any).showGestureOverlay;
    };
  }, []);

  const getGestureIcon = (type: GestureIndicator['type']) => {
    switch (type) {
      case 'swipe-left': return ArrowLeft;
      case 'swipe-right': return ArrowRight;
      case 'swipe-up': return ArrowUp;
      case 'swipe-down': return ArrowDown;
      case 'shake': return Zap;
      case 'tilt-left': return RotateCcw;
      case 'tilt-right': return RotateCw;
      case 'double-tap': return MousePointer2;
      default: return MousePointer2;
    }
  };

  const getGestureColor = (type: GestureIndicator['type']) => {
    switch (type) {
      case 'swipe-left':
      case 'swipe-right':
        return 'bg-blue-500';
      case 'swipe-up':
      case 'swipe-down':
        return 'bg-green-500';
      case 'shake':
        return 'bg-red-500';
      case 'tilt-left':
      case 'tilt-right':
        return 'bg-purple-500';
      case 'double-tap':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getGesturePosition = (type: GestureIndicator['type']) => {
    switch (type) {
      case 'swipe-left':
        return 'left-4 top-1/2 -translate-y-1/2';
      case 'swipe-right':
        return 'right-4 top-1/2 -translate-y-1/2';
      case 'swipe-up':
        return 'top-20 left-1/2 -translate-x-1/2';
      case 'swipe-down':
        return 'bottom-20 left-1/2 -translate-x-1/2';
      case 'shake':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'tilt-left':
        return 'top-1/3 left-8';
      case 'tilt-right':
        return 'top-1/3 right-8';
      case 'double-tap':
        return 'top-2/3 left-1/2 -translate-x-1/2';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Gesture Indicators */}
      <AnimatePresence>
        {indicators.map((indicator) => {
          const Icon = getGestureIcon(indicator.type);
          const colorClass = getGestureColor(indicator.type);
          const positionClass = getGesturePosition(indicator.type);

          return (
            <motion.div
              key={indicator.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`absolute ${positionClass}`}
            >
              <div className={`${colorClass} text-white p-4 rounded-full shadow-lg backdrop-blur-sm`}>
                <Icon className="h-8 w-8" />
              </div>
              
              {/* Confidence indicator */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <div className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  {Math.round(indicator.confidence * 100)}%
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Gesture Hints */}
      <AnimatePresence>
        {showHints && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-40"
          >
            <div className="bg-black/80 backdrop-blur-md text-white p-4 rounded-xl max-w-sm mx-auto">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span className="font-semibold">Gesture Navigation Active</span>
                </div>
                <div className="text-sm space-y-1 text-gray-300">
                  <div>← → Swipe to navigate pages</div>
                  <div>🤳 Shake for quick actions</div>
                  <div>📱 Tilt for menus</div>
                  <div>👆 Double-tap for shortcuts</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page transition effects */}
      <div id="gesture-page-transition" className="fixed inset-0 pointer-events-none z-30">
        {/* This will be used for page transition animations */}
      </div>
    </div>
  );
}