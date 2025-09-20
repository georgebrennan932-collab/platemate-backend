import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Book, Utensils, Lightbulb, Target, HelpCircle, Calculator, Syringe, Zap, TrendingUp, Mic, MicOff, Plus, Keyboard, Scale, User, History, LogOut, ChevronDown, ChevronUp, AlertTriangle, Check, X, Info } from "lucide-react";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import type { FoodAnalysis, NutritionGoals, DiaryEntry } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";

type AppState = 'camera' | 'processing' | 'results' | 'error' | 'confirmation';

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('camera');
  const [analysisData, setAnalysisData] = useState<FoodAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [editableFoods, setEditableFoods] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Navigation state
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
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

  const { data: diaryEntries } = useQuery<DiaryEntry[]>({
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

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfile]);

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

      // Show confetti if any goal is achieved
      if (caloriesAchieved || proteinAchieved) {
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

  const handleAnalysisSuccess = (data: any) => {
    // Check if this is a confirmation request (low confidence)
    if (data.type === 'confirmation_required') {
      console.log("⚠️ Low confidence detected, showing confirmation UI:", data);
      soundService.playError(); // Different sound for confirmation needed
      setConfirmationData(data);
      setEditableFoods(Array.isArray(data.suggestedFoods) ? [...data.suggestedFoods] : []); // Initialize editable foods safely
      setCurrentState('confirmation');
      
      // Show user-friendly toast about low confidence
      toast({
        title: `Low Confidence (${data.confidence}%)`,
        description: "AI analysis needs your confirmation. Please review the detected foods.",
        duration: 5000,
      });
    } else {
      // Normal high-confidence analysis
      console.log("✅ High confidence analysis, showing results:", data);
      soundService.playSuccess();
      setAnalysisData(data as FoodAnalysis);
      setCurrentState('results');
    }
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
    setConfirmationData(null);
  };

  const handleScanAnother = () => {
    setCurrentState('camera');
    setAnalysisData(null);
    setConfirmationData(null);
  };

  const handleConfirmAnalysis = async () => {
    if (!confirmationData) return;
    
    try {
      // Call the API to confirm the analysis with edited foods
      const response = await apiRequest('POST', `/api/food-confirmations/${confirmationData.confirmationId}/confirm`, {
        editedFoods: editableFoods // Include the edited foods in the confirmation
      });
      const confirmedAnalysis = await response.json();
      
      // Show the confirmed analysis as results
      soundService.playSuccess();
      setAnalysisData(confirmedAnalysis);
      setConfirmationData(null);
      setEditableFoods([]); // Clear edited foods
      setEditingIndex(null); // Clear editing state
      setCurrentState('results');
      
      toast({
        title: "Analysis Confirmed",
        description: "Your food analysis has been confirmed and saved.",
      });
    } catch (error: any) {
      console.error("Failed to confirm analysis:", error);
      toast({
        title: "Confirmation Failed",
        description: "Failed to confirm the analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectAnalysis = () => {
    setConfirmationData(null);
    setEditableFoods([]); // Clear edited foods
    setEditingIndex(null); // Clear editing state
    setCurrentState('camera');
    
    toast({
      title: "Analysis Rejected",
      description: "You can take a new photo or try again with better lighting.",
    });
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
    <div className="min-h-screen text-foreground" style={{background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)'}}>
      {/* Custom Header for New Design */}
      <div className="px-4 pt-8 pb-6 text-center relative">
        <h1 className="text-5xl font-bold mb-2" style={{color: '#22D3EE'}}>PlateMate</h1>
        <p className="text-lg text-white opacity-90">Voice-powered nutrition companion</p>
        
        {/* Navigation Menu */}
        {isAuthenticated && (
          <div className="absolute top-8 right-4 flex items-center space-x-2">
            <Link href="/diary">
              <button 
                className="p-3 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 border border-white/20"
                data-testid="button-nav-history"
                title="View Diary"
              >
                <History className="h-5 w-5 text-white" />
              </button>
            </Link>
            
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center space-x-1 p-3 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 border border-white/20"
                data-testid="button-nav-profile"
                title="Profile"
              >
                <User className="h-5 w-5 text-white" />
                {showProfile ? (
                  <ChevronUp className="h-3 w-3 text-white/80" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-white/80" />
                )}
              </button>
              
              {showProfile && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px] backdrop-blur-md z-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="h-4 w-4 text-foreground/80" />
                    <span className="text-sm font-medium text-foreground/90">
                      {user?.firstName || user?.email || 'User'}
                    </span>
                  </div>
                  {user?.email && user?.firstName && (
                    <div className="text-xs text-foreground/60 mb-3 ml-6">
                      {user?.email}
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <a href="/api/logout" className="flex items-center space-x-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg p-2 transition-colors" data-testid="button-nav-logout">
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm font-medium">Logout</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 2x2 Action Buttons Grid */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto px-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Voice Add Button */}
            <button
              onClick={handleVoiceInput}
              disabled={!speechSupported}
              className={`py-4 px-6 rounded-2xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 ${
                isListening
                  ? 'bg-red-500 text-white'
                  : speechSupported
                  ? 'text-white hover:opacity-90 transform hover:scale-105'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: isListening ? '#EF4444' : speechSupported ? '#374151' : '#9CA3AF'
              }}
              data-testid="button-add-voice"
            >
              {isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
              <span className="text-base font-bold">
                {isListening ? 'Listening...' : 'Voice Add'}
              </span>
            </button>
            
            {/* Type Button */}
            <button
              onClick={() => setShowTextMealDialog(true)}
              className="py-4 px-6 rounded-2xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 text-white hover:opacity-90 transform hover:scale-105"
              style={{backgroundColor: '#3B82F6'}}
              data-testid="button-add-type"
            >
              <Plus className="h-5 w-5" />
              <span className="text-base font-bold">Type</span>
            </button>

            {/* Weigh In Button */}
            <Link 
              href="/diary?tab=weight"
              className="py-4 px-6 rounded-2xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 text-white hover:opacity-90 transform hover:scale-105 no-underline"
              style={{backgroundColor: '#F97316'}}
              data-testid="button-weigh-in"
            >
              <Scale className="h-5 w-5" />
              <span className="text-base font-bold">Weigh In</span>
            </Link>

            {/* AI Advice Button */}
            <Link href="/advice">
              <button 
                className="w-full py-4 px-6 rounded-2xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 text-white hover:opacity-90 transform hover:scale-105"
                style={{backgroundColor: '#14B8A6'}}
                data-testid="button-diet-advice"
              >
                <Lightbulb className="h-5 w-5" />
                <span className="text-base font-bold">AI Advice</span>
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
        
        {currentState === 'confirmation' && confirmationData && (
          <div className="bg-card rounded-3xl p-6 shadow-2xl border border-border/20">
            {/* Confidence Alert */}
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                    Low Confidence Detection ({confirmationData.confidence}%)
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    The AI analysis has lower confidence. Please review the detected foods and confirm if they look correct.
                  </p>
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {confirmationData.imageUrl && (
              <div className="mb-6">
                <img 
                  src={confirmationData.imageUrl} 
                  alt="Food to confirm" 
                  className="w-full h-48 object-cover rounded-2xl border border-border/20"
                />
              </div>
            )}

            {/* Editable Foods */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Utensils className="h-5 w-5" />
                <span>Detected Foods</span>
              </h4>
              <div className="space-y-3">
                {editableFoods.map((food: any, index: number) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-xl transition-all ${
                      editingIndex === index 
                        ? 'bg-primary/10 border-2 border-primary/30' 
                        : 'bg-secondary/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-1">
                          {editingIndex === index ? (
                            <input
                              type="text"
                              value={food.name}
                              onChange={(e) => {
                                const updated = [...editableFoods];
                                updated[index] = { ...updated[index], name: e.target.value };
                                setEditableFoods(updated);
                              }}
                              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background font-medium"
                              placeholder="e.g., Jacket Potato with Ham and Cheese"
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="font-medium">{food.name}</div>
                              <button
                                onClick={() => setEditingIndex(index)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded opacity-70 hover:opacity-100 transition-opacity"
                                title="Edit food name"
                                data-testid={`button-edit-name-${index}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          {editingIndex === index ? (
                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="text"
                                value={food.portion}
                                onChange={(e) => {
                                  const updated = [...editableFoods];
                                  updated[index] = { ...updated[index], portion: e.target.value };
                                  setEditableFoods(updated);
                                }}
                                className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                                placeholder="e.g., 200g, 1 cup"
                              />
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                data-testid={`button-save-edit-${index}`}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const updated = [...editableFoods];
                                  updated.splice(index, 1);
                                  setEditableFoods(updated);
                                  setEditingIndex(null);
                                }}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Remove this food item"
                                data-testid={`button-remove-food-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <div className="text-sm text-muted-foreground">{food.portion}</div>
                              <button
                                onClick={() => setEditingIndex(index)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded opacity-70 hover:opacity-100 transition-opacity"
                                title="Edit portion"
                                data-testid={`button-edit-portion-${index}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{food.calories} cal</div>
                        <div className="text-xs text-muted-foreground">
                          {food.protein}g protein
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add Missing Food Button */}
              <button
                onClick={() => {
                  const newFood = {
                    name: "New Food Item",
                    portion: "1 serving",
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    icon: "utensils"
                  };
                  setEditableFoods([...editableFoods, newFood]);
                  setEditingIndex(editableFoods.length);
                }}
                className="w-full mt-3 py-3 px-4 border-2 border-dashed border-primary/30 text-primary hover:border-primary/50 hover:bg-primary/5 rounded-xl font-medium transition-all flex items-center justify-center space-x-2"
                data-testid="button-add-missing-food"
              >
                <Plus className="h-5 w-5" />
                <span>Add Missing Food Item</span>
              </button>
            </div>

            {/* Confirmation Actions */}
            <div className="space-y-3">
              <button
                onClick={handleConfirmAnalysis}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                data-testid="button-confirm-analysis"
              >
                <Check className="h-5 w-5" />
                <span>Confirm Analysis</span>
              </button>
              
              <button
                onClick={handleRejectAnalysis}
                className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                data-testid="button-reject-analysis"
              >
                <X className="h-5 w-5" />
                <span>Take New Photo</span>
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> For better accuracy, ensure good lighting and place a reference object (like a fork or coin) in the photo for scale.
                </div>
              </div>
            </div>
          </div>
        )}
        
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

      {/* Text Meal Input Dialog */}
      {showTextMealDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/20">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Keyboard className="h-6 w-6 text-primary" />
              </div>
              Type Your Meal
            </h3>
            
            <div className="space-y-6">
              {/* Text Input Field */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200/30 dark:border-green-700/30">
                <label className="block text-sm font-semibold mb-3 text-black dark:text-white">What did you eat?</label>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g., 100g salmon, 2 slices bread, 1 apple..."
                  className="w-full p-4 rounded-xl border-2 border-green-300 dark:border-green-600 bg-white dark:bg-gray-900 text-lg font-medium focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                  data-testid="input-text-meal"
                  autoFocus
                />
              </div>

              {/* Meal Type Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Meal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                    <button
                      key={meal}
                      onClick={() => setSelectedMealType(meal)}
                      className={`py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                        selectedMealType === meal
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md scale-105'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                onClick={() => {
                  setShowTextMealDialog(false);
                  setTextInput('');
                }}
                disabled={addVoiceMealMutation.isPending}
                className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 disabled:opacity-50"
                data-testid="button-cancel-text-meal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTextMeal}
                disabled={addVoiceMealMutation.isPending || !textInput.trim()}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-confirm-text-meal"
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
