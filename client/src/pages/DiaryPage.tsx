import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Utensils, Calendar, Clock, Trash2, ArrowLeft, Droplets, Wine, Flame, Target, TrendingUp, HelpCircle, Mic, MicOff, Plus } from "lucide-react";
import { WaterTracker } from "@/components/water-tracker";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ProgressIndicators } from "@/components/progress-indicators";
import { WeeklyAnalytics } from "@/components/weekly-analytics";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { MealTemplatesDialog } from "@/components/meal-templates-dialog";
import { AdvancedAnalytics } from "@/components/advanced-analytics";
import { QuickActionsBar } from "@/components/quick-actions-bar";
import { DataManagementDialog } from "@/components/data-management-dialog";
import type { DiaryEntryWithAnalysis, DrinkEntry, NutritionGoals } from "@shared/schema";
import { DropdownNavigation } from "@/components/dropdown-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";
import { WeightForm } from "@/components/weight-form";
import { WeightList } from "@/components/weight-list";
import { WeightEditDialog } from "@/components/weight-edit-dialog";
import { WeightChart } from "@/components/weight-chart";
import type { WeightEntry } from "@shared/schema";
import { calculateDailyNutrition } from "@/lib/nutrition-calculator";
import { Dashboard } from "@/components/dashboard";
import { DiaryEditDialog } from "@/components/diary-edit-dialog";
import { soundService } from "@/lib/sound-service";

