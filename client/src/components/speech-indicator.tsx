import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Brain, CheckCircle } from 'lucide-react';

interface SpeechIndicatorState {
  isListening: boolean;
  lastCommand?: string;
  confidence?: number;
  showCommand?: boolean;
}

export function SpeechIndicator() {
  const [state, setState] = useState<SpeechIndicatorState>({
    isListening: false
  });

  useEffect(() => {
    // Global function to update speech listening state
    (window as any).setSpeechListening = (isListening: boolean) => {
      setState(prev => ({ ...prev, isListening }));
    };

    // Global function to show recognized command
    (window as any).showSpeechCommand = (command: string, confidence: number) => {
      setState(prev => ({
        ...prev,
        lastCommand: command,
        confidence,
        showCommand: true
      }));

      // Hide command after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, showCommand: false }));
      }, 3000);
    };

    return () => {
      delete (window as any).setSpeechListening;
      delete (window as any).showSpeechCommand;
    };
  }, []);

  return (
    <>
      {/* Listening Indicator */}
      <AnimatePresence>
        {state.isListening && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed top-20 right-4 z-50"
          >
            <div className="bg-red-500 text-white p-3 rounded-full shadow-lg backdrop-blur-sm">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Mic className="h-6 w-6" />
              </motion.div>
            </div>
            
            {/* Listening text */}
            <div className="absolute top-full right-0 mt-2 bg-black/80 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
              🎤 Listening...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Recognition Feedback */}
      <AnimatePresence>
        {state.showCommand && state.lastCommand && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-green-500 text-white p-4 rounded-xl shadow-lg backdrop-blur-sm max-w-sm">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Command Recognized</div>
                  <div className="text-xs opacity-90 capitalize">
                    {state.lastCommand.replace(/-/g, ' ')}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    Confidence: {Math.round((state.confidence || 0) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permanent Speech Control Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <SpeechControlButton />
      </div>
    </>
  );
}

function SpeechControlButton() {
  const [isListening, setIsListening] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Import speech service dynamically to avoid SSR issues
    import('@/lib/speech-service').then(({ speechService }) => {
      setIsEnabled(speechService.isSupported());
      
      // Update listening state when speech service changes
      const updateState = () => {
        setIsListening(speechService.isCurrentlyListening());
      };
      
      // Check state periodically
      const interval = setInterval(updateState, 500);
      
      // Update immediately
      updateState();
      
      return () => clearInterval(interval);
    });
  }, []);

  const toggleSpeechListening = async () => {
    const { speechService } = await import('@/lib/speech-service');
    
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    } else {
      // Start listening without continuous mode (single command)
      const started = await speechService.startListening(false);
      if (started) {
        setIsListening(true);
      }
    }
  };

  if (!isEnabled) {
    return null; // Don't show button if speech is not supported
  }

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleSpeechListening}
      className={`p-4 rounded-full shadow-lg backdrop-blur-sm border transition-all duration-300 ${
        isListening
          ? 'bg-red-500 text-white border-red-400 animate-pulse'
          : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
      }`}
      title={isListening ? 'Stop voice control' : 'Start voice control'}
      data-testid="button-speech-control"
    >
      <motion.div
        animate={isListening ? { scale: [1, 1.2, 1] } : { scale: [1, 1.2, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
      >
        {isListening ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </motion.div>
    </motion.button>
  );
}