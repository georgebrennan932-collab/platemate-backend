import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { soundService } from './sound-service';
import { buildApiUrl } from './api-config';

export interface NotificationConfig {
  title: string;
  body: string;
  time: string; // Format: "HH:MM"
  enabled: boolean;
}

class NotificationService {
  private hasPermission = false;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.hasPermission;
    }

    try {
      // Check if we're on mobile (Capacitor) or web
      if (Capacitor.isNativePlatform()) {
        await this.initializeCapacitorNotifications();
      } else {
        await this.initializeWebNotifications();
      }
      
      this.isInitialized = true;
      return this.hasPermission;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  private async initializeCapacitorNotifications(): Promise<void> {
    try {
      // Request permission for local notifications
      const permission = await LocalNotifications.requestPermissions();
      this.hasPermission = permission.display === 'granted';
      
      if (this.hasPermission) {
        console.log('✓ Capacitor notifications permission granted');
      } else {
        console.log('✗ Capacitor notifications permission denied');
      }
    } catch (error) {
      console.error('Capacitor notifications error:', error);
      this.hasPermission = false;
    }
  }

  private async initializeWebNotifications(): Promise<void> {
    try {
      // Check if running in a secure context (required for notifications)
      if (!window.isSecureContext) {
        console.log('Web notifications require secure context (HTTPS)');
        return;
      }

      if (!('Notification' in window)) {
        console.log('Web notifications not supported by this browser');
        return;
      }

      // Check current permission status
      const currentPermission = Notification.permission;
      console.log(`Current notification permission: ${currentPermission}`);

      if (currentPermission === 'granted') {
        this.hasPermission = true;
        console.log('✓ Web notifications permission already granted');
      } else if (currentPermission === 'default') {
        // Only request permission when user explicitly enables notifications
        console.log('Web notifications permission not yet requested');
        this.hasPermission = false;
      } else {
        console.log('✗ Web notifications permission denied');
        this.hasPermission = false;
      }
    } catch (error) {
      console.error('Web notifications error:', error);
      this.hasPermission = false;
    }
  }

  async scheduleDaily(config: NotificationConfig): Promise<boolean> {
    if (!config.enabled) {
      await this.cancelDaily();
      return true;
    }

    // Initialize notification service
    await this.initialize();

    // Request permission if we don't have it and notifications are supported
    if (!Capacitor.isNativePlatform() && 'Notification' in window && !this.hasPermission) {
      await this.requestWebNotificationPermission();
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await this.scheduleDailyCapacitor(config);
      } else {
        await this.scheduleDailyWeb(config);
      }
      
      const permissionStatus = this.hasPermission ? 'with browser notifications' : 'with in-app notifications only';
      console.log(`✓ Daily motivation scheduled for ${config.time} (${permissionStatus})`);
      return true;
    } catch (error) {
      console.error('Failed to schedule daily motivation:', error);
      throw error;
    }
  }

  private async scheduleDailyCapacitor(config: NotificationConfig): Promise<void> {
    // Cancel existing notifications
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    // Parse time
    const [hours, minutes] = config.time.split(':').map(Number);
    
    // Calculate next notification time
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title: config.title,
          body: config.body,
          schedule: {
            at: scheduledTime,
            repeats: true,
            every: 'day'
          },
          sound: 'default',
          actionTypeId: 'COACHING_REMINDER',
          extra: {
            type: 'daily-coaching'
          }
        }
      ]
    });
  }

  private async scheduleDailyWeb(config: NotificationConfig): Promise<void> {
    // Clear existing timer if any
    this.cancelWebTimer();

    // Parse time
    const [hours, minutes] = config.time.split(':').map(Number);
    
    // Calculate milliseconds until next notification
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    // Store timer ID in localStorage for persistence
    const timerId = setTimeout(async () => {
      await this.showWebNotification(config);
      // Schedule next day's notification
      this.scheduleDailyWeb(config);
    }, timeUntilNotification);

    // Store the scheduled time for reference
    localStorage.setItem('platemate-notification-timer', JSON.stringify({
      scheduledTime: scheduledTime.getTime(),
      config
    }));
  }

  private async showWebNotification(config: NotificationConfig): Promise<void> {
    // Always fetch and show motivational content, regardless of notification support
    const motivationalContent = await this.getMotivationalContent();
    
    // Play notification sound
    soundService.playReminder();
    
    // Always show in-app motivation (works without browser permission)
    this.showInAppMotivation(motivationalContent);
    
    // Try browser notification if available (but don't require it)
    if (this.hasPermission && 'Notification' in window && window.isSecureContext) {
      try {
        const notification = new Notification(motivationalContent.title, {
          body: motivationalContent.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'daily-motivation',
          requireInteraction: true,
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          if (window.location.pathname !== '/coaching') {
            window.location.href = '/coaching';
          }
          notification.close();
        };

        // Auto-close after 30 seconds
        setTimeout(() => {
          if (notification) {
            notification.close();
          }
        }, 30000);
        
        console.log('✓ Browser notification shown:', motivationalContent.title);
      } catch (error) {
        console.log('Browser notification failed, but in-app motivation still works:', error);
      }
    } else {
      console.log('Browser notifications not available, using in-app motivation only');
    }
    
    console.log('🌟 Daily motivation delivered:', motivationalContent.body);
  }

  // Method to explicitly request notification permission
  async requestWebNotificationPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return false;
      }

      if (!window.isSecureContext) {
        console.log('Notifications require secure context (HTTPS)');
        return false;
      }

      if (Notification.permission === 'granted') {
        this.hasPermission = true;
        return true;
      }

      if (Notification.permission === 'denied') {
        console.log('Notification permission was denied by user');
        return false;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      
      if (this.hasPermission) {
        console.log('✓ Web notifications permission granted');
      } else {
        console.log('✗ Web notifications permission denied');
      }
      
      return this.hasPermission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  // Method to show a test notification
  async showTestNotification(): Promise<void> {
    const hasPermission = await this.requestWebNotificationPermission();
    
    if (hasPermission) {
      try {
        const notification = new Notification('PlateMate Test', {
          body: '🧪 This is a test notification! Your daily motivation will look like this.',
          icon: '/favicon.ico',
          tag: 'test-notification'
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        setTimeout(() => notification.close(), 5000);
        console.log('Test notification shown');
      } catch (error) {
        console.error('Failed to show test notification:', error);
      }
    } else {
      // Show in-app test instead
      this.showInAppMotivation({
        title: 'PlateMate Test',
        body: '🧪 Browser notifications not available, but in-app motivation works!'
      });
    }
  }

  async cancelDaily(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      } else {
        this.cancelWebTimer();
      }
      
      console.log('✓ Daily reminders cancelled');
    } catch (error) {
      console.error('Failed to cancel daily reminders:', error);
    }
  }

  private cancelWebTimer(): void {
    const storedTimer = localStorage.getItem('platemate-notification-timer');
    if (storedTimer) {
      localStorage.removeItem('platemate-notification-timer');
    }
  }

  async testNotification(): Promise<void> {
    // Initialize but don't require permission for test
    await this.initialize();

    const config: NotificationConfig = {
      title: 'PlateMate Coaching',
      body: 'Test notification - your daily motivation is ready! 🌟',
      time: '00:00',
      enabled: true
    };

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999,
            title: config.title,
            body: config.body,
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default'
          }
        ]
      });
    } else {
      // Show in-app motivation immediately (works without permissions)
      await soundService.playNotification();
      await this.showWebNotification(config);
    }
  }

  // Get motivational content from API
  private async getMotivationalContent(): Promise<{title: string, body: string}> {
    try {
      // Try to fetch daily coaching content
      const response = await fetch(buildApiUrl('/api/coaching/daily'));
      if (response.ok) {
        const data = await response.json();
        return {
          title: '🌟 Daily Motivation',
          body: data.motivation || 'Stay focused on your health goals! Every small step counts.'
        };
      }
    } catch (error) {
      console.log('Could not fetch coaching content, using fallback');
    }
    
    // Fallback motivational quotes
    const fallbackQuotes = [
      'Today is a new opportunity to nourish your body! 💪',
      'Small steps lead to big changes. Keep going! ✨', 
      'Your health journey matters. Stay consistent! 🌱',
      'Fuel your body with intention and watch yourself thrive! 🔥',
      'Every meal is a chance to love yourself better! ❤️'
    ];
    const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    
    return {
      title: '🌟 Daily Motivation',
      body: randomQuote
    };
  }

  // Show in-app motivation toast
  private showInAppMotivation(content: {title: string, body: string}): void {
    // Create a temporary toast element for in-app display
    const toastElement = document.createElement('div');
    toastElement.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow-2xl max-w-sm text-center backdrop-blur-sm border border-white/20';
    toastElement.innerHTML = `
      <div class="font-bold text-lg mb-1">${content.title}</div>
      <div class="text-sm opacity-90">${content.body}</div>
    `;
    
    document.body.appendChild(toastElement);
    
    // Animate in
    toastElement.style.transform = 'translate(-50%, -100%)';
    toastElement.style.opacity = '0';
    
    setTimeout(() => {
      toastElement.style.transition = 'all 0.3s ease-out';
      toastElement.style.transform = 'translate(-50%, 0)';
      toastElement.style.opacity = '1';
    }, 10);
    
    // Remove after 8 seconds
    setTimeout(() => {
      toastElement.style.transition = 'all 0.3s ease-in';
      toastElement.style.transform = 'translate(-50%, -100%)';
      toastElement.style.opacity = '0';
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 300);
    }, 8000);
    
    // Click to dismiss
    toastElement.addEventListener('click', () => {
      toastElement.style.transition = 'all 0.2s ease-in';
      toastElement.style.transform = 'translate(-50%, -100%)';
      toastElement.style.opacity = '0';
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 200);
    });
  }

  // Resume web notifications on app load (for web only)
  resumeWebNotifications(): void {
    if (Capacitor.isNativePlatform()) return;

    const storedTimer = localStorage.getItem('platemate-notification-timer');
    if (storedTimer) {
      try {
        const { scheduledTime, config } = JSON.parse(storedTimer);
        const now = Date.now();
        
        if (scheduledTime > now) {
          // Notification is still pending, reschedule it
          const timeRemaining = scheduledTime - now;
          setTimeout(() => {
            this.showWebNotification(config);
            this.scheduleDailyWeb(config);
          }, timeRemaining);
        } else {
          // Scheduled time has passed, schedule for next day
          this.scheduleDailyWeb(config);
        }
      } catch (error) {
        console.error('Failed to resume web notifications:', error);
        localStorage.removeItem('platemate-notification-timer');
      }
    }
  }
}

export const notificationService = new NotificationService();