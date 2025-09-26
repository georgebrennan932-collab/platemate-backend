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
import { Book, Utensils, Lightbulb, Target, HelpCircle, Calculator, Syringe, Zap, TrendingUp, Mic, MicOff, Plus, Keyboard, Scale } from "lucide-react";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import type { FoodAnalysis, NutritionGoals, DiaryEntry, DiaryEntryWithAnalysis } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";

type AppState = 'camera' | 'processing' | 'results' | 'error';

export function CameraPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentState, setCurrentState] = useState<AppState>('camera');
  const [analysisData, setAnalysisData] = useState<FoodAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<'food' | 'barcode'>('food');
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [showVoiceMealDialog, setShowVoiceMealDialog] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextMealDialog, setShowTextMealDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  
  
  // Persistent confetti celebration state
  const [showPersistentConfetti, setShowPersistentConfetti] = useState(false);
  
  
  // Fetch nutrition goals and diary entries to check for achievements
  const { data: nutritionGoals } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
    retry: false,
  });

  const { data: diaryEntries } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
    retry: false,
  });
  
  // Initialize speech recognition
  useEffect(() => {
    const checkSpeechSupport = () => {
      const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(supported);
    };
    checkSpeechSupport();
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

  const handleAnalysisError = (error: string, errorType: 'food' | 'barcode' = 'food') => {
    soundService.playError();
    setErrorMessage(error);
    setErrorType(errorType);
    setCurrentState('error');
  };

  const handleRetry = () => {
    setCurrentState('camera');
    setAnalysisData(null);
    setErrorMessage('');
    setErrorType('food');
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

  const handleConfirmTextMeal = () => {
    if (!textInput.trim()) return;
    addVoiceMealMutation.mutate({
      foodDescription: textInput.trim(),
      mealType: selectedMealType
    });
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
        notes: `Added via text input: "${foodDescription}"`
      });
      return await diaryResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Added!",
        description: "Your meal has been added to your diary.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      setShowVoiceMealDialog(false);
      setShowTextMealDialog(false);
      setVoiceInput('');
      setTextInput('');
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
    <div className="text-foreground min-h-screen" style={{background: 'var(--bg-gradient)'}}>
      <AppHeader />
      
      {/* Voice and Type Add Buttons */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto px-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={handleVoiceInput}
              disabled={!speechSupported}
              className={`py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 text-white'
                  : speechSupported
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
              data-testid="button-add-voice"
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span className="text-sm">
                {isListening ? 'Listening...' : 'Voice Add'}
              </span>
            </button>
            
            <button
              onClick={() => setShowTextMealDialog(true)}
              className="py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-blue-600 text-white hover:bg-blue-500"
              data-testid="button-add-type"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Type</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link 
              href="/diary?tab=weight"
              className="py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-orange-500 text-white hover:bg-orange-600 hover:scale-[1.02] no-underline"
              data-testid="button-weigh-in"
            >
              <Scale className="h-4 w-4" />
              <span className="text-sm">Weigh In</span>
            </Link>

            <Link href="/advice">
              <button 
                className="w-full vibrant-button hover:scale-[1.02] py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 text-white"
                data-testid="button-diet-advice"
              >
                <Lightbulb className="h-4 w-4" />
                <span className="text-sm">AI Advice</span>
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
            type={errorType}
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
                className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
                data-testid="button-confirm-voice-meal"
              >
                {addVoiceMealMutation.isPending ? 'Adding...' : 'Add Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Meal Dialog */}
      {showTextMealDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/20">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Keyboard className="h-6 w-6 text-primary" />
              </div>
              Add Text Meal
            </h3>
            
            <div className="space-y-6">
              {/* Text Input */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Describe your meal:</label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g., 200g grilled chicken breast with rice"
                  className="w-full p-4 border rounded-xl resize-none h-24 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  data-testid="textarea-text-meal"
                />
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
                      data-testid={`button-text-meal-${meal}`}
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
                onClick={() => setShowTextMealDialog(false)}
                disabled={addVoiceMealMutation.isPending}
                className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
                data-testid="button-cancel-text-meal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTextMeal}
                disabled={addVoiceMealMutation.isPending || !textInput.trim()}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
                data-testid="button-confirm-text-meal"
              >
                {addVoiceMealMutation.isPending ? 'Adding...' : 'Add Meal'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Bottom Help Section */}
      <BottomHelpSection />
      
      {/* Persistent Confetti */}
      {showPersistentConfetti && (
        <ConfettiCelebration 
          trigger={showPersistentConfetti}
          duration={5000} 
          onComplete={() => setShowPersistentConfetti(false)}
        />
      )}
    </div>
  );
}

export default CameraPage;