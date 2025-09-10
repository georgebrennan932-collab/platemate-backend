import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app-header";
import { soundService } from "@/lib/sound-service";
import { CameraInterface } from "@/components/camera-interface";
import { ProcessingState } from "@/components/processing-state";
import { ResultsDisplay } from "@/components/results-display";
import { ErrorState } from "@/components/error-state";
import { DrinksBar } from "@/components/drinks-bar";
import { Link } from "wouter";
import { Book, Utensils, Lightbulb, Target, HelpCircle, Calculator, Syringe, Zap, TrendingUp, Mic, MicOff, Plus, Activity } from "lucide-react";
import { healthConnectService } from "@/lib/health-connect-service";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import type { FoodAnalysis, NutritionGoals, DiaryEntry } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";

type AppState = 'camera' | 'processing' | 'results' | 'error';

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentState, setCurrentState] = useState<AppState>('camera');
  const [analysisData, setAnalysisData] = useState<FoodAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [showVoiceMealDialog, setShowVoiceMealDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  
  // Health Connect state
  const [isHealthConnectConnected, setIsHealthConnectConnected] = useState(false);
  const [lastHealthConnectSync, setLastHealthConnectSync] = useState<Date | null>(null);
  
  // Persistent confetti celebration state
  const [showPersistentConfetti, setShowPersistentConfetti] = useState(false);
  
  // Fetch nutrition goals and diary entries to check for achievements
  const { data: nutritionGoals } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
    retry: false,
  });

  const { data: diaryEntries } = useQuery<DiaryEntry[]>({
    queryKey: ['/api/diary'],
    retry: false,
  });
  
  // Initialize speech recognition and Health Connect
  useEffect(() => {
    const checkSpeechSupport = () => {
      const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(supported);
    };
    checkSpeechSupport();
    
    // Initialize Health Connect
    const initHealthConnect = async () => {
      const connected = await healthConnectService.initialize();
      setIsHealthConnectConnected(connected);
      if (connected) {
        setLastHealthConnectSync(new Date());
      }
    };
    initHealthConnect();
  }, []);

  // Check for achieved goals and trigger persistent confetti
  useEffect(() => {
    const checkForAchievedGoals = () => {
      if (!nutritionGoals || !diaryEntries) return;

      const today = new Date().toISOString().split('T')[0];
      const lastCelebrationKey = `platemate-confetti-${today}`;
      const lastCelebration = localStorage.getItem(lastCelebrationKey);

      if (lastCelebration) return; // Already celebrated today

      // Calculate nutrition progress
      const todayEntries = diaryEntries.filter(entry => 
        entry.mealDate && new Date(entry.mealDate).toDateString() === new Date().toDateString()
      );

      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      todayEntries.forEach(entry => {
        // Note: This will need proper calculation with analysis data in real implementation
        // For now, using placeholder values
        totalCalories += 100; // Placeholder
        totalProtein += 10; // Placeholder
        totalCarbs += 15; // Placeholder
        totalFat += 5; // Placeholder
      });

      // Check if nutrition goals are achieved
      const caloriesAchieved = totalCalories >= (nutritionGoals.dailyCalories || 2000);
      const proteinAchieved = totalProtein >= (nutritionGoals.dailyProtein || 150);

      // Check step goals
      const stepData = localStorage.getItem(`platemate-steps-${today}`);
      let stepsAchieved = false;
      
      if (stepData) {
        const parsed = JSON.parse(stepData);
        stepsAchieved = parsed.count >= parsed.goal;
      }

      // Show confetti if any goal is achieved
      if (caloriesAchieved || proteinAchieved || stepsAchieved) {
        console.log('🎉 Goals achieved! Triggering persistent confetti celebration');
        setShowPersistentConfetti(true);
        
        // Mark as celebrated today
        localStorage.setItem(lastCelebrationKey, new Date().toISOString());
      }
    };

    // Delay check to ensure data is loaded
    const timeoutId = setTimeout(checkForAchievedGoals, 1000);
    return () => clearTimeout(timeoutId);
  }, [nutritionGoals, diaryEntries]);

  const handleAnalysisStart = () => {
    soundService.playScan();
    setCurrentState('processing');
  };

  const handleAnalysisSuccess = (data: FoodAnalysis) => {
    soundService.playSuccess();
    setAnalysisData(data);
    setCurrentState('results');
  };

  const handleAnalysisError = (error: string) => {
    soundService.playError();
    setErrorMessage(error);
    setCurrentState('error');
  };

  const handleRetry = () => {
    setCurrentState('camera');
    setAnalysisData(null);
    setErrorMessage('');
  };

  const handleScanAnother = () => {
    setCurrentState('camera');
    setAnalysisData(null);
  };

  const handleVoiceInput = async () => {
    if (!speechSupported) {
      toast({
        title: "Speech Not Supported",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new (window.SpeechRecognition || (window as any).webkitSpeechRecognition)();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Say your food item and quantity (e.g., '100g salmon')",
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceInput(transcript);
        setShowVoiceMealDialog(true);
        toast({
          title: "Voice captured!",
          description: `Heard: "${transcript}"`,
        });
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Speech Error",
          description: "Could not recognize speech. Please try again.",
          variant: "destructive",
        });
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      toast({
        title: "Speech Error",
        description: "Failed to start speech recognition",
        variant: "destructive",
      });
      setIsListening(false);
    }
  };

  const handleConfirmVoiceMeal = () => {
    if (!voiceInput.trim()) return;
    addVoiceMealMutation.mutate({
      foodDescription: voiceInput.trim(),
      mealType: selectedMealType
    });
  };

  // Step tracker handler - uses built-in motion sensors
  const handleStepTracker = async () => {
    if (!isHealthConnectConnected) {
      // Use built-in step counter with motion sensors
      try {
        const todayKey = new Date().toISOString().split('T')[0];
        
        // Clear any existing motion listeners first
        const existingListeners = document.querySelectorAll('[data-motion-listener]');
        existingListeners.forEach(() => {
          window.removeEventListener('devicemotion', (window as any).currentMotionHandler);
        });
        
        // Start motion tracking
        if ('DeviceMotionEvent' in window) {
          console.log('Starting realistic step detection...');
          let lastStepTime = 0;
          let stepDetectionBuffer: number[] = [];
          
          const handleMotion = (event: DeviceMotionEvent) => {
            const now = Date.now();
            const acc = event.accelerationIncludingGravity;
            
            if (acc) {
              // Calculate total acceleration magnitude
              const magnitude = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2);
              
              // Add to buffer for smoothing
              stepDetectionBuffer.push(magnitude);
              if (stepDetectionBuffer.length > 20) {
                stepDetectionBuffer.shift();
              }
              
              // Only detect steps if we have enough data and enough time has passed
              if (stepDetectionBuffer.length >= 10 && now - lastStepTime > 600) {
                const avgMagnitude = stepDetectionBuffer.reduce((a, b) => a + b, 0) / stepDetectionBuffer.length;
                const currentVariation = Math.abs(magnitude - avgMagnitude);
                
                // Detect significant movement (like a step)
                if (currentVariation > 2.5) {
                  console.log(`Step detected! Magnitude: ${magnitude.toFixed(2)}, Variation: ${currentVariation.toFixed(2)}`);
                  
                  // Get current steps from localStorage and add one
                  const stored = localStorage.getItem(`platemate-steps-${todayKey}`);
                  let currentSteps = 0;
                  if (stored) {
                    try {
                      const stepData = JSON.parse(stored);
                      currentSteps = stepData.count || 0;
                    } catch {}
                  }
                  
                  const newSteps = currentSteps + 1;
                  const stepData = {
                    count: newSteps,
                    date: todayKey,
                    goal: 10000
                  };
                  localStorage.setItem(`platemate-steps-${todayKey}`, JSON.stringify(stepData));
                  lastStepTime = now;
                  
                  console.log(`Total steps: ${newSteps}`);
                }
              }
            }
          };
          
          // Store reference to remove later
          (window as any).currentMotionHandler = handleMotion;
          window.addEventListener('devicemotion', handleMotion);
          
          toast({
            title: "Step Detection Started!",
            description: "Walk normally to track your steps. Double-click step counter to reset and stop tracking.",
          });
        } else {
          toast({
            title: "Motion Sensors Not Available",
            description: "Your device doesn't support motion detection. Use the step counter button to manually track.",
            variant: "destructive"
          });
        }
        
        // Try to connect to Health Connect for enhanced accuracy (optional)
        try {
          const connected = await healthConnectService.authenticate();
          if (connected) {
            setIsHealthConnectConnected(true);
            const result = await healthConnectService.syncWithLocalSteps();
            if (result.synced) {
              setLastHealthConnectSync(new Date());
              toast({
                title: "Enhanced Tracking Enabled",
                description: `Health Connect connected! Now using both motion sensors and Health Connect for maximum accuracy.`,
              });
            }
          }
        } catch (error) {
          // Health Connect not available - continue with built-in tracking
          console.log('Health Connect not available, using built-in motion tracking');
        }
        
      } catch (error) {
        toast({
          title: "Tracking Error",
          description: "Could not start step tracking. Please check your device permissions.",
          variant: "destructive",
        });
      }
    } else {
      // Health Connect is connected, sync data
      try {
        const result = await healthConnectService.syncWithLocalSteps();
        if (result.synced) {
          setLastHealthConnectSync(new Date());
          toast({
            title: "Sync Complete!",
            description: `Updated with ${result.steps} steps from Health Connect`,
          });
        } else {
          toast({
            title: "Already Up to Date",
            description: "Your step count is already synced",
          });
        }
      } catch (error) {
        console.error('Health Connect sync error:', error);
        toast({
          title: "Sync Failed",
          description: "Switching back to built-in motion tracking",
          variant: "default",
        });
        setIsHealthConnectConnected(false);
      }
    }
  };

  const addVoiceMealMutation = useMutation({
    mutationFn: async ({ foodDescription, mealType }: { foodDescription: string, mealType: string }) => {
      // First analyze the text-based food description
      const analysisResponse = await apiRequest('POST', '/api/analyze-text', { foodDescription });
      const analysis = await analysisResponse.json();
      
      // Then create the diary entry with current date/time
      const now = new Date();
      const diaryResponse = await apiRequest('POST', '/api/diary', {
        analysisId: analysis.id,
        mealType,
        mealDate: now.toISOString(),
        notes: `Added via voice: "${foodDescription}"`
      });
      return await diaryResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Added!",
        description: "Your voice meal has been added to your diary.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      setShowVoiceMealDialog(false);
      setVoiceInput('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to add meal from voice. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding voice meal:", error);
    },
  });

  return (
    <div className="bg-background text-foreground min-h-screen">
      <AppHeader />
      
      {/* Quick Actions - Only show when camera is ready */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto px-4 py-2 space-y-4">
          {/* Primary Actions */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              onClick={handleVoiceInput}
              disabled={!speechSupported}
              className={`w-full py-4 px-2 rounded-xl font-medium flex flex-col items-center justify-center space-y-1 group min-h-[80px] transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse scale-105'
                  : speechSupported
                  ? 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-[1.02]'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
              }`}
              data-testid="button-voice-input"
            >
              {isListening ? (
                <MicOff className="h-5 w-5 group-hover:scale-110 smooth-transition" />
              ) : (
                <Mic className="h-5 w-5 group-hover:scale-110 smooth-transition" />
              )}
              <span className="text-xs">
                {isListening ? 'Listening...' : 'Voice Add'}
              </span>
            </button>
            
            <Link href="/advice">
              <button 
                className="w-full gradient-button hover:scale-[1.02] py-4 px-2 rounded-xl font-medium flex flex-col items-center justify-center space-y-1 group min-h-[80px]"
                data-testid="button-diet-advice"
              >
                <Lightbulb className="h-5 w-5 group-hover:scale-110 smooth-transition" />
                <span className="text-xs">AI Advice</span>
              </button>
            </Link>
            <Link href="/help">
              <button 
                className="w-full modern-card hover:scale-[1.02] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200/50 dark:border-indigo-700/30 py-4 px-2 rounded-xl font-medium smooth-transition flex flex-col items-center justify-center space-y-1 group min-h-[80px]"
                data-testid="button-help"
              >
                <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 smooth-transition" />
                <span className="text-xs text-indigo-700 dark:text-indigo-300">Help</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Persistent Quick Actions Bar */}
      {(currentState === 'processing' || currentState === 'results' || currentState === 'error') && (
        <div className="max-w-md mx-auto px-4 py-2 mb-4">
          <div className="flex justify-center space-x-4">
            <Link href="/diary">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" data-testid="quick-diary">
                <Book className="h-4 w-4" />
                <span className="text-sm font-medium">Diary</span>
              </button>
            </Link>
            <Link href="/advice">
              <button className="flex items-center space-x-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors" data-testid="quick-advice">
                <Lightbulb className="h-4 w-4" />
                <span className="text-sm font-medium">Advice</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        {currentState === 'camera' && (
          <CameraInterface
            onAnalysisStart={handleAnalysisStart}
            onAnalysisSuccess={handleAnalysisSuccess}
            onAnalysisError={handleAnalysisError}
          />
        )}
        
        {currentState === 'processing' && <ProcessingState />}
        
        {currentState === 'results' && analysisData && (
          <ResultsDisplay 
            data={analysisData} 
            onScanAnother={handleScanAnother}
          />
        )}
        
        {currentState === 'error' && (
          <ErrorState 
            message={errorMessage}
            onRetry={handleRetry}
          />
        )}
      </div>

      {/* Drinks Bar - Moved to bottom */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto">
          <DrinksBar />
        </div>
      )}
      
      {/* Voice Meal Confirmation Dialog */}
      {showVoiceMealDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/20">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              Add Voice Meal
            </h3>
            
            <div className="space-y-6">
              {/* Voice Input Display */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200/30 dark:border-blue-700/30">
                <label className="block text-sm font-semibold mb-3 text-blue-700 dark:text-blue-300">What you said:</label>
                <div className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/50 p-6 rounded-xl border-3 border-blue-300 dark:border-blue-600 shadow-lg">
                  <p className="text-2xl font-black text-blue-900 dark:text-blue-100 leading-relaxed text-center tracking-wide">
                    "{voiceInput}"
                  </p>
                </div>
              </div>

              {/* Meal Type Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Meal Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                    <button
                      key={meal}
                      onClick={() => setSelectedMealType(meal)}
                      className={`py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                        selectedMealType === meal
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105 border-2 border-green-400'
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      data-testid={`button-voice-meal-${meal}`}
                    >
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowVoiceMealDialog(false)}
                disabled={addVoiceMealMutation.isPending}
                className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
                data-testid="button-cancel-voice-meal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoiceMeal}
                disabled={addVoiceMealMutation.isPending}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-confirm-voice-meal"
              >
                {addVoiceMealMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Add to Diary
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Bottom Help Section */}
      <BottomHelpSection />
      
      {/* Persistent confetti celebration */}
      <ConfettiCelebration 
        trigger={showPersistentConfetti} 
        onComplete={() => setShowPersistentConfetti(false)}
        duration={4000}
        particleCount={80}
      />
    </div>
  );
}
