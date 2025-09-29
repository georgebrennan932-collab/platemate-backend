import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { TrendingUp, TrendingDown, Award, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DiaryEntryWithAnalysis, DrinkEntry, NutritionGoals } from "@shared/schema";
import { calculateDailyNutrition } from "@/lib/nutrition-calculator";

interface WeeklyAnalyticsProps {
  goals: NutritionGoals | undefined;
}

export function WeeklyAnalytics({ goals }: WeeklyAnalyticsProps) {
  const { data: diaryEntries = [] } = useQuery<DiaryEntryWithAnalysis[]>({
    queryKey: ['/api/diary'],
  });

  const { data: drinkEntries = [] } = useQuery<DrinkEntry[]>({
    queryKey: ['/api/drinks'],
  });

  // Calculate weekly nutrition data
  const getWeeklyData = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return weekDays.map(day => {
      // Use standardized nutrition calculation function
      const nutrition = calculateDailyNutrition(diaryEntries, drinkEntries, day);

      return {
        date: day,
        nutrition,
        goals: goals ? {
          calories: goals.dailyCalories || 2000,
          protein: goals.dailyProtein || 150,
          carbs: goals.dailyCarbs || 250,
          fat: goals.dailyFat || 65,
          water: goals.dailyWater || 2000,
        } : null,
      };
    });
  };

  const weeklyData = getWeeklyData();
  
  // Calculate weekly averages and achievements
  const weeklyStats = React.useMemo(() => {
    if (!goals || weeklyData.length === 0) return null;

    const totals = weeklyData.reduce((acc, day) => ({
      calories: acc.calories + day.nutrition.calories,
      protein: acc.protein + day.nutrition.protein,
      carbs: acc.carbs + day.nutrition.carbs,
      fat: acc.fat + day.nutrition.fat,
      water: acc.water + day.nutrition.water,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 });

    const averages = {
      calories: totals.calories / weeklyData.length,
      protein: totals.protein / weeklyData.length,
      carbs: totals.carbs / weeklyData.length,
      fat: totals.fat / weeklyData.length,
      water: totals.water / weeklyData.length,
    };

    const goalAchievements = weeklyData.map(day => ({
      calories: day.goals ? (day.nutrition.calories / day.goals.calories) >= 0.9 : false,
      protein: day.goals ? (day.nutrition.protein / day.goals.protein) >= 0.9 : false,
      carbs: day.goals ? (day.nutrition.carbs / day.goals.carbs) >= 0.9 : false,
      fat: day.goals ? (day.nutrition.fat / day.goals.fat) >= 0.9 : false,
      water: day.goals ? (day.nutrition.water / day.goals.water) >= 0.9 : false,
    }));

    const achievementRates = {
      calories: (goalAchievements.filter(day => day.calories).length / weeklyData.length) * 100,
      protein: (goalAchievements.filter(day => day.protein).length / weeklyData.length) * 100,
      carbs: (goalAchievements.filter(day => day.carbs).length / weeklyData.length) * 100,
      fat: (goalAchievements.filter(day => day.fat).length / weeklyData.length) * 100,
      water: (goalAchievements.filter(day => day.water).length / weeklyData.length) * 100,
    };

    return {
      averages,
      achievementRates,
      totalGoalsAchieved: goalAchievements.reduce((total, day) => 
        total + (Object.values(day).filter(Boolean).length), 0
      ),
      daysTracked: weeklyData.filter(day => day.nutrition.calories > 0).length,
    };
  }, [weeklyData, goals]);

  if (!goals || !weeklyStats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">
            Set nutrition goals to see your weekly analytics
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">This Week's Progress</CardTitle>
          </div>
          <CardDescription>
            Your nutrition achievements for {format(weeklyData[0].date, 'MMM d')} - {format(weeklyData[6].date, 'MMM d')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary" data-testid="days-tracked">
                {weeklyStats.daysTracked}
              </div>
              <div className="text-sm text-muted-foreground">Days Tracked</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600" data-testid="goals-achieved">
                {weeklyStats.totalGoalsAchieved}
              </div>
              <div className="text-sm text-muted-foreground">Goals Achieved</div>
            </div>
          </div>

          {/* Achievement Rates */}
          <div className="space-y-3">
            <h4 className="font-medium">Goal Achievement Rates</h4>
            {[
              { key: 'calories', label: 'Calories', target: goals.dailyCalories },
              { key: 'protein', label: 'Protein', target: goals.dailyProtein },
              { key: 'carbs', label: 'Carbs', target: goals.dailyCarbs },
              { key: 'fat', label: 'Fat', target: goals.dailyFat },
              { key: 'water', label: 'Water', target: goals.dailyWater },
            ].map(({ key, label, target }) => {
              const rate = weeklyStats.achievementRates[key as keyof typeof weeklyStats.achievementRates];
              const average = weeklyStats.averages[key as keyof typeof weeklyStats.averages];
              
              return (
                <div key={key} className="space-y-2" data-testid={`weekly-${key}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">
                        {Math.round(average)} / {target} avg
                      </span>
                      {rate >= 80 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : rate >= 50 ? (
                        <TrendingUp className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={rate} 
                    className="h-2"
                    data-testid={`weekly-${key}-progress`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(rate)}% of days on target</span>
                    {rate >= 80 && (
                      <span className="text-green-600 font-medium flex items-center space-x-1">
                        <Award className="h-3 w-3" />
                        <span>Great!</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Overview</CardTitle>
          <CardDescription>Quick view of this week's daily progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weeklyData.map((day, index) => {
              const isToday = day.date.toDateString() === new Date().toDateString();
              const hasData = day.nutrition.calories > 0;
              const calorieProgress = day.goals ? (day.nutrition.calories / day.goals.calories) * 100 : 0;
              
              return (
                <div 
                  key={day.date.toISOString()} 
                  className={`text-center p-2 rounded-lg border ${
                    isToday ? 'bg-primary/10 border-primary' : 'bg-card'
                  }`}
                  data-testid={`day-${index}`}
                >
                  <div className="text-xs font-medium">
                    {format(day.date, 'EEE')}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {format(day.date, 'd')}
                  </div>
                  <div className="w-6 h-6 mx-auto rounded-full border-2 flex items-center justify-center">
                    {hasData ? (
                      <div 
                        className={`w-4 h-4 rounded-full ${
                          calorieProgress >= 90 ? 'bg-green-500' :
                          calorieProgress >= 70 ? 'bg-yellow-500' :
                          calorieProgress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                        title={`${Math.round(day.nutrition.calories)} calories`}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-gray-200" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-center">
            🟢 Goal achieved • 🟡 Partial progress • 🔵 Some progress • ⚪ No data
          </div>
        </CardContent>
      </Card>
    </div>
  );
}