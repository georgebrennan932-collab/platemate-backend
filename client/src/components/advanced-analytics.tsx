import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { TrendingUp, TrendingDown, Award, Target, Calendar, Flame, Activity, Coffee } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { DiaryEntryWithAnalysis, DrinkEntry, NutritionGoals } from "@shared/schema";
import { calculateDailyNutrition } from "@/lib/nutrition-calculator";

interface AdvancedAnalyticsProps {
  goals: NutritionGoals | undefined;
}

export function AdvancedAnalytics({ goals }: AdvancedAnalyticsProps) {
  const { data: diaryEntries = [] } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
  });

  const { data: drinkEntries = [] } = useQuery<DrinkEntry[]>({
    queryKey: ['/api/drinks'],
  });

  // Calculate streak data
  const getStreakData = () => {
    const today = startOfDay(new Date());
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    // Sort entries by date descending
    const uniqueDates = new Set(
      diaryEntries.map(entry => format(new Date(entry.mealDate), 'yyyy-MM-dd'))
    );
    const sortedDates = Array.from(uniqueDates).sort().reverse();

    // Calculate current streak (from today backwards)
    for (const dateStr of sortedDates) {
      const date = startOfDay(new Date(dateStr));
      const expectedDate = lastDate ? subDays(lastDate, 1) : today;
      
      if (date.getTime() === expectedDate.getTime()) {
        tempStreak++;
        if (lastDate === null) currentStreak = tempStreak; // Only count current streak from today
      } else if (lastDate !== null) {
        break; // Streak broken
      }
      
      lastDate = date;
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return { currentStreak, longestStreak };
  };

  // Calculate nutrition trends over last 30 days
  const getTrendData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const targetDate = subDays(new Date(), i);
      const nutrition = calculateDailyNutrition(diaryEntries, drinkEntries, targetDate);
      
      return {
        date: format(targetDate, 'yyyy-MM-dd'),
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      };
    });

    // Calculate averages and trends
    const recent7Days = last30Days.slice(0, 7);
    const previous7Days = last30Days.slice(7, 14);

    const recent7Avg = {
      calories: recent7Days.reduce((sum, day) => sum + day.calories, 0) / 7,
      protein: recent7Days.reduce((sum, day) => sum + day.protein, 0) / 7,
    };

    const previous7Avg = {
      calories: previous7Days.reduce((sum, day) => sum + day.calories, 0) / 7,
      protein: previous7Days.reduce((sum, day) => sum + day.protein, 0) / 7,
    };

    return {
      caloriesTrend: recent7Avg.calories > previous7Avg.calories ? 'up' : 'down',
      caloriesChange: Math.abs(recent7Avg.calories - previous7Avg.calories),
      proteinTrend: recent7Avg.protein > previous7Avg.protein ? 'up' : 'down',
      proteinChange: Math.abs(recent7Avg.protein - previous7Avg.protein),
      averages: recent7Avg,
    };
  };

  // Calculate goal achievement rates
  const getGoalAchievement = () => {
    if (!goals) return { caloriesRate: 0, proteinRate: 0, weeklyRate: 0 };

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const targetDate = subDays(new Date(), i);
      const nutrition = calculateDailyNutrition(diaryEntries, drinkEntries, targetDate);
      
      return {
        calories: nutrition.calories,
        protein: nutrition.protein,
        achievedCalories: nutrition.calories >= (goals.dailyCalories || 2000) * 0.9,
        achievedProtein: nutrition.protein >= (goals.dailyProtein || 150) * 0.9,
      };
    });

    const caloriesRate = (last7Days.filter(day => day.achievedCalories).length / 7) * 100;
    const proteinRate = (last7Days.filter(day => day.achievedProtein).length / 7) * 100;
    const weeklyRate = (caloriesRate + proteinRate) / 2;

    return { caloriesRate, proteinRate, weeklyRate };
  };

  // Get eating pattern insights
  const getEatingPatterns = () => {
    const mealTimes = diaryEntries.map(entry => ({
      hour: new Date(entry.mealDate).getHours(),
      type: entry.mealType,
    }));

    const avgMealTimes = ['breakfast', 'lunch', 'dinner'].map(mealType => {
      const times = mealTimes.filter(meal => meal.type === mealType).map(meal => meal.hour);
      if (times.length === 0) return { type: mealType, avgHour: null };
      
      const avgHour = times.reduce((sum, hour) => sum + hour, 0) / times.length;
      return { type: mealType, avgHour: Math.round(avgHour) };
    });

    const lateNightSnacks = mealTimes.filter(meal => meal.hour >= 22 || meal.hour <= 5).length;
    
    return { avgMealTimes, lateNightSnacks };
  };

  const streakData = getStreakData();
  const trendData = getTrendData();
  const goalAchievement = getGoalAchievement();
  const eatingPatterns = getEatingPatterns();

  return (
    <div className="space-y-6">
      {/* Streak & Achievement Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Current Streak</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{streakData.currentStreak}</p>
                <p className="text-xs text-green-600 dark:text-green-400">days</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Goal Rate</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round(goalAchievement.weeklyRate)}%</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">this week</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nutrition Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Nutrition Trends (7-day average)
          </CardTitle>
          <CardDescription>
            Comparing this week vs last week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Calories</span>
            </div>
            <div className="flex items-center gap-2">
              {trendData.caloriesTrend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {Math.round(trendData.averages.calories)} cal/day
              </span>
              <Badge variant={trendData.caloriesTrend === 'up' ? 'default' : 'secondary'}>
                {trendData.caloriesTrend === 'up' ? '+' : '-'}{Math.round(trendData.caloriesChange)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-500" />
              <span className="font-medium">Protein</span>
            </div>
            <div className="flex items-center gap-2">
              {trendData.proteinTrend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {Math.round(trendData.averages.protein)}g/day
              </span>
              <Badge variant={trendData.proteinTrend === 'up' ? 'default' : 'secondary'}>
                {trendData.proteinTrend === 'up' ? '+' : '-'}{Math.round(trendData.proteinChange)}g
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal Achievement Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Goal Achievement</CardTitle>
          <CardDescription>
            Your consistency over the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Calorie Goals</span>
              <span className="font-medium">{Math.round(goalAchievement.caloriesRate)}%</span>
            </div>
            <Progress value={goalAchievement.caloriesRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Protein Goals</span>
              <span className="font-medium">{Math.round(goalAchievement.proteinRate)}%</span>
            </div>
            <Progress value={goalAchievement.proteinRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Eating Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Eating Patterns
          </CardTitle>
          <CardDescription>
            Insights about your meal timing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Average Meal Times</h4>
            {eatingPatterns.avgMealTimes.map(({ type, avgHour }) => (
              <div key={type} className="flex items-center justify-between">
                <span className="capitalize text-sm">{type}</span>
                <span className="text-sm font-medium">
                  {avgHour ? format(new Date().setHours(avgHour, 0), 'h:mm a') : 'No data'}
                </span>
              </div>
            ))}
          </div>

          {eatingPatterns.lateNightSnacks > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Late Night Pattern</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {eatingPatterns.lateNightSnacks} late night meals recorded (10 PM - 5 AM)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best & Worst Days */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
            <p>Longest streak: {streakData.longestStreak} days</p>
            <p className="mt-2">Keep up the great work! 🎉</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}