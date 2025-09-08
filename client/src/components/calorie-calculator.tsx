import React from 'react';
import { User, Scale, Target, Activity, Calculator } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { insertUserProfileSchema, type InsertUserProfile, type UserProfile } from '@shared/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface CalorieCalculatorProps {
  onCaloriesCalculated?: (calories: number) => void;
}

// Enhanced schema with all required fields for calculation
const profileFormSchema = insertUserProfileSchema.extend({
  age: z.number().min(10).max(120),
  sex: z.enum(["male", "female"]),
  heightCm: z.number().min(100).max(250),
  currentWeightKg: z.number().min(30).max(300),
  goalWeightKg: z.number().min(30).max(300),
  activityLevel: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]),
  weightGoal: z.enum(["lose_weight", "maintain_weight", "gain_weight"]),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export function CalorieCalculator({ onCaloriesCalculated }: CalorieCalculatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculatedCalories, setCalculatedCalories] = React.useState<number | null>(null);
  const [bmrData, setBmrData] = React.useState<any>(null);

  // Fetch existing profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user-profile'],
    retry: false,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      age: profile?.age || 25,
      sex: profile?.sex as "male" | "female" || "male",
      heightCm: profile?.heightCm || 170,
      currentWeightKg: profile?.currentWeightKg || 70,
      goalWeightKg: profile?.goalWeightKg || 65,
      activityLevel: profile?.activityLevel as any || "moderately_active",
      weightGoal: profile?.weightGoal as any || "maintain_weight",
      weeklyWeightChangeKg: profile?.weeklyWeightChangeKg || 0,
    },
  });

  // Update form when profile loads
  React.useEffect(() => {
    if (profile) {
      form.reset({
        age: profile.age || 25,
        sex: profile.sex as "male" | "female" || "male",
        heightCm: profile.heightCm || 170,
        currentWeightKg: profile.currentWeightKg || 70,
        goalWeightKg: profile.goalWeightKg || 65,
        activityLevel: profile.activityLevel as any || "moderately_active",
        weightGoal: profile.weightGoal as any || "maintain_weight",
        weeklyWeightChangeKg: profile.weeklyWeightChangeKg || 0,
      });
    }
  }, [profile, form]);

  const saveProfileMutation = useMutation({
    mutationFn: async (data: InsertUserProfile) => {
      await apiRequest('POST', '/api/user-profile', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Saved",
        description: "Your profile and calorie calculation has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-profile'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving profile:", error);
    },
  });

  const updateGoalsMutation = useMutation({
    mutationFn: async (goals: { dailyCalories: number; dailyProtein: number; dailyCarbs: number; dailyFat: number; dailyWater: number }) => {
      await apiRequest('POST', '/api/nutrition-goals', goals);
    },
    onSuccess: () => {
      toast({
        title: "Goals Updated! 🎯",
        description: "Your nutrition goals have been updated with the calculated values.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition-goals'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update goals. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating goals:", error);
    },
  });

  // Calculate BMR using Mifflin-St Jeor Equation (more accurate than Harris-Benedict)
  const calculateBMR = (data: ProfileFormData) => {
    const { sex, heightCm, currentWeightKg, age } = data;
    
    let bmr;
    if (sex === 'male') {
      bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age - 161;
    }
    
    return bmr;
  };

  // Calculate TDEE (Total Daily Energy Expenditure)
  const calculateTDEE = (bmr: number, activityLevel: string) => {
    const activityMultipliers = {
      sedentary: 1.2,           // Little to no exercise
      lightly_active: 1.375,    // Light exercise 1-3 days/week
      moderately_active: 1.55,  // Moderate exercise 3-5 days/week
      very_active: 1.725,       // Heavy exercise 6-7 days/week
      extra_active: 1.9,        // Very heavy exercise, physical job
    };
    
    return bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers];
  };

  // Calculate daily calories needed for weight goal
  const calculateTargetCalories = (tdee: number, weightGoal: string, weeklyChange: number = 0.5) => {
    // 1 kg of fat ≈ 7700 calories
    const caloriesPerKg = 7700;
    const dailyCalorieChange = (weeklyChange * caloriesPerKg) / 7;
    
    switch (weightGoal) {
      case 'lose_weight':
        return Math.round(tdee - Math.abs(dailyCalorieChange));
      case 'gain_weight':
        return Math.round(tdee + Math.abs(dailyCalorieChange));
      case 'maintain_weight':
      default:
        return Math.round(tdee);
    }
  };

  const handleCalculate = (data: ProfileFormData) => {
    const bmr = calculateBMR(data);
    const tdee = calculateTDEE(bmr, data.activityLevel);
    const targetCalories = calculateTargetCalories(tdee, data.weightGoal, Math.abs(data.weeklyWeightChangeKg || 0.5));
    
    const calculationData = {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      weightChange: data.goalWeightKg - data.currentWeightKg,
      timeToGoal: Math.abs(data.goalWeightKg - data.currentWeightKg) / (Math.abs(data.weeklyWeightChangeKg || 0.5) / 7),
    };
    
    setCalculatedCalories(targetCalories);
    setBmrData(calculationData);
    
    if (onCaloriesCalculated) {
      onCaloriesCalculated(targetCalories);
    }
  };

  // Calculate recommended macronutrient targets based on calculated calories
  const calculateMacroTargets = (calories: number) => {
    // Standard macronutrient distribution for balanced diet
    const proteinCaloriesPercent = 0.25; // 25% protein
    const carbsCaloriesPercent = 0.45;   // 45% carbs  
    const fatCaloriesPercent = 0.30;     // 30% fat
    
    const proteinGrams = Math.round((calories * proteinCaloriesPercent) / 4); // 4 calories per gram protein
    const carbsGrams = Math.round((calories * carbsCaloriesPercent) / 4);     // 4 calories per gram carbs
    const fatGrams = Math.round((calories * fatCaloriesPercent) / 9);         // 9 calories per gram fat
    
    return {
      dailyCalories: calories,
      dailyProtein: proteinGrams,
      dailyCarbs: carbsGrams,
      dailyFat: fatGrams,
      dailyWater: 2500, // Standard 2.5L water recommendation
    };
  };

  const handleUpdateGoals = () => {
    if (calculatedCalories) {
      const goals = calculateMacroTargets(calculatedCalories);
      updateGoalsMutation.mutate(goals);
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    handleCalculate(data);
    saveProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Personal Calorie Calculator
          </CardTitle>
          <CardDescription>
            Calculate your daily calorie needs based on your physical stats and weight goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Age (years)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-age"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sex</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sex">
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heightCm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-height"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentWeightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        Current Weight (kg)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-current-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goalWeightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Goal Weight (kg)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-goal-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Activity Level
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-activity">
                            <SelectValue placeholder="Select activity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sedentary">Sedentary (desk job, no exercise)</SelectItem>
                          <SelectItem value="lightly_active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                          <SelectItem value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                          <SelectItem value="very_active">Very Active (heavy exercise 6-7 days/week)</SelectItem>
                          <SelectItem value="extra_active">Extra Active (very heavy exercise, physical job)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Weight Goal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weightGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight Goal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-weight-goal">
                            <SelectValue placeholder="Select weight goal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lose_weight">Lose Weight</SelectItem>
                          <SelectItem value="maintain_weight">Maintain Weight</SelectItem>
                          <SelectItem value="gain_weight">Gain Weight</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weeklyWeightChangeKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Weekly Change (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-weekly-change"
                          placeholder="0.5"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={saveProfileMutation.isPending}
                data-testid="button-calculate-calories"
              >
                {saveProfileMutation.isPending ? 'Calculating...' : 'Calculate My Daily Calories'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Results */}
      {calculatedCalories && bmrData && (
        <Card>
          <CardHeader>
            <CardTitle>Your Personalized Calorie Targets</CardTitle>
            <CardDescription>
              Based on your physical stats and weight goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{bmrData.bmr}</div>
                <div className="text-sm text-muted-foreground">BMR (calories/day)</div>
                <div className="text-xs text-muted-foreground mt-1">Base metabolic rate</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{bmrData.tdee}</div>
                <div className="text-sm text-muted-foreground">TDEE (calories/day)</div>
                <div className="text-xs text-muted-foreground mt-1">Including activity</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{calculatedCalories}</div>
                <div className="text-sm text-muted-foreground">Target (calories/day)</div>
                <div className="text-xs text-muted-foreground mt-1">To reach goal</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(Math.abs(bmrData.weightChange))}kg
                </div>
                <div className="text-sm text-muted-foreground">
                  {bmrData.weightChange > 0 ? 'To gain' : bmrData.weightChange < 0 ? 'To lose' : 'Maintain'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(bmrData.timeToGoal)} days to goal
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">How we calculated this:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>BMR:</strong> Mifflin-St Jeor equation based on your age, sex, height, and weight</li>
                <li>• <strong>TDEE:</strong> BMR × activity level multiplier</li>
                <li>• <strong>Target:</strong> TDEE adjusted for your weight goal (±{Math.abs(form.getValues('weeklyWeightChangeKg') || 0.5)}kg/week)</li>
                <li>• <strong>Timeline:</strong> Based on safe weight change rate</li>
              </ul>
            </div>

            {/* Update Goals Button */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Update Your Nutrition Goals
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Set your daily targets to {calculatedCalories} calories with balanced macronutrients:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium">{calculateMacroTargets(calculatedCalories).dailyCalories}</div>
                      <div className="text-muted-foreground">Calories</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{calculateMacroTargets(calculatedCalories).dailyProtein}g</div>
                      <div className="text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{calculateMacroTargets(calculatedCalories).dailyCarbs}g</div>
                      <div className="text-muted-foreground">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{calculateMacroTargets(calculatedCalories).dailyFat}g</div>
                      <div className="text-muted-foreground">Fat</div>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleUpdateGoals}
                  disabled={updateGoalsMutation.isPending}
                  className="ml-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                  data-testid="button-update-goals"
                >
                  {updateGoalsMutation.isPending ? 'Updating...' : 'Update Goals'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}