import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { speechService, type VoiceCommand, type SpeechEvent } from '@/lib/speech-service';
import { soundService } from '@/lib/sound-service';

export function SpeechNavigation() {
  const [location, setLocation] = useLocation();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeSpeech = async () => {
      const success = await speechService.initialize();
      if (!success) {
        console.warn('Speech navigation could not be initialized');
        return;
      }

      // Register navigation commands
      registerNavigationCommands();
      
      // Register action commands
      registerActionCommands();
      
      // Set up event handler
      speechService.on(handleSpeechEvent);
    };

    initializeSpeech();

    return () => {
      speechService.stopListening();
    };
  }, []);

  const registerNavigationCommands = () => {
    // Home/Scan page
    speechService.registerCommand('navigate-home', {
      command: 'navigate-home',
      phrases: [
        'go home',
        'go to home',
        'home page',
        'take me home',
        'scan food',
        'go to scan',
        'scan page'
      ],
      action: () => {
        setLocation('/');
        showSpeechFeedback('Navigating to home');
        soundService.playSuccess();
      },
      description: 'Navigate to the home/scan page',
      category: 'navigation'
    });

    // Diary page
    speechService.registerCommand('navigate-diary', {
      command: 'navigate-diary',
      phrases: [
        'go to diary',
        'open diary',
        'show diary',
        'diary page',
        'food diary',
        'my meals'
      ],
      action: () => {
        setLocation('/diary');
        showSpeechFeedback('Opening diary');
        soundService.playSuccess();
      },
      description: 'Navigate to the meal diary',
      category: 'navigation'
    });

    // Calculator page
    speechService.registerCommand('navigate-calculator', {
      command: 'navigate-calculator',
      phrases: [
        'go to calculator',
        'open calculator',
        'nutrition calculator',
        'calorie calculator',
        'calculator page'
      ],
      action: () => {
        setLocation('/calculator');
        showSpeechFeedback('Opening calculator');
        soundService.playSuccess();
      },
      description: 'Navigate to the nutrition calculator',
      category: 'navigation'
    });

    // Goals page
    speechService.registerCommand('navigate-goals', {
      command: 'navigate-goals',
      phrases: [
        'go to goals',
        'open goals',
        'nutrition goals',
        'my goals',
        'goals page',
        'set goals'
      ],
      action: () => {
        setLocation('/goals');
        showSpeechFeedback('Opening goals');
        soundService.playSuccess();
      },
      description: 'Navigate to nutrition goals',
      category: 'navigation'
    });

    // Coaching page
    speechService.registerCommand('navigate-coaching', {
      command: 'navigate-coaching',
      phrases: [
        'go to coaching',
        'open coaching',
        'coach me',
        'coaching page',
        'ai coach',
        'daily coaching'
      ],
      action: () => {
        setLocation('/coaching');
        showSpeechFeedback('Opening AI coaching');
        soundService.playSuccess();
      },
      description: 'Navigate to AI coaching',
      category: 'navigation'
    });

    // Help page
    speechService.registerCommand('navigate-help', {
      command: 'navigate-help',
      phrases: [
        'go to help',
        'open help',
        'help page',
        'get help',
        'need help',
        'how to use'
      ],
      action: () => {
        setLocation('/help');
        showSpeechFeedback('Opening help');
        soundService.playSuccess();
      },
      description: 'Navigate to help and support',
      category: 'navigation'
    });

    // AI Advice page
    speechService.registerCommand('navigate-advice', {
      command: 'navigate-advice',
      phrases: [
        'ai advice',
        'get advice',
        'diet advice',
        'nutrition advice',
        'ask ai',
        'advice page'
      ],
      action: () => {
        setLocation('/advice');
        showSpeechFeedback('Opening AI advice');
        soundService.playSuccess();
      },
      description: 'Get AI diet advice',
      category: 'navigation'
    });

    // Injection advice page
    speechService.registerCommand('navigate-meds', {
      command: 'navigate-meds',
      phrases: [
        'injection advice',
        'medication advice',
        'weight loss meds',
        'ozempic advice',
        'meds page'
      ],
      action: () => {
        setLocation('/injection-advice');
        showSpeechFeedback('Opening medication advice');
        soundService.playSuccess();
      },
      description: 'Get weight loss medication advice',
      category: 'navigation'
    });
  };

  const registerActionCommands = () => {
    // Scroll to top
    speechService.registerCommand('scroll-top', {
      command: 'scroll-top',
      phrases: [
        'scroll to top',
        'go to top',
        'scroll up',
        'top of page'
      ],
      action: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showSpeechFeedback('Scrolling to top');
        soundService.playScan();
      },
      description: 'Scroll to top of page',
      category: 'action'
    });

    // Refresh page
    speechService.registerCommand('refresh-page', {
      command: 'refresh-page',
      phrases: [
        'refresh page',
        'reload page',
        'refresh',
        'reload'
      ],
      action: () => {
        showSpeechFeedback('Refreshing page');
        soundService.playNotification();
        setTimeout(() => window.location.reload(), 1000);
      },
      description: 'Refresh the current page',
      category: 'action'
    });

    // Go back
    speechService.registerCommand('go-back', {
      command: 'go-back',
      phrases: [
        'go back',
        'navigate back',
        'previous page',
        'back',
        'return'
      ],
      action: () => {
        if (location !== '/') {
          window.history.back();
          showSpeechFeedback('Going back');
          soundService.playSuccess();
        }
      },
      description: 'Navigate to previous page',
      category: 'action'
    });

    // Open profile
    speechService.registerCommand('open-profile', {
      command: 'open-profile',
      phrases: [
        'open profile',
        'show profile',
        'user profile',
        'my profile',
        'profile menu'
      ],
      action: () => {
        const profileButton = document.querySelector('[data-testid="button-profile"]') as HTMLButtonElement;
        if (profileButton) {
          profileButton.click();
          showSpeechFeedback('Opening profile');
          soundService.playSuccess();
        }
      },
      description: 'Open user profile menu',
      category: 'action'
    });

    // Start/stop speech listening
    speechService.registerCommand('toggle-listening', {
      command: 'toggle-listening',
      phrases: [
        'stop listening',
        'start listening',
        'toggle voice',
        'voice off',
        'voice on'
      ],
      action: () => {
        if (speechService.isCurrentlyListening()) {
          speechService.stopListening();
          showSpeechFeedback('Voice control disabled');
        } else {
          speechService.startListening(true);
          showSpeechFeedback('Voice control enabled');
        }
        soundService.playNotification();
      },
      description: 'Toggle voice listening on/off',
      category: 'control'
    });
  };

  const handleSpeechEvent = (event: SpeechEvent) => {
    switch (event.type) {
      case 'listening-start':
        showSpeechIndicator(true);
        break;
      case 'listening-end':
        showSpeechIndicator(false);
        break;
      case 'command-recognized':
        showCommandRecognized(event.command || '', event.confidence || 0);
        break;
      case 'no-match':
        showSpeechFeedback('Command not recognized');
        soundService.playError();
        break;
      case 'error':
        showSpeechFeedback(`Speech error: ${event.error}`);
        soundService.playError();
        break;
    }
  };

  const showSpeechFeedback = (message: string) => {
    // Show toast notification
    if ((window as any).showToast) {
      (window as any).showToast({
        title: 'Voice Command',
        description: message,
        duration: 2000
      });
    }
  };

  const showSpeechIndicator = (isListening: boolean) => {
    // Update global speech indicator
    if ((window as any).setSpeechListening) {
      (window as any).setSpeechListening(isListening);
    }
  };

  const showCommandRecognized = (command: string, confidence: number) => {
    // Show command recognition feedback
    if ((window as any).showSpeechCommand) {
      (window as any).showSpeechCommand(command, confidence);
    }
  };

  // Component doesn't render anything - it's just for speech handling
  return null;
}