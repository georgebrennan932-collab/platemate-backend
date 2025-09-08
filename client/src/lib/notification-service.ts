import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

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
      if (!('Notification' in window)) {
        console.log('Web notifications not supported');
        return;
      }

      if (Notification.permission === 'granted') {
        this.hasPermission = true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.hasPermission = permission === 'granted';
      }

      if (this.hasPermission) {
        console.log('✓ Web notifications permission granted');
      } else {
        console.log('✗ Web notifications permission denied');
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

    const hasPermission = await this.initialize();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await this.scheduleDailyCapacitor(config);
      } else {
        await this.scheduleDailyWeb(config);
      }
      
      console.log(`✓ Daily reminder scheduled for ${config.time}`);
      return true;
    } catch (error) {
      console.error('Failed to schedule daily reminder:', error);
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
    const timerId = setTimeout(() => {
      this.showWebNotification(config);
      // Schedule next day's notification
      this.scheduleDailyWeb(config);
    }, timeUntilNotification);

    // Store the scheduled time for reference
    localStorage.setItem('platemate-notification-timer', JSON.stringify({
      scheduledTime: scheduledTime.getTime(),
      config
    }));
  }

  private showWebNotification(config: NotificationConfig): void {
    if (this.hasPermission && 'Notification' in window) {
      const notification = new Notification(config.title, {
        body: config.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'daily-coaching',
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        // Navigate to coaching page if possible
        if (window.location.pathname !== '/coaching') {
          window.location.hash = '#/coaching';
        }
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
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
    const hasPermission = await this.initialize();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    const config: NotificationConfig = {
      title: 'PlateMate Coaching',
      body: 'Test notification - your daily coaching is ready!',
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
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            sound: 'default'
          }
        ]
      });
    } else {
      this.showWebNotification(config);
    }
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