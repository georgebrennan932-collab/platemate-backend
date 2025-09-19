import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as CapacitorSpeechRecognition } from '@capacitor-community/speech-recognition';

export interface VoiceCommand {
  command: string;
  phrases: string[];
  action: () => void;
  description: string;
  category: 'navigation' | 'action' | 'control';
}

export interface SpeechEvent {
  type: 'command-recognized' | 'listening-start' | 'listening-end' | 'error' | 'no-match';
  command?: string;
  confidence?: number;
  transcript?: string;
  error?: string;
}

export type SpeechHandler = (event: SpeechEvent) => void;

class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private isEnabled = false;
  private handlers: SpeechHandler[] = [];
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  private continuousMode = false;
  private lastCommandTime = 0;
  private commandTimeout = 5000; // 5 seconds timeout between commands
  private isNativePlatform = false;

  async initialize(): Promise<boolean> {
    try {
      this.isNativePlatform = Capacitor.isNativePlatform();
      
      if (this.isNativePlatform) {
        // Use Capacitor Speech Recognition for mobile
        try {
          await CapacitorSpeechRecognition.requestPermissions();
          const available = await CapacitorSpeechRecognition.available();
          
          if (!available) {
            console.warn('Native speech recognition not available');
            return false;
          }
          
          console.log('✓ Native speech recognition initialized');
          return true;
        } catch (error) {
          console.error('Failed to initialize native speech recognition:', error);
          return false;
        }
      } else {
        // Use Web Speech API for web browsers
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          console.warn('Speech recognition not supported in this browser');
          return false;
        }

        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;

        // Set up event handlers for Web Speech API
        this.recognition.onstart = () => {
          this.isListening = true;
          this.triggerEvent({ type: 'listening-start' });
          console.log('🎤 Speech recognition started');
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.triggerEvent({ type: 'listening-end' });
          console.log('🎤 Speech recognition ended');
          
          // Restart if in continuous mode and still enabled
          if (this.continuousMode && this.isEnabled) {
            setTimeout(() => {
              if (this.isEnabled && !this.isListening) {
                this.startListening();
              }
            }, 1000);
          }
        };

        this.recognition.onresult = (event: any) => {
          const results = Array.from(event.results);
          const lastResult = results[results.length - 1] as any;
          const transcript = lastResult?.[0]?.transcript?.toLowerCase() || '';
          const confidence = lastResult?.[0]?.confidence || 0;

          console.log(`🎤 Speech recognized: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
          
          if (transcript) {
            this.processVoiceCommand(transcript, confidence);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          
          // Don't treat 'aborted' as an error if we deliberately stopped
          if (event.error === 'aborted' && !this.isEnabled) {
            console.log('🎤 Speech recognition properly stopped');
            return;
          }
          
          this.triggerEvent({ 
            type: 'error', 
            error: event.error 
          });
        };

        this.recognition.onnomatch = () => {
          console.log('🎤 No speech match found');
          this.triggerEvent({ type: 'no-match' });
        };

        console.log('✓ Web speech recognition service initialized');
        return true;
      }
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      return false;
    }
  }

  private processVoiceCommand(transcript: string, confidence: number) {
    const now = Date.now();
    
    // Prevent rapid successive commands
    if (now - this.lastCommandTime < 2000) {
      console.log('🎤 Command ignored - too soon after previous command');
      return;
    }

    // Find matching command
    for (const [commandId, voiceCommand] of Array.from(this.voiceCommands.entries())) {
      const matched = voiceCommand.phrases.find((phrase: string) => {
        const words = phrase.toLowerCase().split(' ');
        return words.every((word: string) => transcript.includes(word));
      });

      if (matched && confidence > 0.6) {
        console.log(`🎤 Voice command matched: ${commandId} ("${matched}")`);
        
        this.triggerEvent({
          type: 'command-recognized',
          command: commandId,
          confidence,
          transcript
        });

        // Execute the command
        try {
          voiceCommand.action();
          this.lastCommandTime = now;
          
          // Stop listening after successful command execution (unless in continuous mode)
          if (!this.continuousMode) {
            setTimeout(() => {
              this.stopListening();
            }, 100); // Small delay to ensure feedback is shown
          }
        } catch (error) {
          console.error(`Error executing voice command ${commandId}:`, error);
        }
        return;
      }
    }

    // No command matched
    console.log(`🎤 No matching voice command for: "${transcript}"`);
    this.triggerEvent({ 
      type: 'no-match', 
      transcript 
    });
  }

  registerCommand(id: string, command: VoiceCommand) {
    this.voiceCommands.set(id, command);
    console.log(`🎤 Registered voice command: ${id} - ${command.phrases.join(', ')}`);
  }

  unregisterCommand(id: string) {
    this.voiceCommands.delete(id);
  }

  async startListening(continuous = false): Promise<boolean> {
    if (this.isListening) {
      return false;
    }

    try {
      this.continuousMode = continuous;
      this.isEnabled = true;

      if (this.isNativePlatform) {
        // Use native speech recognition
        this.isListening = true;
        this.triggerEvent({ type: 'listening-start' });
        
        const result = await CapacitorSpeechRecognition.start({
          language: 'en-US',
          maxResults: 3,
          prompt: 'Speak a command',
          partialResults: false,
          popup: true
        });

        // Handle result
        if (result.matches && result.matches.length > 0) {
          const transcript = result.matches[0].toLowerCase();
          const confidence = 0.8; // Native doesn't provide confidence, use default
          
          console.log(`🎤 Native speech recognized: "${transcript}"`);
          this.processVoiceCommand(transcript, confidence);
        }

        this.isListening = false;
        this.triggerEvent({ type: 'listening-end' });
        return true;
      } else {
        // Use Web Speech API
        if (!this.recognition) {
          return false;
        }
        
        this.recognition.start();
        return true;
      }
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
      this.triggerEvent({ type: 'error', error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  stopListening() {
    this.isEnabled = false;
    this.continuousMode = false;
    
    if (this.isNativePlatform) {
      // Stop native speech recognition
      try {
        CapacitorSpeechRecognition.stop();
        console.log('🛑 Native speech recognition stop requested');
      } catch (error) {
        console.warn('Native speech recognition stop error:', error);
      }
    } else if (this.recognition) {
      // Stop Web Speech API
      try {
        this.recognition.stop();
        console.log('🛑 Web speech recognition stop requested');
      } catch (error) {
        console.warn('Web speech recognition stop error (expected):', error);
      }
    }
    
    // Ensure state is updated
    this.isListening = false;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isSpeechEnabled(): boolean {
    return this.isEnabled;
  }

  isSupported(): boolean {
    if (this.isNativePlatform) {
      return true; // Assume native support is available after initialization
    }
    return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  on(handler: SpeechHandler) {
    this.handlers.push(handler);
  }

  off(handler: SpeechHandler) {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  private triggerEvent(event: SpeechEvent) {
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in speech event handler:', error);
      }
    });
  }

  // Get/Set settings
  getSettings() {
    return {
      enabled: localStorage.getItem('platemate-speech-enabled') === 'true',
      continuous: localStorage.getItem('platemate-speech-continuous') === 'true',
      wakeWord: localStorage.getItem('platemate-wake-word') || 'hey platemate',
      voiceConfirmation: localStorage.getItem('platemate-voice-confirmation') !== 'false'
    };
  }

  updateSettings(settings: {
    enabled?: boolean;
    continuous?: boolean;
    wakeWord?: string;
    voiceConfirmation?: boolean;
  }) {
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        localStorage.setItem(`platemate-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value.toString());
      }
    });
  }

  // Get available commands for help
  getAvailableCommands(): VoiceCommand[] {
    return Array.from(this.voiceCommands.values());
  }
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
  }
  
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
  }
}

export const speechService = new SpeechService();