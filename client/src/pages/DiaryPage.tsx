import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Utensils, Calendar, Clock, Trash2, ArrowLeft, Droplets, Wine, Flame, Target, TrendingUp, HelpCircle, Mic, MicOff, Plus } from "lucide-react";
import { Link } from "wouter";
import { ProgressIndicators } from "@/components/progress-indicators";
import { WeeklyAnalytics } from "@/components/weekly-analytics";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { MealTemplatesDialog } from "@/components/meal-templates-dialog";
import { AdvancedAnalytics } from "@/components/advanced-analytics";
import { QuickActionsBar } from "@/components/quick-actions-bar";
import { DataManagementDialog } from "@/components/data-management-dialog";
import type { DiaryEntryWithAnalysis, DrinkEntry, NutritionGoals } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";
import { WeightForm } from "@/components/weight-form";
import { WeightList } from "@/components/weight-list";
import { WeightEditDialog } from "@/components/weight-edit-dialog";
import { WeightChart } from "@/components/weight-chart";
import { DrinksBar } from "@/components/drinks-bar";
import type { WeightEntry } from "@shared/schema";
import { calculateDailyNutrition } from "@/lib/nutrition-calculator";

export function DiaryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'diary' | 'analytics' | 'weight'>('diary');
  const [viewMode, setViewMode] = useState<'today' | 'history'>('today');

  // Check URL parameters for tab switching
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'weight') {
      setActiveTab('weight');
    }
  }, []);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [calorieRange, setCalorieRange] = useState<{ min?: number; max?: number }>({});

  // Weight edit dialog state
  const [editingWeightEntry, setEditingWeightEntry] = useState<WeightEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [showVoiceMealDialog, setShowVoiceMealDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

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
    addVoiceMealMutation.mutate({
      foodDescription: voiceInput.trim(),
      mealType: selectedMealType
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
      <div className="min-h-screen bg-background p-4">
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
    <div className="min-h-screen text-foreground" style={{background: 'var(--bg-gradient)'}}>
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-back-to-home"
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
              <h1 className="text-xl font-bold">Food Diary</h1>
              
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
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
            
            {/* Tab Navigation */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('diary')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'diary' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-diary"
                >
                  <Calendar className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'analytics' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-analytics"
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActiveTab('weight')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'weight' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-weight"
                >
                  <Target className="h-4 w-4" />
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
        {activeTab === 'analytics' ? (
          <div className="space-y-6">
            <WeeklyAnalytics goals={nutritionGoals} />
            <AdvancedAnalytics goals={nutritionGoals} />
          </div>
        ) : activeTab === 'weight' ? (
          <div className="space-y-6">
            {/* Weight Tracking Header */}
            <div className="bg-gradient-to-br from-blue/5 to-blue/10 border border-blue/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
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
                {/* Section Header - Purple Background */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl px-4 py-3 shadow-md">
                  <h3 className="text-xl font-bold text-white">Today's Meals</h3>
                </div>
                
                {sortedDates.map((date) => (
                  <div key={date} className="space-y-3">
                    {filteredGroupedEntries[date]?.map((entry) => {
                      const getMealColor = (mealType: string) => {
                        if (mealType === 'snack') return 'bg-purple-500';
                        return 'bg-orange-500';
                      };
                      
                      return (
                        <div key={entry.id} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 border border-purple-200 dark:border-purple-800 rounded-xl p-4 shadow-sm">
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
                                onClick={() => deleteMutation.mutate(entry.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete entry"
                                data-testid={`button-delete-${entry.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Macros with emoji icons - compact grid */}
                          <div className="grid grid-cols-4 gap-2 mb-3 bg-white/60 dark:bg-gray-900/40 rounded-lg p-3">
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
                          
                          {/* Food items list */}
                          {entry.analysis?.detectedFoods && entry.analysis.detectedFoods.length > 0 && (
                            <div className="space-y-2">
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
                        </div>
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
                              title="Delete drink"
                              data-testid={`button-delete-drink-${drink.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
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
            
            {/* Drinks Bar */}
            <DrinksBar />
            
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
                disabled={addVoiceMealMutation.isPending}
                className="flex-1 py-2 px-4 border border-input rounded-lg font-medium hover:bg-muted transition-colors disabled:opacity-50"
                data-testid="button-cancel-voice-meal"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoiceMeal}
                disabled={addVoiceMealMutation.isPending || !voiceInput.trim()}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                data-testid="button-confirm-voice-meal"
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
      
      {/* Weight Edit Dialog */}
      <WeightEditDialog
        entry={editingWeightEntry}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          setEditingWeightEntry(null);
        }}
      />
    </div>
  );
}

export default DiaryPage;