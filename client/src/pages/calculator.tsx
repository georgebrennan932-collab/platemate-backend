import React from 'react';
import { NutritionCalculator } from '@/components/nutrition-calculator';
import { useQuery } from '@tanstack/react-query';

interface NutritionGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyWater: number;
}

interface DiaryEntry {
  analysis: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
}

interface DrinkEntry {
  calories: number;
  amount: number;
  drinkType: string;
}

export default function CalculatorPage() {
  // Fetch nutrition goals
  const { data: goals } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
    retry: false,
  });

  // Fetch today's diary entries
  const { data: diaryEntries = [] } = useQuery<DiaryEntry[]>({
    queryKey: ['/api/diary'],
    retry: false,
  });

  // Fetch today's drink entries
  const { data: drinkEntries = [] } = useQuery<DrinkEntry[]>({
    queryKey: ['/api/drinks'],
    retry: false,
  });

  // Calculate today's consumed nutrition
  const consumed = React.useMemo(() => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Calculate food nutrition for today
    const foodNutrition = diaryEntries.reduce((total, entry) => {
      // Filter entries for today (you might need to adjust this based on your data structure)
      return {
        calories: total.calories + (entry.analysis?.totalCalories || 0),
        protein: total.protein + (entry.analysis?.totalProtein || 0),
        carbs: total.carbs + (entry.analysis?.totalCarbs || 0),
        fat: total.fat + (entry.analysis?.totalFat || 0),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Calculate drink calories and water for today
    const drinkCalories = drinkEntries.reduce((total, drink) => {
      return total + (drink.calories || 0);
    }, 0);
    
    const water = drinkEntries.reduce((total, drink) => {
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

  return <NutritionCalculator goals={goals} consumed={consumed} />;
}