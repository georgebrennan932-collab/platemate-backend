import { Capacitor } from '@capacitor/core';
import { Motion } from '@capacitor/motion';

export interface GestureEvent {
  type: 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'shake' | 'tilt-left' | 'tilt-right' | 'double-tap';
  confidence: number;
  timestamp: number;
  data?: any;
}

export type GestureHandler = (event: GestureEvent) => void;

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
}

class GestureService {
  private isEnabled = false;
  private motionListener: any = null;
  private gestureHandlers: Map<string, GestureHandler[]> = new Map();
  
  // Motion detection variables
  private accelerationBuffer: { x: number; y: number; z: number; timestamp: number }[] = [];
  private lastAcceleration = { x: 0, y: 0, z: 0 };
  private lastGestureTime = 0;
  
  // Touch detection variables
  private touchData: TouchData | null = null;
  private lastTapTime = 0;
  
  // Gesture thresholds
  private readonly SWIPE_THRESHOLD = 50; // Minimum distance for swipe
  private readonly SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity
  private readonly SHAKE_THRESHOLD = 15; // Acceleration threshold for shake
  private readonly TILT_THRESHOLD = 3; // Tilt angle threshold
  private readonly DOUBLE_TAP_DELAY = 300; // Max delay between taps
  private readonly GESTURE_COOLDOWN = 500; // Cooldown between gestures
  
  async initialize(): Promise<boolean> {
    try {
      if (this.isEnabled) {
        return true;
      }

      // Initialize motion detection
      await this.initializeMotionDetection();
      
      // Initialize touch detection
      this.initializeTouchDetection();
      
      this.isEnabled = true;
      console.log('✓ Gesture service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize gesture service:', error);
      return false;
    }
  }

