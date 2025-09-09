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
  medication: z.enum(["none", "ozempic", "wegovy", "mounjaro", "other_glp1"]).optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export function CalorieCalculator({ onCaloriesCalculated }: CalorieCalculatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculatedCalories, setCalculatedCalories] = React.useState<number | null>(null);
  const [bmrData, setBmrData] = React.useState<any>(null);
  
  // Load form data from localStorage as fallback
  const loadFormDataFromStorage = () => {
    try {
      const saved = localStorage.getItem('calculator-form-data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };
  
  // Save form data to localStorage
  const saveFormDataToStorage = (data: ProfileFormData) => {
    try {
      localStorage.setItem('calculator-form-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Could not save form data to localStorage:', error);
    }
  };

  // Fetch existing profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/user-profile'],
    retry: false,
  });

  // Get initial form data from saved profile or localStorage
  const getInitialFormData = () => {
    const savedData = loadFormDataFromStorage();
    return {
      age: profile?.age || savedData?.age || 25,
      sex: (profile?.sex as "male" | "female") || savedData?.sex || "male",
      heightCm: profile?.heightCm || savedData?.heightCm || 170,
      currentWeightKg: profile?.currentWeightKg || savedData?.currentWeightKg || 70,
      goalWeightKg: profile?.goalWeightKg || savedData?.goalWeightKg || 65,
      activityLevel: (profile?.activityLevel as any) || savedData?.activityLevel || "moderately_active",
      weightGoal: (profile?.weightGoal as any) || savedData?.weightGoal || "maintain_weight",
      weeklyWeightChangeKg: profile?.weeklyWeightChangeKg || savedData?.weeklyWeightChangeKg || 0.75,
      medication: (profile?.medication as any) || savedData?.medication || "none",
    };
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: getInitialFormData(),
  });

  // Update form when profile loads or save current form data
  React.useEffect(() => {
    console.log('Profile data loaded:', profile);
    
    if (profile) {
      // If we have a saved profile, use it
      const formData = {
        age: profile.age && profile.age > 0 ? profile.age : 25,
        sex: (profile.sex as "male" | "female") || "male",
        heightCm: profile.heightCm && profile.heightCm > 0 ? profile.heightCm : 170,
        currentWeightKg: profile.currentWeightKg && profile.currentWeightKg > 0 ? profile.currentWeightKg : 70,
        goalWeightKg: profile.goalWeightKg && profile.goalWeightKg > 0 ? profile.goalWeightKg : 65,
        activityLevel: (profile.activityLevel as any) || "moderately_active",
        weightGoal: (profile.weightGoal as any) || "maintain_weight",
        weeklyWeightChangeKg: profile.weeklyWeightChangeKg || 0,
        medication: (profile.medication as any) || "none",
      };
      console.log('Setting form data from profile:', formData);
      form.reset(formData);
    } else {
      // If no profile, try to restore from localStorage
      const savedData = loadFormDataFromStorage();
      if (savedData) {
        console.log('Restoring form data from localStorage:', savedData);
        form.reset(savedData);
      }
    }
  }, [profile, form]);
  
  // Auto-save form data to localStorage when form changes
  React.useEffect(() => {
    const subscription = form.watch((data) => {
      if (data.age && data.sex && data.heightCm && data.currentWeightKg) {
        saveFormDataToStorage(data as ProfileFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

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

  // Calculate daily calories needed for weight goal with medication considerations
  const calculateTargetCalories = (tdee: number, weightGoal: string, weeklyChange: number = 0.75, bmr: number, medication: string = 'none') => {
    // 1 kg of fat ≈ 7700 calories (more effective default of 0.75kg/week for better weight loss)
    const caloriesPerKg = 7700;
    const dailyCalorieChange = (weeklyChange * caloriesPerKg) / 7;
    
    let targetCalories: number;
    switch (weightGoal) {
      case 'lose_weight':
        targetCalories = tdee - Math.abs(dailyCalorieChange);
        break;
      case 'gain_weight':
        targetCalories = tdee + Math.abs(dailyCalorieChange);
        break;
      case 'maintain_weight':
      default:
        targetCalories = tdee;
        break;
    }
    
    // Apply medication adjustments
    if (medication && medication !== 'none' && weightGoal === 'lose_weight') {
      const medicationAdjustment = getMedicationAdjustment(medication);
      
      // Higher minimum calories for people on GLP-1 medications
      const minCalories = bmr * medicationAdjustment.minMultiplier;
      
      // Limit maximum deficit to prevent too rapid weight loss
      const maxDeficit = medicationAdjustment.maxDeficit;
      const actualDeficit = Math.min(tdee - targetCalories, maxDeficit);
      
      targetCalories = Math.max(tdee - actualDeficit, minCalories);
    } else if (weightGoal === 'lose_weight') {
      // More aggressive but safe floor for effective weight loss (1200 cal minimum for women, 1500 for men)
      const safeMinimum = bmr < 1400 ? 1200 : 1500; // Gender-appropriate minimums
      targetCalories = Math.max(targetCalories, safeMinimum);
    }
    
    return Math.round(targetCalories);
  };

  // Get medication-specific adjustments
  const getMedicationAdjustment = (medication: string) => {
    switch (medication) {
      case 'ozempic':
      case 'wegovy':
        return {
          minMultiplier: 1.1, // 110% of BMR minimum (less restrictive for better results)
          maxDeficit: 800, // Max 800 calorie deficit per day (more effective weight loss)
          name: 'Semaglutide (Ozempic/Wegovy)'
        };
      case 'mounjaro':
        return {
          minMultiplier: 1.1, // 110% of BMR minimum (more effective)
          maxDeficit: 850, // Max 850 calorie deficit per day (better weight loss)
          name: 'Tirzepatide (Mounjaro)'
        };
      case 'other_glp1':
        return {
          minMultiplier: 1.1, // 110% of BMR minimum (more effective)
          maxDeficit: 800, // Max 800 calorie deficit per day (better results)
          name: 'GLP-1 Medication'
        };
      default:
        return {
          minMultiplier: 1.2,
          maxDeficit: 1000,
          name: 'None'
        };
    }
  };

  const handleCalculate = (data: ProfileFormData) => {
    const bmr = calculateBMR(data);
    const tdee = calculateTDEE(bmr, data.activityLevel);
    const targetCalories = calculateTargetCalories(tdee, data.weightGoal, Math.abs(data.weeklyWeightChangeKg || 0.75), bmr, data.medication);
    
    const calculationData = {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      weightChange: data.goalWeightKg - data.currentWeightKg,
      timeToGoal: Math.abs(data.goalWeightKg - data.currentWeightKg) / (Math.abs(data.weeklyWeightChangeKg || 0.75) / 7),
      medication: data.medication,
      medicationAdjustment: data.medication !== 'none' ? getMedicationAdjustment(data.medication || 'none') : null,
    };
    
    setCalculatedCalories(targetCalories);
    setBmrData(calculationData);
    
    if (onCaloriesCalculated) {
      onCaloriesCalculated(targetCalories);
    }
  };

  // Calculate recommended macronutrient targets based on calculated calories
  const calculateMacroTargets = (calories: number) => {
    // More realistic macronutrient distribution for sustainable health
    const proteinCaloriesPercent = 0.20; // 20% protein (more reasonable for most people)
    const carbsCaloriesPercent = 0.40;   // 40% carbs (better for weight management)  
    const fatCaloriesPercent = 0.40;     // 40% fat (supports satiety and hormone function)
    
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
    console.log('Form submitted with data:', data);
    console.log('Form errors:', form.formState.errors);
    
    // Validate required fields with better error messaging
    if (!data.age || data.age < 10 || data.age > 120) {
      toast({
        title: "Invalid Age",
        description: "Please enter a valid age between 10 and 120 years.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.sex) {
      toast({
        title: "Missing Information",
        description: "Please select your sex.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.heightCm || data.heightCm < 100 || data.heightCm > 250) {
      toast({
        title: "Invalid Height",
        description: "Please enter a valid height between 100-250 cm.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.currentWeightKg || data.currentWeightKg < 30 || data.currentWeightKg > 300) {
      toast({
        title: "Invalid Current Weight",
        description: "Please enter a valid current weight between 30-300 kg.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.goalWeightKg || data.goalWeightKg < 30 || data.goalWeightKg > 300) {
      toast({
        title: "Invalid Goal Weight", 
        description: "Please enter a valid goal weight between 30-300 kg.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.activityLevel) {
      toast({
        title: "Missing Activity Level",
        description: "Please select your activity level.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.weightGoal) {
      toast({
        title: "Missing Weight Goal",
        description: "Please select your weight goal.",
        variant: "destructive",
      });
      return;
    }

    // Always calculate first
    handleCalculate(data);
    // Then save profile
    saveProfileMutation.mutate(data);
  };

  // Add a calculate-only function that doesn't save profile
  const handleCalculateOnly = () => {
    const formData = form.getValues();
    
    // Validate required fields
    if (!formData.age || !formData.sex || !formData.heightCm || !formData.currentWeightKg || 
        !formData.goalWeightKg || !formData.activityLevel || !formData.weightGoal || !formData.medication) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to calculate your calories.",
        variant: "destructive",
      });
      return;
    }
    
    handleCalculate(formData as ProfileFormData);
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
    <div className="space-y-8">
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-white/20 rounded-lg">
              <Calculator className="h-6 w-6" />
            </div>
            Personal Calorie Calculator
          </CardTitle>
          <CardDescription className="text-blue-100 text-base">
            ✨ Calculate your daily calorie needs based on your physical stats and weight goals
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        Age (years)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow user to clear field completely
                            if (value === '') {
                              field.onChange(0);
                              return;
                            }
                            const parsed = parseInt(value);
                            field.onChange(isNaN(parsed) ? 0 : parsed);
                          }}
                          value={field.value === 0 || field.value === null || field.value === undefined ? '' : field.value}
                          data-testid="input-age"
                          className="border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base"
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
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span>👤</span> Sex
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sex" className="border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base">
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
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          📏
                        </div>
                        Height (cm)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow user to clear field completely
                            if (value === '') {
                              field.onChange(0);
                              return;
                            }
                            const parsed = parseInt(value);
                            field.onChange(isNaN(parsed) ? 0 : parsed);
                          }}
                          value={field.value === 0 || field.value === null || field.value === undefined ? '' : field.value}
                          data-testid="input-height"
                          className="border-2 border-gray-200 hover:border-green-300 focus:border-green-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base"
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
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                          <Scale className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        Current Weight (kg)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow user to clear field completely
                            if (value === '') {
                              field.onChange(0);
                              return;
                            }
                            const parsed = parseInt(value);
                            field.onChange(isNaN(parsed) ? 0 : parsed);
                          }}
                          value={field.value === 0 || field.value === null || field.value === undefined ? '' : field.value}
                          data-testid="input-current-weight"
                          className="border-2 border-gray-200 hover:border-orange-300 focus:border-orange-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base"
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
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        Goal Weight (kg)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow user to clear field completely
                            if (value === '') {
                              field.onChange(0);
                              return;
                            }
                            const parsed = parseInt(value);
                            field.onChange(isNaN(parsed) ? 0 : parsed);
                          }}
                          value={field.value === 0 || field.value === null || field.value === undefined ? '' : field.value}
                          data-testid="input-goal-weight"
                          className="border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base"
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
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                          <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Activity Level
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-activity" className="border-2 border-gray-200 hover:border-emerald-300 focus:border-emerald-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="weightGoal"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2">
                        🎯 Weight Goal
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-weight-goal" className="border-2 border-gray-200 hover:border-pink-300 focus:border-pink-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base">
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
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          📈
                        </div>
                        Target Weekly Change (kg)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow user to clear field completely
                            if (value === '') {
                              field.onChange(0);
                              return;
                            }
                            const parsed = parseFloat(value);
                            field.onChange(isNaN(parsed) ? 0 : parsed);
                          }}
                          value={field.value === 0 || field.value === null || field.value === undefined ? '' : field.value}
                          data-testid="input-weekly-change"
                          placeholder="0.5"
                          className="border-2 border-gray-200 hover:border-indigo-300 focus:border-indigo-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Medication Field */}
              <FormField
                control={form.control}
                name="medication"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                        <Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      Weight Loss Medication
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-medication" className="border-2 border-gray-200 hover:border-teal-300 focus:border-teal-500 transition-all duration-200 shadow-sm bg-white dark:bg-gray-800 rounded-lg px-4 py-3 text-base">
                          <SelectValue placeholder="Select medication (if any)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No medication</SelectItem>
                        <SelectItem value="ozempic">Ozempic (Semaglutide)</SelectItem>
                        <SelectItem value="wegovy">Wegovy (Semaglutide)</SelectItem>
                        <SelectItem value="mounjaro">Mounjaro (Tirzepatide)</SelectItem>
                        <SelectItem value="other_glp1">Other GLP-1 medication</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4">
                <Button 
                  type="button"
                  onClick={handleCalculateOnly}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  data-testid="button-calculate-only"
                >
                  ✨ Calculate Daily Calories
                </Button>
                
                <Button 
                  type="submit" 
                  variant="outline"
                  className="w-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium py-4 rounded-xl transition-all duration-300" 
                  disabled={saveProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {saveProfileMutation.isPending ? '💾 Saving...' : '💾 Save Profile & Calculate'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Results */}
      {calculatedCalories && bmrData && (
        <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                🎯
              </div>
              Your Personalized Calorie Targets
            </CardTitle>
            <CardDescription className="text-green-100 text-base">
              ✨ Based on your physical stats and weight goals
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* BMR Card */}
              <div className="text-center p-6 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/30 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-blue-200/50">
                <div className="mb-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                    <span className="text-white text-xl">⚡</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-1">{bmrData.bmr}</div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">BMR (calories/day)</div>
                <div className="text-xs text-blue-500 dark:text-blue-400/80 mt-1">Base metabolic rate</div>
              </div>
              
              {/* TDEE Card */}
              <div className="text-center p-6 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/30 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-green-200/50">
                <div className="mb-3">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                    <span className="text-white text-xl">🏃</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-700 dark:text-green-300 mb-1">{bmrData.tdee}</div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">TDEE (calories/day)</div>
                <div className="text-xs text-green-500 dark:text-green-400/80 mt-1">Including activity</div>
              </div>
              
              {/* Target Card */}
              <div className="text-center p-6 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/30 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-orange-200/50">
                <div className="mb-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-orange-700 dark:text-orange-300 mb-1">{calculatedCalories}</div>
                <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">Target (calories/day)</div>
                <div className="text-xs text-orange-500 dark:text-orange-400/80 mt-1">To reach goal</div>
              </div>
              
              {/* Weight Change Card */}
              <div className="text-center p-6 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/30 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-purple-200/50">
                <div className="mb-3">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                    <span className="text-white text-xl">⏱️</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-1">
                  {Math.round(Math.abs(bmrData.weightChange))}kg
                </div>
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  {bmrData.weightChange > 0 ? 'To gain' : bmrData.weightChange < 0 ? 'To lose' : 'Maintain'}
                </div>
                <div className="text-xs text-purple-500 dark:text-purple-400/80 mt-1">
                  {Math.round(bmrData.timeToGoal)} days to goal
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl border border-gray-200/50 dark:border-gray-600/30">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="text-xl">📊</span> How we calculated this:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>BMR:</strong> Mifflin-St Jeor equation based on your age, sex, height, and weight</li>
                <li>• <strong>TDEE:</strong> BMR × activity level multiplier</li>
                <li>• <strong>Target:</strong> TDEE adjusted for your weight goal (±{Math.abs(form.getValues('weeklyWeightChangeKg') || 0.5)}kg/week)</li>
                {bmrData.medicationAdjustment && (
                  <li>• <strong>Medication adjustment:</strong> Increased minimum calories for {bmrData.medicationAdjustment.name} to prevent malnutrition</li>
                )}
                <li>• <strong>Timeline:</strong> Based on safe weight change rate</li>
              </ul>
            </div>

            {/* Medication-Specific Advice */}
            {bmrData.medication && bmrData.medication !== 'none' && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  GLP-1 Medication Considerations
                </h4>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <p><strong>Higher calorie floor:</strong> Your minimum daily calories are set higher due to appetite suppression effects.</p>
                  <p><strong>Slower weight loss:</strong> Calorie deficit is limited to prevent too rapid weight loss and nutrient deficiencies.</p>
                  <p><strong>Important:</strong> Monitor your food intake closely and ensure you're getting adequate nutrition despite reduced appetite.</p>
                  <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-200">
                    <strong>Medical reminder:</strong> Always follow your healthcare provider's guidance on diet and medication management.
                  </div>
                </div>
              </div>
            )}

            {/* Update Goals Button */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-green-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-green-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    🎯 Update Your Nutrition Goals
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 mb-4">
                    Set your daily targets to {calculatedCalories} calories with balanced macronutrients:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <div className="font-bold text-orange-600 dark:text-orange-400">{calculateMacroTargets(calculatedCalories).dailyCalories}</div>
                      <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">🔥 Calories</div>
                    </div>
                    <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <div className="font-bold text-blue-600 dark:text-blue-400">{calculateMacroTargets(calculatedCalories).dailyProtein}g</div>
                      <div className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">🥩 Protein</div>
                    </div>
                    <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <div className="font-bold text-green-600 dark:text-green-400">{calculateMacroTargets(calculatedCalories).dailyCarbs}g</div>
                      <div className="text-xs text-green-600/70 dark:text-green-400/70 font-medium">🍞 Carbs</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <div className="font-bold text-yellow-600 dark:text-yellow-400">{calculateMacroTargets(calculatedCalories).dailyFat}g</div>
                      <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70 font-medium">🥑 Fat</div>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleUpdateGoals}
                  disabled={updateGoalsMutation.isPending}
                  className="ml-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-green-600 hover:from-blue-700 hover:via-indigo-700 hover:to-green-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  data-testid="button-update-goals"
                >
                  {updateGoalsMutation.isPending ? '⏳ Updating...' : '🎯 Update Goals'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}