export function DiaryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'diary' | 'analytics' | 'weight'>('dashboard');
  const [viewMode, setViewMode] = useState<'today' | 'history'>('today');

  // Check URL parameters for tab switching
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'weight') {
      setActiveTab('weight');
    } else if (tabParam === 'diary') {
      setActiveTab('diary');
    } else if (tabParam === 'analytics') {
      setActiveTab('analytics');
    }
  }, []);

  // Scroll to top instantly when switching to diary tab to see animations
  useEffect(() => {
    if (activeTab === 'diary') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab]);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [calorieRange, setCalorieRange] = useState<{ min?: number; max?: number }>({});

  // Weight edit dialog state
  const [editingWeightEntry, setEditingWeightEntry] = useState<WeightEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Diary edit dialog state
  const [editingDiaryEntry, setEditingDiaryEntry] = useState<DiaryEntryWithAnalysis | null>(null);
  const [isDiaryEditDialogOpen, setIsDiaryEditDialogOpen] = useState(false);
  
  // Track which entries have expanded food lists
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [showVoiceMealDialog, setShowVoiceMealDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  
  // Review state for voice entries
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAnalysis, setReviewAnalysis] = useState<any | null>(null);
  const [reviewDescription, setReviewDescription] = useState('');
  const [editingFoodIndex, setEditingFoodIndex] = useState<number | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    const checkSpeechSupport = () => {
      const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(supported);
    };
    checkSpeechSupport();
  }, []);

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
    analyzeVoiceMutation.mutate({
      foodDescription: voiceInput.trim()
    });
  };

  const { data: diaryEntries, isLoading } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
  });

  const { data: drinkEntries, isLoading: drinksLoading } = useQuery<DrinkEntry[]>({
    queryKey: ['/api/drinks'],
  });

  const { data: nutritionGoals } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await apiRequest('DELETE', `/api/diary/${entryId}`);
    },
    onSuccess: () => {
      soundService.playClick();
      toast({
        title: "Entry Deleted",
        description: "Meal has been removed from your diary.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting diary entry:", error);
    },
  });

  const deleteDrinkMutation = useMutation({
    mutationFn: async (drinkId: string) => {
      await apiRequest('DELETE', `/api/drinks/${drinkId}`);
    },
    onSuccess: () => {
      soundService.playClick();
      toast({
        title: "Drink Deleted",
        description: "Drink has been removed from your diary.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/drinks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete drink. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting drink entry:", error);
    },
  });

  // Step 1: Analyze voice input - doesn't save to diary yet
  const analyzeVoiceMutation = useMutation({
    mutationFn: async ({ foodDescription }: { foodDescription: string }) => {
      const analysisResponse = await apiRequest('POST', '/api/analyze-text', { foodDescription });
      const analysis = await analysisResponse.json();
      return { analysis, foodDescription };
    },
    onSuccess: ({ analysis, foodDescription }) => {
      // Close voice dialog
      setShowVoiceMealDialog(false);
      
      // Show review dialog
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
    },
  });

  // Step 2: Save to diary after review
  const saveToDiaryMutation = useMutation({
    mutationFn: async ({ analysisId, mealType, notes, updatedFoods }: { 
      analysisId: string, 
      mealType: string, 
      notes: string,
      updatedFoods?: any[]
    }) => {
      // If foods were edited, update the analysis first
      if (updatedFoods) {
        await apiRequest('PATCH', `/api/analyses/${analysisId}`, {
          detectedFoods: updatedFoods
        });
      }
      
      // Then create diary entry
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

  const groupedEntries = diaryEntries?.reduce((groups, entry) => {
    const date = new Date(entry.mealDate).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, DiaryEntryWithAnalysis[]>) || {};

  const groupedDrinks = drinkEntries?.reduce((groups, drink) => {
    const date = new Date(drink.loggedAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(drink);
    return groups;
  }, {} as Record<string, DrinkEntry[]>) || {};

  // Calculate daily nutrition totals using standardized function
  const getDailyNutrition = (date: string) => {
    const targetDate = new Date(date);
    return calculateDailyNutrition(diaryEntries || [], drinkEntries || [], targetDate);
  };

  // Get today's date string for filtering
  const today = new Date().toDateString();
  const todayNutrition = getDailyNutrition(today);
  
  // Calculate remaining to reach targets
  const getRemainingNutrition = () => {
    if (!nutritionGoals) return null;
    return {
      calories: Math.max(0, (nutritionGoals.dailyCalories || 0) - todayNutrition.calories),
      protein: Math.max(0, (nutritionGoals.dailyProtein || 0) - todayNutrition.protein),
      carbs: Math.max(0, (nutritionGoals.dailyCarbs || 0) - todayNutrition.carbs),
      fat: Math.max(0, (nutritionGoals.dailyFat || 0) - todayNutrition.fat),
    };
  };
  
  const remainingNutrition = getRemainingNutrition();

  const allDates = new Set([...Object.keys(groupedEntries), ...Object.keys(groupedDrinks)]);
  
  // Filter entries based on search and filters
  const filteredEntries = diaryEntries?.filter(entry => {
    // Text search
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesFood = entry.analysis?.detectedFoods?.some(food => 
        food.name.toLowerCase().includes(searchLower)
      );
      const matchesNotes = entry.notes?.toLowerCase().includes(searchLower);
      const matchesMealType = entry.mealType.toLowerCase().includes(searchLower);
      const matchesCustomName = entry.customMealName?.toLowerCase().includes(searchLower);
      
      if (!matchesFood && !matchesNotes && !matchesMealType && !matchesCustomName) {
        return false;
      }
    }
    
    // Meal type filter
    if (mealTypeFilter !== 'all' && entry.mealType !== mealTypeFilter) {
      return false;
    }
    
    // Date range filter
    if (dateRange.start || dateRange.end) {
      const entryDate = new Date(entry.mealDate);
      if (dateRange.start && entryDate < dateRange.start) return false;
      if (dateRange.end && entryDate > dateRange.end) return false;
    }
    
    // Calorie range filter
    if (calorieRange.min || calorieRange.max) {
      const calories = entry.analysis?.totalCalories || 0;
      if (calorieRange.min && calories < calorieRange.min) return false;
      if (calorieRange.max && calories > calorieRange.max) return false;
    }
    
    return true;
  }) || [];
  
  const filteredGroupedEntries = filteredEntries.reduce((groups, entry) => {
    const date = new Date(entry.mealDate).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, DiaryEntryWithAnalysis[]>);

  const allFilteredDates = new Set([...Object.keys(filteredGroupedEntries), ...Object.keys(groupedDrinks)]);
  
  // Filter dates based on view mode
  const filteredByViewMode = viewMode === 'today' 
    ? Array.from(allFilteredDates).filter(date => date === today)
    : Array.from(allFilteredDates).filter(date => date !== today);
    
  const sortedDates = filteredByViewMode.sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (isLoading || drinksLoading) {
    return (
      <div className="min-h-screen bg-purple-500 dark:bg-gray-900 p-4">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="space-y-3">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen text-foreground" 
      style={{background: 'var(--bg-gradient)'}}
    >
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-back"
                  onClick={() => {
                    // Force refresh homepage data when navigating back
                    queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/nutrition-goals'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/drinks'] });
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <h1 className="text-xl font-bold">
                {activeTab === 'weight' ? 'Weight Tracking' : 'Food Diary'}
              </h1>
              
              {/* View Mode Toggle */}
              <div className="flex bg-muted rounded-lg p-1 ml-2">
                <button
                  onClick={() => setViewMode('today')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'today' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="view-today"
                  aria-label="View today's meals"
                  aria-pressed={viewMode === 'today'}
                >
                  Today
                </button>
                <button
                  onClick={() => setViewMode('history')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'history' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="view-history"
                  aria-label="View meal history"
                  aria-pressed={viewMode === 'history'}
                >
                  History
                </button>
              </div>
              
              {/* Voice input button */}
              {speechSupported && (
                <button
                  onClick={handleVoiceInput}
                  disabled={isListening}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                  data-testid="button-voice-meal"
                  aria-label={isListening ? 'Stop listening for voice meal input' : 'Add meal using voice input'}
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Mic className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
            
            {/* Tab Navigation */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'dashboard' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-dashboard"
                  aria-label="View dashboard tab"
                  aria-pressed={activeTab === 'dashboard'}
                  role="tab"
                >
                  <Target className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setActiveTab('diary')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'diary' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-diary"
                  aria-label="View diary tab"
                  aria-pressed={activeTab === 'diary'}
                  role="tab"
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'analytics' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-analytics"
                  aria-label="View analytics tab"
                  aria-pressed={activeTab === 'analytics'}
                  role="tab"
                >
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setActiveTab('weight')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'weight' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-weight"
                  aria-label="View weight tracking tab"
                  aria-pressed={activeTab === 'weight'}
                  role="tab"
                >
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <Link href="/help">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-help-diary"
                  title="Help & Support"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      {activeTab === 'diary' && viewMode === 'history' && (
        <div className="max-w-md mx-auto px-4 pb-2">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            mealTypeFilter={mealTypeFilter}
            onMealTypeChange={setMealTypeFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            calorieRange={calorieRange}
            onCalorieRangeChange={setCalorieRange}
            onClearFilters={() => {
              setSearchQuery('');
              setMealTypeFilter('all');
              setDateRange({});
              setCalorieRange({});
            }}
            hasActiveFilters={searchQuery !== '' || mealTypeFilter !== 'all' || !!dateRange.start || !!dateRange.end || !!calorieRange.min || !!calorieRange.max}
          />
        </div>
      )}
      
      {/* Content */}
      <div className="max-w-md mx-auto p-4 pb-32">
        {activeTab === 'dashboard' ? (
          <Dashboard 
            onViewMeals={() => {
              setActiveTab('diary');
              const allIds = new Set(filteredGroupedEntries[sortedDates[0]]?.map(e => e.id) || []);
              setExpandedEntries(allIds);
            }}
          />
        ) : activeTab === 'analytics' ? (
          <div className="space-y-6">
            <WeeklyAnalytics goals={nutritionGoals} />
            <AdvancedAnalytics goals={nutritionGoals} />
          </div>
        ) : activeTab === 'weight' ? (
          <div className="space-y-6">
            {/* Weight Tracking Header */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-bold">Weight Progress</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  Track your weekly weigh-ins
                </div>
              </div>
            </div>
            
            {/* Weight Form */}
            <WeightForm />
            
            {/* Recent Weight Entries */}
            <WeightList onEdit={(entry) => {
              setEditingWeightEntry(entry);
              setIsEditDialogOpen(true);
            }} />
            
            {/* Weight Progress Chart */}
            <WeightChart />
          </div>
        ) : viewMode === 'today' ? (
          <div className="space-y-6">
            {/* Today's Meals */}
            {sortedDates.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-xl">
                <Utensils className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium text-muted-foreground mb-2">No meals logged today</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start your day by scanning food or using voice input
                </p>
                <Link href="/">
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    Go to Homepage
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Section Header - Purple Background with Back Button */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl px-4 py-3 shadow-md">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="text-white/80 hover:text-white transition-colors"
                      data-testid="button-back-to-dashboard"
                      title="Back to Dashboard"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-xl font-bold text-white">Today's Meals</h3>
                  </div>
                </div>
                
                {sortedDates.map((date) => (
                  <div key={date} className="space-y-3">
                    {filteredGroupedEntries[date]?.map((entry, index) => {
                      const isExpanded = expandedEntries.has(entry.id);
                      
                      const getMealColor = (mealType: string) => {
                        if (mealType === 'snack') return 'bg-purple-500';
                        return 'bg-orange-500';
                      };
                      
                      const toggleExpanded = () => {
                        const newExpanded = new Set(expandedEntries);
                        if (isExpanded) {
                          newExpanded.delete(entry.id);
                        } else {
                          newExpanded.add(entry.id);
                        }
                        setExpandedEntries(newExpanded);
                      };
                      
                      return (
                        <motion.div 
                          key={`${entry.id}-${activeTab}-${viewMode}`}
                          initial={{ 
                            opacity: 0, 
                            x: -100,
                            y: 20, 
                            scale: 0.7,
                            rotateY: -15
                          }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                            y: 0, 
                            scale: 1,
                            rotateY: 0
                          }}
                          transition={{ 
                            duration: 0.8,
                            delay: index * 0.12,
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                            mass: 1
                          }}
                          whileHover={{ 
                            scale: 1.03, 
                            y: -5,
                            transition: { duration: 0.2 } 
                          }}
                          className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border border-purple-200 dark:border-purple-800 rounded-xl p-4 shadow-sm"
                        >
                          {/* Header with colored meal badge and time */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className={`${getMealColor(entry.mealType)} text-white px-3 py-1 rounded-full text-sm font-semibold capitalize`}>
                                {entry.mealType}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(entry.mealDate), 'h:mm a')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => {
                                  setEditingDiaryEntry(entry);
                                  setIsDiaryEditDialogOpen(true);
                                }}
                                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                aria-label={`Edit ${entry.mealType} meal entry`}
                                title="Edit entry"
                                data-testid={`button-edit-${entry.id}`}
                              >
                                <Utensils className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => deleteMutation.mutate(entry.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                aria-label={`Delete ${entry.mealType} meal entry`}
                                title="Delete entry"
                                data-testid={`button-delete-${entry.id}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Macros with emoji icons - compact grid */}
                          <div className="grid grid-cols-4 gap-2 bg-white/60 dark:bg-gray-900/40 rounded-lg p-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-lg">🔥</span>
                              <span className="text-sm font-semibold" data-testid={`meal-calories-${entry.id}`}>
                                {entry.analysis?.totalCalories || 0}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-lg">💪</span>
                              <span className="text-sm font-medium text-blue-600" data-testid={`meal-protein-${entry.id}`}>
                                {entry.analysis?.totalProtein || 0}g
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-lg">🌾</span>
                              <span className="text-sm font-medium text-orange-600" data-testid={`meal-carbs-${entry.id}`}>
                                {entry.analysis?.totalCarbs || 0}g
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-lg">🥑</span>
                              <span className="text-sm font-medium text-yellow-600" data-testid={`meal-fat-${entry.id}`}>
                                {entry.analysis?.totalFat || 0}g
                              </span>
                            </div>
                          </div>
                          
                          {/* Food items list - Collapsible */}
                          {isExpanded && entry.analysis?.detectedFoods && entry.analysis.detectedFoods.length > 0 && (
                            <div className="space-y-2 mt-3 animate-in slide-in-from-top-2 duration-200">
                              {entry.analysis.detectedFoods.map((food, index) => (
                                <div key={index} className="flex items-center justify-between py-2 px-3 bg-white/50 dark:bg-gray-900/30 rounded-lg border border-purple-100 dark:border-purple-900">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{food.name}</p>
                                    <p className="text-xs text-muted-foreground">{food.portion}</p>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs ml-2 shrink-0">
                                    <span className="font-bold text-red-600">{food.calories}</span>
                                    <span className="text-blue-600">{food.protein}p</span>
                                    <span className="text-orange-600">{food.carbs}c</span>
                                    <span className="text-yellow-600">{food.fat}f</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                    
                    {/* Today's Drinks */}
                    {groupedDrinks[date]?.map((drink) => (
                      <div key={drink.id} className="bg-card border border-blue-200 rounded-lg p-4 mb-2">
                        {/* Header with drink info and actions */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {/* Drink Icon */}
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-blue-100 flex items-center justify-center">
                              <Droplets className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium capitalize">{drink.drinkName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(drink.loggedAt), 'h:mm a')}
                                </span>
                              </div>
                              
                              {/* Compact drink info */}
                              <div className="flex items-center space-x-3 text-xs">
                                <span className="font-semibold text-red-600" data-testid={`drink-calories-${drink.id}`}>
                                  {drink.calories || 0} cal
                                </span>
                                <span className="text-blue-600" data-testid={`drink-amount-${drink.id}`}>
                                  {drink.amount}ml
                                </span>
                                {(drink.caffeine || 0) > 0 && (
                                  <span className="text-green-600" data-testid={`drink-caffeine-${drink.id}`}>
                                    {drink.caffeine}mg caffeine
                                  </span>
                                )}
                                {(drink.alcoholContent || 0) > 0 && (
                                  <span className="text-purple-600" data-testid={`drink-alcohol-${drink.id}`}>
                                    {drink.alcoholContent}% ABV
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => deleteDrinkMutation.mutate(drink.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              aria-label={`Delete ${drink.drinkName} drink entry`}
                              title="Delete drink"
                              data-testid={`button-delete-drink-${drink.id}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Drink Details */}
                        <div className="bg-blue-50/50 rounded-lg p-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-4">
                              <span className="text-muted-foreground">Type: <strong>{drink.drinkType}</strong></span>
                              {(drink.sugar || 0) > 0 && <span className="text-muted-foreground">Sugar: <strong>{drink.sugar}g</strong></span>}
                              {(drink.alcoholUnits || 0) > 0 && <span className="text-muted-foreground">Units: <strong>{drink.alcoholUnits}</strong></span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            
            {/* Today's Summary */}
            <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">Today's Intake</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE, MMMM d')}
                </div>
              </div>
              
              {/* Daily Totals */}
              <div className="bg-background/80 rounded-lg p-4 text-center mb-4">
                <div className="text-2xl font-bold text-primary" data-testid="calories-consumed">
                  {todayNutrition.calories} <span className="text-sm text-green-600">({remainingNutrition?.calories || 0} left)</span>
                </div>
                <div className="text-sm text-muted-foreground">Calories</div>
              </div>
              
              {/* Macros Progress */}
              {nutritionGoals && (
                <div className="space-y-3">
                  <div className="text-sm font-medium mb-2">Macronutrients</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {todayNutrition.protein}g <span className="text-xs text-green-600">({remainingNutrition?.protein || 0} left)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {todayNutrition.carbs}g <span className="text-xs text-green-600">({remainingNutrition?.carbs || 0} left)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-600">
                        {todayNutrition.fat}g <span className="text-xs text-green-600">({remainingNutrition?.fat || 0} left)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Fat</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Progress Bar */}
              {nutritionGoals && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Daily Goal Progress</span>
                    <span>{Math.round((todayNutrition.calories / (nutritionGoals.dailyCalories || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (todayNutrition.calories / (nutritionGoals.dailyCalories || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Water Tracker - Separate section for water intake tracking */}
            <WaterTracker selectedDate={new Date()} />
            
            {/* View All Meals Button - Placed under Today's Intake */}
            <button
              onClick={() => {
                const totalEntries = filteredGroupedEntries[sortedDates[0]]?.length || 0;
                if (expandedEntries.size > 0) {
                  setExpandedEntries(new Set());
                } else {
                  const allIds = new Set(filteredGroupedEntries[sortedDates[0]]?.map(e => e.id) || []);
                  setExpandedEntries(allIds);
                }
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg"
              data-testid="button-toggle-all-meals"
            >
              <Utensils className="h-5 w-5" />
              <span>{expandedEntries.size > 0 ? 'Hide All Meals' : 'View All Meals'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* History Header */}
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Previous Days (Last 30 days)</span>
              </div>
            </div>
            
            {sortedDates.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium text-muted-foreground">No history available</h3>
                <p className="text-sm text-muted-foreground">Your meal history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedDates.map((date) => {
                  const dailyNutrition = getDailyNutrition(date);
                  return (
                    <div key={date} className="bg-card border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(date), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-primary/10 text-primary px-3 py-1 rounded-full">
                          <Flame className="h-4 w-4" />
                          <span className="text-sm font-semibold">
                            {dailyNutrition.calories} cal
                          </span>
                        </div>
                      </div>
                      {filteredGroupedEntries[date] && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {filteredGroupedEntries[date].length} meal{filteredGroupedEntries[date].length !== 1 ? 's' : ''} logged
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      
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
                disabled={analyzeVoiceMutation.isPending}
                className="flex-1 py-2 px-4 border border-input rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
                data-testid="button-cancel-voice-meal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoiceMeal}
                disabled={analyzeVoiceMutation.isPending || !voiceInput.trim()}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                data-testid="button-confirm-voice-meal"
              >
                {analyzeVoiceMutation.isPending ? 'Analyzing...' : 'Analyze Meal'}
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
              {reviewAnalysis.detectedFoods.map((food: any, index: number) => {
                const isEditing = editingFoodIndex === index;
                
                return (
                  <div 
                    key={index}
                    className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 rounded-xl p-3 border border-purple-200/50 dark:border-purple-700/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            value={food.name}
                            onChange={(e) => {
                              setReviewAnalysis((prev: any) => prev ? {
                                ...prev,
                                detectedFoods: prev.detectedFoods.map((f: any, i: number) => 
                                  i === index ? { ...f, name: e.target.value } : f
                                )
                              } : null);
                            }}
                            className="font-bold text-sm w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Food name"
                          />
                        ) : (
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{food.name}</p>
                        )}
                        {isEditing ? (
                          <input
                            type="text"
                            value={food.portion}
                            onChange={(e) => {
                              setReviewAnalysis((prev: any) => prev ? {
                                ...prev,
                                detectedFoods: prev.detectedFoods.map((f: any, i: number) => 
                                  i === index ? { ...f, portion: e.target.value } : f
                                )
                              } : null);
                            }}
                            className="text-xs w-full px-2 py-1 mt-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Portion size"
                          />
                        ) : (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{food.portion}</p>
                        )}
                      </div>
                      {isEditing ? (
                        <button
                          onClick={() => {
                            if (!reviewAnalysis) return;
                            setReviewAnalysis({
                              ...reviewAnalysis,
                              totalCalories: reviewAnalysis.detectedFoods.reduce((sum: number, f: any) => sum + f.calories, 0),
                              totalProtein: reviewAnalysis.detectedFoods.reduce((sum: number, f: any) => sum + f.protein, 0),
                              totalCarbs: reviewAnalysis.detectedFoods.reduce((sum: number, f: any) => sum + f.carbs, 0),
                              totalFat: reviewAnalysis.detectedFoods.reduce((sum: number, f: any) => sum + f.fat, 0)
                            });
                            setEditingFoodIndex(null);
                          }}
                          className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                        >
                          Done
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingFoodIndex(index)}
                          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    
                    {/* Nutrition Values */}
                    {isEditing ? (
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">cal</label>
                          <input
                            type="number"
                            value={food.calories}
                            onChange={(e) => {
                              setReviewAnalysis((prev: any) => prev ? {
                                ...prev,
                                detectedFoods: prev.detectedFoods.map((f: any, i: number) => 
                                  i === index ? { ...f, calories: parseInt(e.target.value) || 0 } : f
                                )
                              } : null);
                            }}
                            className="w-full px-1 py-1 text-xs border rounded text-center dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">protein</label>
                          <input
                            type="number"
                            value={food.protein}
                            onChange={(e) => {
                              setReviewAnalysis((prev: any) => prev ? {
                                ...prev,
                                detectedFoods: prev.detectedFoods.map((f: any, i: number) => 
                                  i === index ? { ...f, protein: parseInt(e.target.value) || 0 } : f
                                )
                              } : null);
                            }}
                            className="w-full px-1 py-1 text-xs border rounded text-center dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">carbs</label>
                          <input
                            type="number"
                            value={food.carbs}
                            onChange={(e) => {
                              setReviewAnalysis((prev: any) => prev ? {
                                ...prev,
                                detectedFoods: prev.detectedFoods.map((f: any, i: number) => 
                                  i === index ? { ...f, carbs: parseInt(e.target.value) || 0 } : f
                                )
                              } : null);
                            }}
                            className="w-full px-1 py-1 text-xs border rounded text-center dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">fat</label>
                          <input
                            type="number"
                            value={food.fat}
                            onChange={(e) => {
                              setReviewAnalysis((prev: any) => prev ? {
                                ...prev,
                                detectedFoods: prev.detectedFoods.map((f: any, i: number) => 
                                  i === index ? { ...f, fat: parseInt(e.target.value) || 0 } : f
                                )
                              } : null);
                            }}
                            className="w-full px-1 py-1 text-xs border rounded text-center dark:bg-gray-700 dark:border-gray-600"
                          />
                        </div>
                      </div>
                    ) : (
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
                    )}
                  </div>
                );
              })}
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
                    notes: `Added via voice: "${reviewDescription}"`,
                    updatedFoods: reviewAnalysis.detectedFoods
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
      
      {/* Weight Edit Dialog */}
      <WeightEditDialog
        entry={editingWeightEntry}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          setEditingWeightEntry(null);
        }}
      />

      <DiaryEditDialog
        entry={editingDiaryEntry}
        open={isDiaryEditDialogOpen}
        onOpenChange={setIsDiaryEditDialogOpen}
        onSuccess={() => {
          setEditingDiaryEntry(null);
        }}
      />
    </motion.div>
  );
}

export default DiaryPage;