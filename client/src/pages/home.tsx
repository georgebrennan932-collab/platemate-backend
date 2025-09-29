import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/app-header";
import { soundService } from "@/lib/sound-service";
import { CameraInterface } from "@/components/camera-interface";
import { ProcessingState } from "@/components/processing-state";
import { ResultsDisplay } from "@/components/results-display";
import { ErrorState } from "@/components/error-state";
import { DrinksBar } from "@/components/drinks-bar";
import { Link } from "wouter";
import { Book, Utensils, Lightbulb, Target, HelpCircle, Calculator, Syringe, Zap, TrendingUp, Mic, MicOff, Plus, Keyboard, Scale, User, History, LogOut, ChevronDown, ChevronUp, AlertTriangle, Check, X, Info, Flame, Camera, QrCode, Images } from "lucide-react";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import { ScannerModal } from "@/components/scanner-modal";
import { BarcodeScanner } from "@/components/barcode-scanner";
import type { FoodAnalysis, NutritionGoals, DiaryEntry, DiaryEntryWithAnalysis, DrinkEntry } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";
import { ProgressIndicators } from "@/components/progress-indicators";
import { calculateTodayNutrition } from "@/lib/nutrition-calculator";

type AppState = 'camera' | 'processing' | 'results' | 'error' | 'confirmation';

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('camera');
  const [analysisData, setAnalysisData] = useState<FoodAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<'food' | 'barcode'>('food');
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [editableFoods, setEditableFoods] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [showVoiceMealDialog, setShowVoiceMealDialog] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextMealDialog, setShowTextMealDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [textMealInput, setTextMealInput] = useState('');
  const [nutritionUpdateTimer, setNutritionUpdateTimer] = useState<NodeJS.Timeout | null>(null);
  const [nutritionUpdateController, setNutritionUpdateController] = useState<AbortController | null>(null);
  const [nutritionRequestId, setNutritionRequestId] = useState<number>(0);
  
  // Navigation state
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // No voice input functionality on homepage
  
  // Barcode scanner state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  
  // Persistent confetti celebration state
  const [showPersistentConfetti, setShowPersistentConfetti] = useState(false);
  
  
  // Fetch nutrition goals and diary data for consumed values calculation
  const { data: nutritionGoals } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
    retry: false,
    enabled: isAuthenticated, // Enable when authenticated
    throwOnError: false,
  });

  // Fetch diary and drink data to calculate consumed nutrition
  const { data: diaryEntries } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
    enabled: isAuthenticated,
    throwOnError: false,
  });

  const { data: drinkEntries } = useQuery<DrinkEntry[]>({
    queryKey: ['/api/drinks'],
    enabled: isAuthenticated,
    throwOnError: false,
  });

  // Calculate today's consumed nutrition using standardized function
  const todayConsumedNutrition = diaryEntries && drinkEntries 
    ? calculateTodayNutrition(diaryEntries, drinkEntries)
    : { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };

  // Initialize speech recognition
  useEffect(() => {
    const checkSpeechSupport = () => {
      const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(supported);
    };
    checkSpeechSupport();
  }, []);

  // Force data refresh when homepage loads/mounts
  useEffect(() => {
    if (isAuthenticated) {
      // Force fresh data fetch whenever homepage component mounts
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition-goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drinks'] });
    }
  }, [isAuthenticated, queryClient]);
  
  // Handle page visibility/navigation
  useEffect(() => {
    
    // Force refresh data when coming back to page (handles browser back/forward cache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && isAuthenticated) {
        // Page was restored from bfcache, force refresh nutrition goals and diary data
        queryClient.invalidateQueries({ queryKey: ['/api/nutrition-goals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/drinks'] });
        queryClient.refetchQueries({ queryKey: ['/api/nutrition-goals'] });
        queryClient.refetchQueries({ queryKey: ['/api/diary'] });
        queryClient.refetchQueries({ queryKey: ['/api/drinks'] });
      }
    };

    // Refetch data when the page becomes visible (handles navigation back from other pages)
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // Refetch nutrition goals and diary data when page becomes visible
        queryClient.invalidateQueries({ queryKey: ['/api/nutrition-goals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/drinks'] });
      }
    };

    // Also handle when window regains focus
    const handleFocus = () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['/api/nutrition-goals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/drinks'] });
      }
    };

    // Listen for page show events (bfcache restoration)
    window.addEventListener('pageshow', handlePageShow);
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Listen for window focus events
    window.addEventListener('focus', handleFocus);
    
    // Cleanup function to clear any pending nutrition updates
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (nutritionUpdateTimer) {
        clearTimeout(nutritionUpdateTimer);
      }
      if (nutritionUpdateController) {
        nutritionUpdateController.abort();
      }
    };
  }, [isAuthenticated, queryClient]);

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

  // No achievement checking or calorie calculation on homepage

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
    setConfirmationData(null);
  };

  // Gallery selection handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const inputType = event.target.getAttribute('capture') ? 'camera' : 'gallery';
    
    console.log("📁 File selected:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      inputType: inputType
    });

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image file to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // For gallery selection, scroll to camera section and let camera interface handle the analysis
    document.getElementById('camera-section')?.scrollIntoView({ behavior: 'smooth' });
    
    // The camera interface will handle the analysis when the file is processed
    // Reset file input
    event.target.value = '';
  };

  const handleGallerySelect = () => {
    // Use file input for reliable gallery access across all platforms
    fileInputRef.current?.click();
  };

  const handleScanAnother = () => {
    setCurrentState('camera');
    setAnalysisData(null);
    setConfirmationData(null);
  };

  const handleConfirmAnalysis = async () => {
    if (!confirmationData) return;
    
    try {
      // Call the API to confirm the analysis with edited foods using correct endpoint
      const response = await apiRequest('PATCH', `/api/food-confirmations/${confirmationData.confirmationId}`, {
        status: 'confirmed',
        finalFoods: editableFoods.length > 0 ? editableFoods : confirmationData.suggestedFoods,
        userFeedback: null
      });
      const result = await response.json();
      
      // Show the confirmed analysis as results - use finalAnalysis if available
      const analysisToShow = result.finalAnalysis || result.confirmation;
      soundService.playSuccess();
      setAnalysisData(analysisToShow);
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
    
    // Clear any pending nutrition updates
    if (nutritionUpdateTimer) {
      clearTimeout(nutritionUpdateTimer);
      setNutritionUpdateTimer(null);
    }
    if (nutritionUpdateController) {
      nutritionUpdateController.abort();
      setNutritionUpdateController(null);
    }
    
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

  // Debounced nutrition calculation function with race condition protection
  const updateNutritionValues = useCallback(async (foodsToUpdate: any[], requestId: number) => {
    try {
      // Cancel previous request if it exists
      if (nutritionUpdateController) {
        nutritionUpdateController.abort();
      }
      
      // Create new AbortController for this request
      const controller = new AbortController();
      setNutritionUpdateController(controller);
      
      const response = await fetch('/api/calculate-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foods: foodsToUpdate }),
        credentials: 'include',
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Only update if this is still the latest request
      if (requestId === nutritionRequestId && data.foods) {
        // Merge nutrition data while preserving current user edits
        setEditableFoods(currentFoods => {
          return currentFoods.map((currentFood, index) => {
            const updatedFood = data.foods[index];
            if (updatedFood) {
              // Preserve user-edited name and portion, update only nutrition values
              return {
                ...currentFood,
                calories: updatedFood.calories || currentFood.calories,
                protein: updatedFood.protein || currentFood.protein,
                carbs: updatedFood.carbs || currentFood.carbs,
                fat: updatedFood.fat || currentFood.fat
              };
            }
            return currentFood;
          });
        });
      }
      
      // Clear the controller reference
      setNutritionUpdateController(null);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Nutrition request was cancelled');
        return;
      }
      
      console.error('Failed to update nutrition values:', error);
      setNutritionUpdateController(null);
      
      // Show subtle error indication without disrupting user flow
      if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
        console.warn('Authentication required for nutrition updates');
      }
    }
  }, [nutritionUpdateController, nutritionRequestId]);

  // Debounced function to trigger nutrition updates with request versioning
  const scheduleNutritionUpdate = useCallback((foods: any[]) => {
    // Clear existing timer
    if (nutritionUpdateTimer) {
      clearTimeout(nutritionUpdateTimer);
    }
    
    // Increment request ID for race condition protection
    const newRequestId = nutritionRequestId + 1;
    setNutritionRequestId(newRequestId);
    
    // Set new timer with 1 second delay
    const timer = setTimeout(() => {
      updateNutritionValues(foods, newRequestId);
    }, 1000);
    
    setNutritionUpdateTimer(timer);
  }, [nutritionUpdateTimer, updateNutritionValues, nutritionRequestId]);

  // Voice and text meal input removed from homepage - only in diary page

  const barcodeMutation = useMutation({
    mutationFn: async (barcode: string) => {
      console.log("🔍 Looking up barcode:", barcode);
      
      const response = await apiRequest('POST', '/api/barcode', { barcode });
      const result = await response.json();
      console.log("✅ Barcode lookup successful:", result);
      return result;
    },
    onMutate: () => {
      setCurrentState('processing');
    },
    onSuccess: (data: FoodAnalysis) => {
      console.log("🎉 Barcode lookup success:", data);
      setShowBarcodeScanner(false);
      handleAnalysisSuccess(data);
    },
    onError: (error: Error) => {
      console.error("💥 Barcode lookup error:", error);
      
      // If product not found, fallback to manual entry
      if (error.message.includes("Product not found") || error.message.includes("not found")) {
        console.log("🔄 Product not found, opening manual entry fallback");
        setShowBarcodeScanner(false);
        setShowManualEntry(true);
        toast({
          title: "Product Not Found",
          description: "This barcode wasn't found in our database. Please enter the product details manually.",
          variant: "default",
        });
      } else {
        // Other errors
        toast({
          title: "Barcode Scanner Error",
          description: error.message,
          variant: "destructive",
        });
        setShowBarcodeScanner(false);
        handleAnalysisError(error.message, 'barcode');
      }
    },
  });

  const handleBarcodeScanned = (barcode: string) => {
    console.log("📷 Barcode scanned on homepage:", {
      barcode,
      length: barcode.length,
      type: barcode.length === 12 ? 'UPC-A' : barcode.length === 13 ? 'EAN-13' : 'Other'
    });
    barcodeMutation.mutate(barcode);
  };

  // Listen for manual barcode entry events
  useEffect(() => {
    const handleManualBarcodeEvent = () => {
      setShowBarcodeScanner(false);
      setShowManualEntry(true);
    };

    window.addEventListener('open-manual-barcode', handleManualBarcodeEvent);
    return () => window.removeEventListener('open-manual-barcode', handleManualBarcodeEvent);
  }, []);

  return (
    <div className="min-h-screen text-foreground" style={{background: 'var(--bg-gradient)'}}>
      {/* Custom Header for New Design */}
      <div className="px-4 pt-8 pb-6 text-center relative">
        {/* Navigation Menu - moved above title */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
          {isAuthenticated ? (
            <>
              <Link href="/rewards">
                <button 
                  className="p-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 border border-yellow-400/50 shadow-lg hover:shadow-xl transform hover:scale-105"
                  data-testid="button-nav-rewards"
                  title="Rewards & Steps"
                >
                  <Zap className="h-4 w-4 text-white" />
                </button>
              </Link>
              <Link href="/diary">
                <button 
                  className="p-2 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 border border-white/20"
                  data-testid="button-nav-history"
                  title="View Diary"
                >
                  <History className="h-4 w-4 text-white" />
                </button>
              </Link>
              
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center space-x-1 p-2 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 border border-white/20"
                  data-testid="button-nav-profile"
                  title="Profile"
                >
                  <User className="h-4 w-4 text-white" />
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
                    {user?.email && (
                      <div className="text-xs text-foreground/60 mb-3 ml-6">
                        {user.email}
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
            </>
          ) : (
            <a 
              href="/api/login"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 border border-white/20 text-white hover:scale-105 transform"
              data-testid="button-login"
              title="Login with Replit"
            >
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Login</span>
            </a>
          )}
        </div>
        
        <div className="mt-8">
          <h1 className="text-5xl font-bold mb-2 text-white">PlateMate</h1>
          <p className="text-lg text-white opacity-90">Voice-powered nutrition companion</p>
        </div>
      </div>
      
      {/* Featured Rewards Section */}
      <div className="max-w-md mx-auto px-6 mb-6">
        <Link href="/rewards">
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-6 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-300/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full relative">
                  <Zap className="h-8 w-8 text-white animate-pulse" />
                  <div className="absolute inset-0 rounded-full animate-ping bg-yellow-300/30"></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Steps Rewards</h3>
                  <p className="text-white/90 text-sm">Turn steps into earned calories</p>
                </div>
              </div>
              <div className="text-white/80">
                <ChevronDown className="h-6 w-6 transform rotate-[-90deg]" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* All Add Buttons */}
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
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                console.log("📷 CAMERA BUTTON CLICKED - Taking photo");
                document.getElementById('camera-section')?.scrollIntoView({ behavior: 'smooth' });
                // Trigger camera capture
                const cameraPanel = document.querySelector('[data-testid="camera-panel-clickable"]') as HTMLElement;
                if (cameraPanel) {
                  cameraPanel.click();
                }
              }}
              className="py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-blue-600 text-white hover:bg-blue-500"
              data-testid="button-add-camera"
            >
              <Camera className="h-4 w-4" />
              <span className="text-sm">Camera</span>
            </button>
            
            <button
              onClick={handleGallerySelect}
              className="py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-green-600 text-white hover:bg-green-500"
              data-testid="button-add-gallery"
            >
              <Images className="h-4 w-4" />
              <span className="text-sm">Gallery</span>
            </button>
            
            <button
              onClick={() => {
                console.log("🔍 BARCODE BUTTON CLICKED - Opening barcode scanner");
                setShowBarcodeScanner(true);
              }}
              className="py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 bg-orange-500 text-white hover:bg-orange-600"
              data-testid="button-add-barcode"
            >
              <QrCode className="h-4 w-4" />
              <span className="text-sm">Barcode</span>
            </button>
          </div>
        </div>
      )}

      {/* Portion Analysis Tip - positioned near camera button */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto px-6 mt-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl px-4 py-3 inline-block" data-testid="text-scale-advice">
              💡 For more precise portion analysis, place a fork or your hand in the photo.
            </p>
          </div>
        </div>
      )}

      {/* Weight Loss Injection Guide */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto px-6 mb-6">
          <div className="text-center">
            <Link href="/injection-advice">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto border border-blue-200 backdrop-blur-xl w-full" data-testid="button-injection-advice-quick">
              <Syringe className="h-5 w-5" />
              <span>Weight Loss Injection Guide</span>
            </button>
            </Link>
          </div>
        </div>
      )}

      {/* Calories Remaining Box - moved above nutritional values */}
      {currentState === 'camera' && isAuthenticated && nutritionGoals && (
        <div className="max-w-md mx-auto px-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-4">
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1.1, 1.4, 1],
                    rotate: [0, -5, 5, -3, 0],
                    y: [0, -2, 1, -3, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut"
                  }}
                >
                  <Flame className="text-white h-10 w-10" />
                </motion.div>
              </div>
              <div className="text-gray-900 dark:text-gray-100">
                <p className="text-3xl font-bold">{Math.max(0, (nutritionGoals?.dailyCalories || 2000) - todayConsumedNutrition.calories)}</p>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-400">calories remaining</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Nutrition Progress - Shows real consumed values from diary */}
      {isAuthenticated && nutritionGoals && (
        <div className="max-w-md mx-auto px-6 mb-6">
          <ProgressIndicators
            goals={nutritionGoals}
            consumed={todayConsumedNutrition}
          />
        </div>
      )}
      
      {/* 2x2 Action Buttons Grid - Removed Voice and Text Input */}
      {currentState === 'camera' && (
        <div className="max-w-md mx-auto px-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
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
                <Lightbulb className="h-5 w-5 animate-pulse" style={{
                  animation: 'bulbFlicker 3s ease-in-out infinite'
                }} />
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
                <Lightbulb className="h-4 w-4" style={{
                  animation: 'bulbFlicker 3s ease-in-out infinite'
                }} />
                <span className="text-sm font-medium">Advice</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto" id="camera-section">
        {currentState === 'camera' && (
          <CameraInterface
            onAnalysisStart={handleAnalysisStart}
            onAnalysisSuccess={handleAnalysisSuccess}
            onAnalysisError={handleAnalysisError}
            caloriesConsumed={0}
            caloriesGoal={nutritionGoals?.dailyCalories || 2000}
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
                                scheduleNutritionUpdate(updated);
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
                                  scheduleNutritionUpdate(updated);
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
                  const updated = [...editableFoods, newFood];
                  setEditableFoods(updated);
                  setEditingIndex(editableFoods.length);
                  scheduleNutritionUpdate(updated);
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
      

      {/* Camera Barcode Scanner Modal */}
      <ScannerModal
        isOpen={showBarcodeScanner}
        onScanSuccess={(barcode: string) => {
          handleBarcodeScanned(barcode);
        }}
        onClose={() => {
          setShowBarcodeScanner(false);
        }}
      />

      {/* Manual Barcode Entry */}
      <BarcodeScanner
        isOpen={showManualEntry}
        onScanSuccess={(barcode: string) => {
          setShowManualEntry(false);
          handleBarcodeScanned(barcode);
        }}
        onClose={() => {
          setShowManualEntry(false);
        }}
      />

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file-gallery"
      />

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
