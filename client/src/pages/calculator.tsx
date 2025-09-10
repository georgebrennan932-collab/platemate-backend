import React from 'react';
import { NutritionCalculator } from '@/components/nutrition-calculator';
import { CalorieCalculator } from '@/components/calorie-calculator';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Target, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import type { DiaryEntry, DrinkEntry, FoodAnalysis, DiaryEntryWithAnalysis, NutritionGoals } from '@shared/schema';
import { BottomNavigation } from '@/components/bottom-navigation';
import { BottomHelpSection } from '@/components/bottom-help-section';

export default function CalculatorPage() {
  // Fetch nutrition goals
  const { data: goals, isLoading: goalsLoading } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
    retry: false,
  });

  // Fetch today's diary entries
  const { data: diaryEntries = [], isLoading: diaryLoading } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
    retry: false,
  });

  // Fetch today's drink entries
  const { data: drinkEntries = [], isLoading: drinksLoading } = useQuery<DrinkEntry[]>({
    queryKey: ['/api/drinks'],
    retry: false,
  });

  // Calculate today's consumed nutrition
  const consumed = React.useMemo(() => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Filter entries for today only
    const todayEntries = diaryEntries.filter(entry => {
      if (!entry.mealDate) return false;
      const entryDate = new Date(entry.mealDate).toISOString().split('T')[0];
      return entryDate === today;
    });

    const todayDrinks = drinkEntries.filter(drink => {
      if (!drink.loggedAt) return false;
      const drinkDate = new Date(drink.loggedAt).toISOString().split('T')[0];
      return drinkDate === today;
    });

    // Calculate food nutrition for today
    const foodNutrition = todayEntries.reduce((total, entry) => {
      return {
        calories: total.calories + (entry.analysis?.totalCalories || 0),
        protein: total.protein + (entry.analysis?.totalProtein || 0),
        carbs: total.carbs + (entry.analysis?.totalCarbs || 0),
        fat: total.fat + (entry.analysis?.totalFat || 0),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Calculate drink calories and water for today
    const drinkCalories = todayDrinks.reduce((total, drink) => {
      return total + (drink.calories || 0);
    }, 0);
    
    const water = todayDrinks.reduce((total, drink) => {
      // Only count water-type drinks toward hydration
      if (['water', 'tea', 'coffee'].includes(drink.drinkType)) {
        return total + drink.amount;
      }
      return total;
    }, 0);
    
    return {
      calories: foodNutrition.calories + drinkCalories,
      protein: foodNutrition.protein,
      carbs: foodNutrition.carbs,
      fat: foodNutrition.fat,
      water: water,
    };
  }, [diaryEntries, drinkEntries]);

  // Show loading state
  if (goalsLoading || diaryLoading || drinksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your nutrition data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header with back button */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <button 
                className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
                data-testid="button-back-to-home"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  🎨
                </div>
                Smart Nutrition Calculator
              </h1>
              <p className="text-indigo-100 mt-1">
                ✨ Calculate your personalized calorie needs and plan optimal meals
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-8">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 p-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl">
            <TabsTrigger value="personal" className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg" data-testid="tab-personal-calculator">
              <Target className="h-4 w-4" />
              Personal Calculator
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg" data-testid="tab-nutrition-planner">
              <Calculator className="h-4 w-4" />
              Nutrition Planner
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" data-testid="content-personal-calculator">
            <CalorieCalculator />
          </TabsContent>
          
          <TabsContent value="nutrition" data-testid="content-nutrition-planner">
            <NutritionCalculator goals={goals} consumed={consumed} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Bottom Help Section */}
      <BottomHelpSection />
    </div>
  );
}