  private async initializeMotionDetection() {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Motion API for native apps
      this.motionListener = await Motion.addListener('accel', (event: any) => {
        this.processMotionData({
          x: event.accelerationIncludingGravity?.x || 0,
          y: event.accelerationIncludingGravity?.y || 0,
          z: event.accelerationIncludingGravity?.z || 0,
          timestamp: Date.now()
        });
      });
    } else {
      // Use DeviceMotionEvent for web
      const handleMotion = (event: DeviceMotionEvent) => {
        if (event.accelerationIncludingGravity) {
          this.processMotionData({
            x: event.accelerationIncludingGravity.x || 0,
            y: event.accelerationIncludingGravity.y || 0,
            z: event.accelerationIncludingGravity.z || 0,
            timestamp: Date.now()
          });
        }
      };
      
      window.addEventListener('devicemotion', handleMotion);
      this.motionListener = handleMotion;
    }
  }

  private initializeTouchDetection() {
    // Touch start
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.touchData = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY
      };
    }, { passive: true });

    // Touch move
    document.addEventListener('touchmove', (e) => {
      if (this.touchData) {
        const touch = e.touches[0];
        this.touchData.currentX = touch.clientX;
        this.touchData.currentY = touch.clientY;
      }
    }, { passive: true });

    // Touch end
    document.addEventListener('touchend', (e) => {
      if (this.touchData) {
        this.processTouchEnd();
        this.touchData = null;
      }
    }, { passive: true });
  }

  private processMotionData(data: { x: number; y: number; z: number; timestamp: number }) {
    // Add to buffer for analysis
    this.accelerationBuffer.push(data);
    if (this.accelerationBuffer.length > 50) {
      this.accelerationBuffer.shift();
    }

    // Check for shake gesture
    this.detectShake(data);
    
    // Check for tilt gesture
    this.detectTilt(data);
    
    this.lastAcceleration = data;
  }

  private detectShake(data: { x: number; y: number; z: number; timestamp: number }) {
    const deltaX = Math.abs(data.x - this.lastAcceleration.x);
    const deltaY = Math.abs(data.y - this.lastAcceleration.y);
    const deltaZ = Math.abs(data.z - this.lastAcceleration.z);
    
    const totalDelta = deltaX + deltaY + deltaZ;
    const now = Date.now();
    
    // Detect rapid movement in multiple directions
    if (totalDelta > this.SHAKE_THRESHOLD && now - this.lastGestureTime > this.GESTURE_COOLDOWN) {
      // Verify it's a continuous shake pattern
      const recentMotions = this.accelerationBuffer.slice(-10);
      const averageDelta = recentMotions.reduce((sum, motion, index) => {
        if (index === 0) return 0;
        const prev = recentMotions[index - 1];
        return sum + Math.abs(motion.x - prev.x) + Math.abs(motion.y - prev.y) + Math.abs(motion.z - prev.z);
      }, 0) / Math.max(1, recentMotions.length - 1);

      if (averageDelta > this.SHAKE_THRESHOLD * 0.5) {
        this.triggerGesture({
          type: 'shake',
          confidence: Math.min(1, totalDelta / (this.SHAKE_THRESHOLD * 2)),
          timestamp: now
        });
        this.lastGestureTime = now;
      }
    }
  }

  private detectTilt(data: { x: number; y: number; z: number; timestamp: number }) {
    const now = Date.now();
    if (now - this.lastGestureTime < this.GESTURE_COOLDOWN) return;

    // Calculate tilt angle based on accelerometer data
    const tiltX = data.x;
    
    if (Math.abs(tiltX) > this.TILT_THRESHOLD) {
      const gestureType = tiltX > 0 ? 'tilt-right' : 'tilt-left';
      this.triggerGesture({
        type: gestureType,
        confidence: Math.min(1, Math.abs(tiltX) / (this.TILT_THRESHOLD * 2)),
        timestamp: now
      });
      this.lastGestureTime = now;
    }
  }

  private processTouchEnd() {
    if (!this.touchData) return;

    const deltaX = this.touchData.currentX - this.touchData.startX;
    const deltaY = this.touchData.currentY - this.touchData.startY;
    const deltaTime = Date.now() - this.touchData.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    const now = Date.now();

    // Check for double tap
    if (distance < 30 && deltaTime < 300) { // Short tap
      if (now - this.lastTapTime < this.DOUBLE_TAP_DELAY) {
        this.triggerGesture({
          type: 'double-tap',
          confidence: 1,
          timestamp: now
        });
        this.lastTapTime = 0; // Reset to prevent triple tap
        return;
      } else {
        this.lastTapTime = now;
      }
    }

    // Check for swipe gestures
    if (distance > this.SWIPE_THRESHOLD && deltaTime < 800) {
      const velocity = distance / deltaTime;
      
      if (velocity > this.SWIPE_VELOCITY_THRESHOLD && now - this.lastGestureTime > this.GESTURE_COOLDOWN) {
        let gestureType: GestureEvent['type'];
        
        // Determine swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          gestureType = deltaX > 0 ? 'swipe-right' : 'swipe-left';
        } else {
          gestureType = deltaY > 0 ? 'swipe-down' : 'swipe-up';
        }
        
        this.triggerGesture({
          type: gestureType,
          confidence: Math.min(1, velocity / (this.SWIPE_VELOCITY_THRESHOLD * 3)),
          timestamp: now,
          data: { distance, velocity, deltaX, deltaY }
        });
        this.lastGestureTime = now;
      }
    }
  }

  private triggerGesture(gesture: GestureEvent) {
    console.log(`🤌 Gesture detected: ${gesture.type} (confidence: ${gesture.confidence.toFixed(2)})`);
    
    const handlers = this.gestureHandlers.get(gesture.type) || [];
    handlers.forEach(handler => {
      try {
        handler(gesture);
      } catch (error) {
        console.error(`Error in gesture handler for ${gesture.type}:`, error);
      }
    });
  }

  on(gestureType: GestureEvent['type'], handler: GestureHandler) {
    if (!this.gestureHandlers.has(gestureType)) {
      this.gestureHandlers.set(gestureType, []);
    }
    this.gestureHandlers.get(gestureType)!.push(handler);
  }

  off(gestureType: GestureEvent['type'], handler: GestureHandler) {
    const handlers = this.gestureHandlers.get(gestureType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async disable() {
    if (!this.isEnabled) return;
    
    if (this.motionListener) {
      if (Capacitor.isNativePlatform()) {
        this.motionListener.remove();
      } else {
        window.removeEventListener('devicemotion', this.motionListener);
      }
      this.motionListener = null;
    }
    
    this.isEnabled = false;
    console.log('✓ Gesture service disabled');
  }

  isGestureEnabled(): boolean {
    return this.isEnabled;
  }

  // Get settings from localStorage
  getSettings() {
    return {
      enabled: localStorage.getItem('platemate-gestures-enabled') === 'true',
      swipeNavigation: localStorage.getItem('platemate-swipe-nav') !== 'false',
      shakeActions: localStorage.getItem('platemate-shake-actions') !== 'false',
      tiltMenus: localStorage.getItem('platemate-tilt-menus') !== 'false',
      doubleTapActions: localStorage.getItem('platemate-double-tap') !== 'false'
    };
  }

  // Save settings to localStorage
  updateSettings(settings: {
    enabled?: boolean;
    swipeNavigation?: boolean;
    shakeActions?: boolean;
    tiltMenus?: boolean;
    doubleTapActions?: boolean;
  }) {
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        localStorage.setItem(`platemate-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value.toString());
      }
    });
  }
}

export const gestureService = new GestureService();