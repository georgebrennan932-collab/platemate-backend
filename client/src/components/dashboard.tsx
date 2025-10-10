import { useQuery } from "@tanstack/react-query";
import type { DiaryEntryWithAnalysis, NutritionGoals } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Flame, Dumbbell, Wheat, Droplet, TrendingUp, Award, Target, Utensils } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { calculateDailyNutrition } from "@/lib/nutrition-calculator";
import { useEffect, useState } from "react";

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

  // Get today's entries (using local date to avoid timezone issues)
  const today = new Date().toDateString();
  const todayEntries = diaryEntries?.filter(entry => {
    const entryDate = new Date(entry.mealDate).toDateString();
    return entryDate === today;
  }) || [];

  // Calculate today's totals
  const totals = calculateDailyNutrition(todayEntries);

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
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      {/* AI Motivational Quote */}
      <Card className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white p-6 border-0 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">AI Motivation</h3>
            <p className="text-purple-100 mt-1">{motivationalQuote}</p>
          </div>
        </div>
      </Card>

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-lg">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Calories</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {totals.calories}
              </p>
              {nutritionGoals?.dailyCalories && (
                <p className="text-xs text-muted-foreground">{caloriesPercent}% of goal</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg">
              <Dumbbell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Protein</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(totals.protein)}g
              </p>
              {nutritionGoals?.dailyProtein && (
                <p className="text-xs text-muted-foreground">{proteinPercent}% of goal</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg">
              <Wheat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Carbs</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {Math.round(totals.carbs)}g
              </p>
              {nutritionGoals?.dailyCarbs && (
                <p className="text-xs text-muted-foreground">{carbsPercent}% of goal</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded-lg">
              <Droplet className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fat</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {Math.round(totals.fat)}g
              </p>
              {nutritionGoals?.dailyFat && (
                <p className="text-xs text-muted-foreground">{fatPercent}% of goal</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Macro Distribution Chart */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Today's Macro Distribution</h3>
        </div>
        {totalMacroCalories > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${Math.round(value)} cal`}
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => {
                    const percent = Math.round((entry.payload.value / totalMacroCalories) * 100);
                    return `${value}: ${percent}%`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No meals logged today</p>
              <p className="text-sm mt-1">Start tracking to see your macro distribution!</p>
            </div>
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-50 via-orange-50 to-cream-50 dark:from-purple-950/10 dark:via-orange-950/10 dark:to-background">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            Today's Progress
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Meals Logged</span>
              <span className="font-semibold text-purple-600">{todayEntries.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Goal Progress</span>
              <span className="font-semibold text-orange-600">{caloriesPercent}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-white dark:from-green-950/10 dark:to-background border-green-200 dark:border-green-800">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Award className="h-4 w-4 text-green-600" />
            Keep It Up!
          </h4>
          <p className="text-sm text-muted-foreground">
            {totals.calories > 0
              ? `Great job! You're ${caloriesPercent}% of the way to your daily goal.`
              : "Start logging meals to track your progress!"}
          </p>
        </Card>
      </div>

      {/* View All Meals Button */}
      {onViewMeals && todayEntries.length > 0 && (
        <button
          onClick={onViewMeals}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center space-x-2 shadow-lg"
          data-testid="button-view-all-meals"
        >
          <Utensils className="h-5 w-5" />
          <span>View All Meals</span>
        </button>
      )}
    </div>
  );
}
