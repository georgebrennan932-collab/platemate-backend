import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { googleFitService } from "@/lib/google-fit-service";
import type { FoodAnalysis } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";

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
  
  // Google Fit state
  const [isGoogleFitConnected, setIsGoogleFitConnected] = useState(false);
  const [lastGoogleFitSync, setLastGoogleFitSync] = useState<Date | null>(null);
  
  // Initialize speech recognition and Google Fit
  useEffect(() => {
    const checkSpeechSupport = () => {
      const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(supported);
    };
    checkSpeechSupport();
    
    // Initialize Google Fit
    const initGoogleFit = async () => {
      const connected = await googleFitService.initialize();
      setIsGoogleFitConnected(connected);
      if (connected) {
        setLastGoogleFitSync(googleFitService.getLastSyncTime());
      }
    };
    initGoogleFit();
  }, []);

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

  // Google Fit sync handler
  const handleGoogleFitSync = async () => {
    if (!isGoogleFitConnected) {
      try {
        const connected = await googleFitService.authenticate();
        if (connected) {
          setIsGoogleFitConnected(true);
          const result = await googleFitService.syncWithLocalSteps();
          if (result.synced) {
            setLastGoogleFitSync(new Date());
            toast({
              title: "Google Fit Connected!",
              description: `Synced ${result.steps} steps from Google Fit`,
            });
          }
        }
      } catch (error) {
        toast({
          title: "Connection Failed",
          description: "Could not connect to Google Fit. Check your settings.",
          variant: "destructive",
        });
      }
    } else {
      try {
        const result = await googleFitService.syncWithLocalSteps();
        if (result.synced) {
          setLastGoogleFitSync(new Date());
          toast({
            title: "Sync Complete!",
            description: `Synced ${result.steps} steps from Google Fit`,
          });
        }
      } catch (error) {
        toast({
          title: "Sync Failed",
          description: "Could not sync with Google Fit. Try again later.",
          variant: "destructive",
        });
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
          <div className="grid grid-cols-4 gap-2 mb-6">
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
            
            <button
              onClick={handleGoogleFitSync}
              className={`w-full py-4 px-2 rounded-xl font-medium flex flex-col items-center justify-center space-y-1 group min-h-[80px] transition-all duration-200 ${
                isGoogleFitConnected
                  ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-[1.02]'
                  : 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-[1.02]'
              }`}
              data-testid="button-google-fit"
            >
              <Activity className="h-5 w-5 group-hover:scale-110 smooth-transition" />
              <span className="text-xs">
                {isGoogleFitConnected ? 'Sync Fit' : 'Connect Fit'}
              </span>
              {lastGoogleFitSync && (
                <div className="text-xs opacity-75">
                  {lastGoogleFitSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Add Voice Meal
            </h3>
            
            <div className="space-y-4">
              {/* Voice Input Display */}
              <div className="bg-muted/50 rounded-lg p-3">
                <label className="block text-sm font-medium mb-2">What you said:</label>
                <p className="text-sm font-mono bg-background p-2 rounded border">
                  "{voiceInput}"
                </p>
              </div>

              {/* Meal Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Meal Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                    <button
                      key={meal}
                      onClick={() => setSelectedMealType(meal)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedMealType === meal
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
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
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowVoiceMealDialog(false)}
                disabled={addVoiceMealMutation.isPending}
                className="flex-1 py-2 px-4 border border-input rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
                data-testid="button-cancel-voice-meal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoiceMeal}
                disabled={addVoiceMealMutation.isPending}
                className="flex-1 gradient-button py-2 px-4 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-confirm-voice-meal"
              >
                {addVoiceMealMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
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
      
      {/* Bottom padding to prevent content from being hidden behind bottom nav */}
      <div className="h-20"></div>
    </div>
  );
}
