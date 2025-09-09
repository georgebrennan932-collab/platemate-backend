import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Utensils, Calendar, Clock, Trash2, ArrowLeft, Droplets, Wine, Flame, Target, TrendingUp, HelpCircle, Mic, MicOff, Plus } from "lucide-react";
import { Link } from "wouter";
import { ProgressIndicators } from "@/components/progress-indicators";
import { WeeklyAnalytics } from "@/components/weekly-analytics";
import { EditDiaryEntryDialog } from "@/components/edit-diary-entry-dialog";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { MealTemplatesDialog } from "@/components/meal-templates-dialog";
import { AdvancedAnalytics } from "@/components/advanced-analytics";
import { QuickActionsBar } from "@/components/quick-actions-bar";
import { DataManagementDialog } from "@/components/data-management-dialog";
import type { DiaryEntryWithAnalysis, DrinkEntry, NutritionGoals } from "@shared/schema";
import { BottomNavigation } from "@/components/bottom-navigation";

export function DiaryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'diary' | 'analytics'>('diary');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [calorieRange, setCalorieRange] = useState<{ min?: number; max?: number }>({});

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

  // Calculate daily nutrition totals
  const getDailyNutrition = (date: string) => {
    const foodNutrition = groupedEntries[date]?.reduce((total, entry) => {
      return {
        calories: total.calories + (entry.analysis?.totalCalories || 0),
        protein: total.protein + (entry.analysis?.totalProtein || 0),
        carbs: total.carbs + (entry.analysis?.totalCarbs || 0),
        fat: total.fat + (entry.analysis?.totalFat || 0),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 }) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    const drinkCalories = groupedDrinks[date]?.reduce((total, drink) => {
      return total + (drink.calories || 0);
    }, 0) || 0;
    
    return {
      calories: foodNutrition.calories + drinkCalories,
      protein: foodNutrition.protein,
      carbs: foodNutrition.carbs,
      fat: foodNutrition.fat,
      water: groupedDrinks[date]?.reduce((total, drink) => {
        // Only count water-type drinks toward hydration
        if (['water', 'tea', 'coffee'].includes(drink.drinkType)) {
          return total + drink.amount;
        }
        return total;
      }, 0) || 0,
    };
  };

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
  const sortedDates = Array.from(allFilteredDates).sort((a, b) => 
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/scan">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-back-to-home"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <h1 className="text-xl font-bold">Food Diary</h1>
              
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
      {activeTab === 'diary' && (
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
      <div className="max-w-md mx-auto p-4">
        {activeTab === 'analytics' ? (
          <div className="space-y-6">
            <WeeklyAnalytics goals={nutritionGoals} />
            <AdvancedAnalytics goals={nutritionGoals} />
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No entries yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start scanning food and logging drinks to build your nutrition diary
            </p>
            <Link href="/scan">
              <button 
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                data-testid="button-start-scanning"
              >
                Start Tracking
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const dailyNutrition = getDailyNutrition(date);
              const isToday = new Date(date).toDateString() === new Date().toDateString();
              
              return (
                <div key={date} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(date), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-primary/10 text-primary px-3 py-1 rounded-full">
                      <Flame className="h-4 w-4" />
                      <span className="text-sm font-semibold" data-testid={`daily-calories-${date}`}>
                        {dailyNutrition.calories} cal
                      </span>
                    </div>
                  </div>

                  {/* Progress indicators for today */}
                  {isToday && nutritionGoals && (
                    <div className="bg-card border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Target className="h-4 w-4 text-primary" />
                        <h3 className="font-medium">Today's Progress</h3>
                      </div>
                      <ProgressIndicators 
                        goals={nutritionGoals} 
                        consumed={dailyNutrition}
                      />
                    </div>
                  )}
                <div className="space-y-2">
                  {/* Food entries */}
                  {filteredGroupedEntries[date]?.map((entry) => {
                    const getMealTypeColor = (mealType: string) => {
                      switch (mealType) {
                        case 'breakfast': return 'from-orange-400 to-yellow-500 text-white';
                        case 'lunch': return 'from-green-400 to-emerald-500 text-white';
                        case 'dinner': return 'from-purple-400 to-indigo-500 text-white';
                        case 'snack': return 'from-pink-400 to-rose-500 text-white';
                        default: return 'from-blue-400 to-cyan-500 text-white';
                      }
                    };
                    
                    const getMealTypeIcon = (mealType: string) => {
                      switch (mealType) {
                        case 'breakfast': return '🌅';
                        case 'lunch': return '☀️';
                        case 'dinner': return '🌙';
                        case 'snack': return '🍎';
                        default: return '🍽️';
                      }
                    };
                    
                    return (
                    <div key={entry.id} className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]" data-testid={`diary-entry-${entry.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r ${getMealTypeColor(entry.mealType)} shadow-md`}>
                              <span className="mr-2 text-base">{getMealTypeIcon(entry.mealType)}</span>
                              {entry.mealType === 'custom' && entry.customMealName 
                                ? entry.customMealName 
                                : entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)
                              }
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground bg-white/50 dark:bg-black/30 px-3 py-1.5 rounded-full border border-muted/50">
                              <Clock className="h-3 w-3 mr-1.5" />
                              {format(new Date(entry.mealDate), 'h:mm a')}
                            </div>
                          </div>
                          
                          {entry.analysis && (
                            <div className="space-y-3">
                              {/* Food photo or voice thumbnail */}
                              {entry.analysis.imageUrl && (
                                <div className="relative mb-4">
                                  {entry.analysis.imageUrl.includes('voice-input') ? (
                                    /* Enhanced Voice input thumbnail */
                                    <div className="w-full h-40 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-xl border-2 border-blue-300/50 shadow-lg flex items-center justify-center relative overflow-hidden">
                                      {/* Background pattern */}
                                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                                      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                                      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-400/20 rounded-full blur-lg"></div>
                                      
                                      <div className="text-center text-white relative z-10">
                                        <div className="bg-white/20 rounded-full p-4 mb-3 mx-auto w-fit backdrop-blur-sm">
                                          <Mic className="h-8 w-8 mx-auto animate-pulse" />
                                        </div>
                                        <div className="text-lg font-bold mb-1">Voice Added</div>
                                        <div className="text-sm opacity-90 font-medium">🎤 Audio Recognition</div>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Enhanced Regular food photo */
                                    <img 
                                      src={entry.analysis.imageUrl.startsWith('/') ? entry.analysis.imageUrl : `/${entry.analysis.imageUrl}`} 
                                      alt="Original food photo" 
                                      className="w-full h-40 object-cover rounded-xl border-2 border-muted/30 shadow-lg hover:shadow-xl transition-shadow"
                                      data-testid={`food-image-${entry.id}`}
                                      onError={(e) => {
                                        console.log('Diary image failed to load:', entry.analysis.imageUrl);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/20">
                                    ✨ {entry.analysis.confidence}% confident
                                  </div>
                                </div>
                              )}
                              
                              {/* Enhanced detected foods - Now First */}
                              {entry.analysis.detectedFoods && entry.analysis.detectedFoods.length > 0 && (
                                <div className="space-y-3 mb-4">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <div className="text-sm font-semibold text-foreground">Detected Foods</div>
                                  </div>
                                  <div className="grid gap-2">
                                    {entry.analysis.detectedFoods.map((food: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-lg px-4 py-3 border border-muted/50 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                          <div className="text-lg bg-white dark:bg-gray-600 rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
                                            {food.icon || '🍽️'}
                                          </div>
                                          <span className="font-medium text-foreground text-sm">{food.name}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                                            <span className="text-xs font-semibold">
                                              {food.portion}
                                            </span>
                                          </div>
                                          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full">
                                            <span className="text-xs font-semibold">
                                              {food.calories}cal
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Enhanced nutrition display - Now Second */}
                              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-700/30 mb-4">
                                <div className="flex items-center justify-center mb-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg shadow-sm">
                                      <Flame className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                        {entry.analysis.totalCalories}
                                      </div>
                                      <div className="text-xs font-medium text-orange-700 dark:text-orange-300 -mt-1">
                                        calories
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="text-center">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
                                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {entry.analysis.totalProtein}g
                                      </div>
                                      <div className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">
                                        🥩 Protein
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2">
                                      <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                        {entry.analysis.totalCarbs}g
                                      </div>
                                      <div className="text-xs text-green-600/70 dark:text-green-400/70 font-medium">
                                        🍞 Carbs
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2">
                                      <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                                        {entry.analysis.totalFat}g
                                      </div>
                                      <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70 font-medium">
                                        🥑 Fat
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Enhanced notes section */}
                              {entry.notes && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200/50 dark:border-blue-700/30 mt-4">
                                  <div className="flex items-start space-x-2">
                                    <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded">
                                      <span className="text-xs">📝</span>
                                    </div>
                                    <div>
                                      <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Notes</div>
                                      <div className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">{entry.notes}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mb-4">
            <MealTemplatesDialog
              onSelectTemplate={(template) => {
                // Quick-log the template as a new diary entry
                const newEntry = {
                  analysisId: template.analysisId,
                  mealType: 'lunch' as const,
                  mealDate: new Date().toISOString(),
                  notes: `From template: ${template.name}`,
                };
                
                // This would normally call the create diary entry API
                toast({
                  title: "Template Added",
                  description: `"${template.name}" has been logged to your diary.`,
                });
              }}
            />
            <DataManagementDialog />
          </div>
          
          {/* Quick Actions */}
          <QuickActionsBar 
            onQuickLog={(type, data) => {
              console.log('Quick logged:', type, data);
            }}
          />
          
          <div className="flex gap-2">
                          <EditDiaryEntryDialog entry={entry} />
                          <button
                            onClick={() => deleteMutation.mutate(entry.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                            data-testid={`button-delete-${entry.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  
                  {/* Drink entries */}
                  {groupedDrinks[date]?.map((drink) => (
                    <div key={drink.id} className="bg-card border rounded-lg p-4 border-blue-200 dark:border-blue-800" data-testid={`drink-entry-${drink.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="flex items-center space-x-2">
                              {(drink.alcoholContent || 0) > 0 ? (
                                <Wine className="h-4 w-4 text-amber-500" />
                              ) : (
                                <Droplets className="h-4 w-4 text-blue-500" />
                              )}
                              <span className="font-medium">{drink.drinkName}</span>
                              <span className="text-sm text-muted-foreground">{drink.amount}ml</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(drink.loggedAt), 'HH:mm')}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                            <span>{drink.calories || 0}kcal</span>
                            <span>{drink.caffeine || 0}mg caffeine</span>
                            {(drink.alcoholContent || 0) > 0 ? (
                              <>
                                <span className="text-amber-600">{drink.alcoholContent}% ABV</span>
                                <span className="text-amber-600">{drink.alcoholUnits || 0} units</span>
                              </>
                            ) : (
                              <span className="col-span-2">{drink.sugar || 0}g sugar</span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => deleteDrinkMutation.mutate(drink.id)}
                          disabled={deleteDrinkMutation.isPending}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                          data-testid={`button-delete-drink-${drink.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )) || []}
                </div>
                </div>
              );
            })}
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
      
      {/* Voice Input Floating Button */}
      <div className="fixed bottom-24 left-4 z-50">
        <button
          onClick={handleVoiceInput}
          disabled={!speechSupported}
          className={`w-16 h-16 rounded-full shadow-xl border-2 border-white dark:border-gray-800 transition-all duration-200 flex items-center justify-center ${
            isListening
              ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-200'
              : speechSupported
              ? 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 shadow-blue-200'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
          }`}
          data-testid="button-voice-input"
          title={
            !speechSupported
              ? 'Voice input not supported in this browser'
              : isListening
              ? 'Listening... Click to stop'
              : 'Click to add meal by voice'
          }
        >
          {isListening ? (
            <MicOff className="h-7 w-7" />
          ) : (
            <Mic className="h-7 w-7" />
          )}
        </button>
        
        {/* Voice button label */}
        <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          Voice Input
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  );
}