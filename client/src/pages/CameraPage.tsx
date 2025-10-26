import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/app-header";
import { soundService } from "@/lib/sound-service";
import { CameraInterface } from "@/components/camera-interface";
import { ProcessingState } from "@/components/processing-state";
import { ResultsDisplay } from "@/components/results-display";
import { ErrorState } from "@/components/error-state";
import { DrinksBar } from "@/components/drinks-bar";
import { Link } from "wouter";
import { Book, Utensils, Lightbulb, Target, HelpCircle, Calculator, Syringe, Zap, TrendingUp, Mic, MicOff, Plus, Keyboard, Scale } from "lucide-react";
// Confetti disabled: import { ConfettiCelebration } from "@/components/confetti-celebration";
import type { FoodAnalysis, NutritionGoals, DiaryEntry, DiaryEntryWithAnalysis } from "@shared/schema";
import { DropdownNavigation } from "@/components/dropdown-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";

type AppState = 'camera' | 'processing' | 'results' | 'error';

export function CameraPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
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
  
  // Review state for voice/type entries
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAnalysis, setReviewAnalysis] = useState<FoodAnalysis | null>(null);
  const [reviewDescription, setReviewDescription] = useState('');
  
  
  // Confetti disabled per user request
  // const [showPersistentConfetti, setShowPersistentConfetti] = useState(false);
  
  
  // Fetch nutrition goals and diary entries to check for achievements
  // Only fetch if authenticated
  const { data: nutritionGoals } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: diaryEntries } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    enabled: isAuthenticated,
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
    analyzeTextMutation.mutate({
      foodDescription: voiceInput.trim(),
      source: 'voice'
    });
  };

  const handleConfirmTextMeal = () => {
    if (!textInput.trim()) return;
    analyzeTextMutation.mutate({
      foodDescription: textInput.trim(),
      source: 'text'
    });
  };

  // Step 1: Analyze text (voice or typed) - doesn't save to diary yet
  const analyzeTextMutation = useMutation({
    mutationFn: async ({ foodDescription }: { foodDescription: string, source: string }) => {
      if (!isAuthenticated) {
        throw new Error("Please log in to add meals to your diary");
      }
      
      // Analyze the text-based food description
      const analysisResponse = await apiRequest('POST', '/api/analyze-text', { foodDescription });
      const analysis = await analysisResponse.json();
      return { analysis, foodDescription };
    },
    onSuccess: ({ analysis, foodDescription }) => {
      // Close input dialogs
      setShowVoiceMealDialog(false);
      setShowTextMealDialog(false);
      
      // Show review dialog with analysis
      setReviewAnalysis(analysis);
      setReviewDescription(foodDescription);
      setShowReviewDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to analyze food. Please try again.",
        variant: "destructive",
      });
      console.error("Error analyzing text:", error);
    },
  });

  // Step 2: Save to diary after user reviews and confirms
  const saveToDiaryMutation = useMutation({
    mutationFn: async ({ analysisId, mealType, notes }: { analysisId: string, mealType: string, notes: string }) => {
      const now = new Date();
      const diaryResponse = await apiRequest('POST', '/api/diary', {
        analysisId,
        mealType,
        mealDate: now.toISOString(),
        notes
      });
      return await diaryResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Added!",
        description: "Your meal has been added to your diary.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/streak'] });
      setShowReviewDialog(false);
      setReviewAnalysis(null);
      setVoiceInput('');
      setTextInput('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add meal to diary. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving to diary:", error);
    },
  });

  return (
    <div className="text-foreground min-h-screen" style={{background: 'var(--bg-gradient)'}}>
      <AppHeader />
      
      {/* Voice and Type Add Buttons - Only show if authenticated */}
      {currentState === 'camera' && isAuthenticated && (
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
                disabled={analyzeTextMutation.isPending}
                className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
                data-testid="button-cancel-voice-meal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoiceMeal}
                disabled={analyzeTextMutation.isPending}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
                data-testid="button-confirm-voice-meal"
              >
                {analyzeTextMutation.isPending ? 'Analyzing...' : 'Analyze Meal'}
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
                disabled={analyzeTextMutation.isPending}
                className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
                data-testid="button-cancel-text-meal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTextMeal}
                disabled={analyzeTextMutation.isPending || !textInput.trim()}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
                data-testid="button-confirm-text-meal"
              >
                {analyzeTextMutation.isPending ? 'Analyzing...' : 'Analyze Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Dialog - Shows AI analysis before saving to diary */}
      {showReviewDialog && reviewAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card rounded-2xl p-5 w-full max-w-md shadow-2xl border border-border/20 my-8">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Review & Edit
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              "{reviewDescription}"
            </p>
            
            {/* Detected Foods - Editable */}
            <div className="space-y-3 mb-5">
              {reviewAnalysis.detectedFoods.map((food, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 rounded-xl p-3 border border-purple-200/50 dark:border-purple-700/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{food.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{food.portion}</p>
                    </div>
                    <button
                      onClick={() => {
                        // TODO: Add edit functionality
                        toast({
                          title: "Coming Soon",
                          description: "Individual food editing will be available soon!",
                        });
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    >
                      Edit
                    </button>
                  </div>
                  
                  {/* Nutrition Values - Inline */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-orange-600">{food.calories}</div>
                      <div className="text-[10px] text-muted-foreground">cal</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-600">{food.protein}g</div>
                      <div className="text-[10px] text-muted-foreground">protein</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-yellow-600">{food.carbs}g</div>
                      <div className="text-[10px] text-muted-foreground">carbs</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-green-600">{food.fat}g</div>
                      <div className="text-[10px] text-muted-foreground">fat</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Nutrition Summary */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">Total Nutrition:</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-base font-bold text-orange-600">{reviewAnalysis.totalCalories}</div>
                  <div className="text-[10px] text-muted-foreground">cal</div>
                </div>
                <div>
                  <div className="text-base font-bold text-blue-600">{reviewAnalysis.totalProtein}g</div>
                  <div className="text-[10px] text-muted-foreground">protein</div>
                </div>
                <div>
                  <div className="text-base font-bold text-yellow-600">{reviewAnalysis.totalCarbs}g</div>
                  <div className="text-[10px] text-muted-foreground">carbs</div>
                </div>
                <div>
                  <div className="text-base font-bold text-green-600">{reviewAnalysis.totalFat}g</div>
                  <div className="text-[10px] text-muted-foreground">fat</div>
                </div>
              </div>
            </div>

            {/* Meal Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Meal Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                  <button
                    key={meal}
                    onClick={() => setSelectedMealType(meal)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                      selectedMealType === meal
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md transform scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    data-testid={`button-review-meal-${meal}`}
                  >
                    {meal.charAt(0).toUpperCase() + meal.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowReviewDialog(false);
                  setReviewAnalysis(null);
                }}
                disabled={saveToDiaryMutation.isPending}
                className="flex-1 py-2.5 px-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
                data-testid="button-cancel-review"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveToDiaryMutation.mutate({
                    analysisId: reviewAnalysis.id,
                    mealType: selectedMealType,
                    notes: `Added via text/voice: "${reviewDescription}"`
                  });
                }}
                disabled={saveToDiaryMutation.isPending}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold text-sm hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
                data-testid="button-save-to-diary"
              >
                {saveToDiaryMutation.isPending ? 'Saving...' : 'Save to Diary'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <DropdownNavigation />
      
      {/* Bottom Help Section */}
      <BottomHelpSection />
      
      {/* Confetti celebration disabled per user request */}
    </div>
  );
}

export default CameraPage;