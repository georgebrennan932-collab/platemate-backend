import { useQuery, useMutation } from "@tanstack/react-query";
import type { DiaryEntryWithAnalysis, NutritionGoals } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Flame, Dumbbell, Wheat, Droplet, TrendingUp, Award, Target, Utensils } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { calculateDailyNutrition } from "@/lib/nutrition-calculator";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { WaterTracker } from "@/components/water-tracker";

interface DashboardProps {
  onViewMeals?: () => void;
}

export function Dashboard({ onViewMeals }: DashboardProps = {}) {
  const { data: diaryEntries } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
  });

  const { data: nutritionGoals } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
  });

  const [motivationalQuote, setMotivationalQuote] = useState("");
  const lastCheckRef = useRef<string>('');

  // Get today's entries (using local date to avoid timezone issues)
  const today = new Date().toDateString();
  const todayEntries = diaryEntries?.filter(entry => {
    const entryDate = new Date(entry.mealDate).toDateString();
    return entryDate === today;
  }) || [];

  // Calculate today's totals from food diary only
  const totals = calculateDailyNutrition(todayEntries, []);

  // Mutation to check goal challenges
  const checkGoalsMutation = useMutation({
    mutationFn: async (data: {
      totalCalories: number;
      totalProtein: number;
      dailyGoals: { calories: number; protein: number };
    }) => {
      return apiRequest('POST', '/api/challenges/check-goals', data);
    },
  });

  // Check goals whenever totals or goals change
  useEffect(() => {
    if (nutritionGoals && totals.calories > 0) {
      const checkKey = `${totals.calories}-${totals.protein}`;
      
      // Only check if values have changed
      if (checkKey !== lastCheckRef.current) {
        lastCheckRef.current = checkKey;
        
        // Call the API to check goal-based challenges
        apiRequest('POST', '/api/challenges/check-goals', {
          totalCalories: totals.calories,
          totalProtein: totals.protein,
          dailyGoals: {
            calories: nutritionGoals.dailyCalories || 2000,
            protein: nutritionGoals.dailyProtein || 150,
          },
        }).catch(err => {
          console.error('Goal check failed:', err);
        });
      }
    }
  }, [totals.calories, totals.protein, nutritionGoals]);

  // AI motivational quotes
  const quotes = [
    "Every healthy choice is a step forward! 🌟",
    "Your consistency is building strength! 💪",
    "Progress, not perfection! Keep going! 🎯",
    "You're fueling your best self! 🔥",
    "Small steps lead to big changes! ⭐",
    "Your health journey matters! 🌈",
    "Stay committed to your goals! 🏆",
    "You're doing amazing! Keep it up! 💫",
  ];

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setMotivationalQuote(randomQuote);
  }, []);

  // Prepare macro data for pie chart
  const macroData = [
    { name: "Protein", value: totals.protein * 4, color: "#a78bfa" }, // Purple
    { name: "Carbs", value: totals.carbs * 4, color: "#fb923c" }, // Orange
    { name: "Fat", value: totals.fat * 9, color: "#fbbf24" }, // Yellow
  ];

  const totalMacroCalories = macroData.reduce((sum, item) => sum + item.value, 0);

  // Calculate percentages for goals
  const proteinPercent = nutritionGoals?.dailyProtein 
    ? Math.round((totals.protein / nutritionGoals.dailyProtein) * 100)
    : 0;
  const carbsPercent = nutritionGoals?.dailyCarbs
    ? Math.round((totals.carbs / nutritionGoals.dailyCarbs) * 100)
    : 0;
  const fatPercent = nutritionGoals?.dailyFat
    ? Math.round((totals.fat / nutritionGoals.dailyFat) * 100)
    : 0;
  const caloriesPercent = nutritionGoals?.dailyCalories
    ? Math.round((totals.calories / nutritionGoals.dailyCalories) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-md mx-auto px-4">
      {/* Fluid Intake Tracker */}
      <WaterTracker />

      {/* View All Meals Button */}
      {onViewMeals && todayEntries.length > 0 && (
        <motion.button
          onClick={onViewMeals}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg"
          data-testid="button-view-all-meals"
        >
          <Utensils className="h-5 w-5" />
          <span>View All Meals</span>
        </motion.button>
      )}
    </div>
  );
}
