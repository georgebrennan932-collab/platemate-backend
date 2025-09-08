import React from 'react';
import { NutritionCalculator } from '@/components/nutrition-calculator';
import { CalorieCalculator } from '@/components/calorie-calculator';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Target, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import type { DiaryEntry, DrinkEntry, FoodAnalysis, DiaryEntryWithAnalysis } from '@shared/schema';
import { BottomNavigation } from '@/components/bottom-navigation';

export default function CalculatorPage() {
  // Fetch nutrition goals
  const { data: goals, isLoading: goalsLoading } = useQuery({
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
      {/* Header with back button */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <button 
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                data-testid="button-back-to-home"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Smart Nutrition Calculator</h1>
              <p className="text-sm text-muted-foreground">
                Calculate your personalized calorie needs and plan optimal meals
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" className="flex items-center gap-2" data-testid="tab-personal-calculator">
              <Target className="h-4 w-4" />
              Personal Calculator
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="flex items-center gap-2" data-testid="tab-nutrition-planner">
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
      
      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  );
}