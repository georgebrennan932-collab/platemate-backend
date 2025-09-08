import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { gestureService, type GestureEvent } from '@/lib/gesture-service';
import { soundService } from '@/lib/sound-service';
import { notificationService } from '@/lib/notification-service';

// Navigation routes in order for swipe navigation
const NAVIGATION_ROUTES = [
  '/',           // Scan/Home
  '/diary',      // Diary
  '/calculator', // Calculator
  '/coaching',   // Coaching
  '/goals',      // Goals
  '/injection-advice' // Meds
];

// Quick action routes for gestures
const QUICK_ACTIONS = {
  'shake': '/help',
  'double-tap': '/advice',
  'tilt-left': 'back',
  'tilt-right': 'menu'
};

export function GestureNavigation() {
  const [location, setLocation] = useLocation();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeGestures = async () => {
      const success = await gestureService.initialize();
      if (!success) {
        console.warn('Gesture navigation could not be initialized');
        return;
      }

      const settings = gestureService.getSettings();
      if (!settings.enabled) {
        console.log('Gesture navigation is disabled in settings');
        return;
      }

      // Register gesture handlers
      registerGestureHandlers(settings);
    };

    initializeGestures();

    // Cleanup on unmount
    return () => {
      gestureService.disable();
    };
  }, []);

  const registerGestureHandlers = (settings: any) => {
    // Swipe navigation handlers
    if (settings.swipeNavigation) {
      gestureService.on('swipe-left', handleSwipeLeft);
      gestureService.on('swipe-right', handleSwipeRight);
      gestureService.on('swipe-up', handleSwipeUp);
      gestureService.on('swipe-down', handleSwipeDown);
    }

    // Action gesture handlers
    if (settings.shakeActions) {
      gestureService.on('shake', handleShake);
    }

    if (settings.tiltMenus) {
      gestureService.on('tilt-left', handleTiltLeft);
      gestureService.on('tilt-right', handleTiltRight);
    }

    if (settings.doubleTapActions) {
      gestureService.on('double-tap', handleDoubleTap);
    }
  };

  const handleSwipeLeft = (gesture: GestureEvent) => {
    // Navigate to next page
    const currentIndex = NAVIGATION_ROUTES.indexOf(location);
    if (currentIndex !== -1 && currentIndex < NAVIGATION_ROUTES.length - 1) {
      const nextRoute = NAVIGATION_ROUTES[currentIndex + 1];
      setLocation(nextRoute);
      showGestureOverlay('Swiped to next page', 'swipe-left');
      playGestureSound('swipe');
    }
  };

  const handleSwipeRight = (gesture: GestureEvent) => {
    // Navigate to previous page
    const currentIndex = NAVIGATION_ROUTES.indexOf(location);
    if (currentIndex > 0) {
      const prevRoute = NAVIGATION_ROUTES[currentIndex - 1];
      setLocation(prevRoute);
      showGestureOverlay('Swiped to previous page', 'swipe-right');
      playGestureSound('swipe');
    }
  };

  const handleSwipeUp = (gesture: GestureEvent) => {
    // Scroll to top or show menu
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showGestureOverlay('Scrolled to top', 'swipe-up');
    playGestureSound('whoosh');
  };

  const handleSwipeDown = (gesture: GestureEvent) => {
    // Refresh page or show notifications
    window.location.reload();
    showGestureOverlay('Refreshing page', 'swipe-down');
    playGestureSound('refresh');
  };

  const handleShake = (gesture: GestureEvent) => {
    // Go to help page
    setLocation('/help');
    showGestureOverlay('Opened help', 'shake');
    playGestureSound('shake');
  };

  const handleTiltLeft = (gesture: GestureEvent) => {
    // Go back in history
    if (location !== '/') {
      window.history.back();
      showGestureOverlay('Navigated back', 'tilt-left');
      playGestureSound('back');
    }
  };

  const handleTiltRight = (gesture: GestureEvent) => {
    // Show profile or menu
    const profileButton = document.querySelector('[data-testid="button-profile"]') as HTMLButtonElement;
    if (profileButton) {
      profileButton.click();
      showGestureOverlay('Opened profile', 'tilt-right');
      playGestureSound('menu');
    }
  };

  const handleDoubleTap = (gesture: GestureEvent) => {
    // Quick access to AI advice
    setLocation('/advice');
    showGestureOverlay('Opened AI advice', 'double-tap');
    playGestureSound('tap');
  };

  const showGestureOverlay = (message: string, gestureType: string) => {
    // Show overlay notification
    if ((window as any).showGestureOverlay) {
      (window as any).showGestureOverlay(gestureType as any, 1);
    }
    
    // Show toast notification
    if ((window as any).showToast) {
      (window as any).showToast({
        title: 'Gesture Navigation',
        description: message,
        duration: 2000
      });
    }
  };

  const playGestureSound = (soundType: string) => {
    try {
      switch (soundType) {
        case 'swipe':
          soundService.playSuccess();
          break;
        case 'whoosh':
          soundService.playScan();
          break;
        case 'shake':
          soundService.playNotification();
          break;
        case 'tap':
          soundService.playError(); // Use as tap sound
          break;
        case 'back':
        case 'menu':
        case 'refresh':
          soundService.playSuccess();
          break;
        default:
          soundService.playSuccess();
      }
    } catch (error) {
      console.log('Could not play gesture sound:', error);
    }
  };

  // Component doesn't render anything - it's just for gesture handling
  return null;
}

// Helper function to show gesture overlay (fixes typo)
const showGestureOverlay = (message: string, gestureType: string) => {
  // Show overlay notification
  if ((window as any).showGestureOverlay) {
    (window as any).showGestureOverlay(gestureType as any, 1);
  }
  
  // Show toast notification  
  if ((window as any).showToast) {
    (window as any).showToast({
      title: 'Gesture Navigation',
      description: message,
      duration: 2000
    });
  }
};