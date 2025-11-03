import { useState, useEffect } from "react";
import { ArrowLeft, User, Save, Loader2, Clock, Briefcase, Calculator, Scale, Target, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DropdownNavigation } from "@/components/dropdown-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { calculateNutritionTargets, calculateMacroTargets, type UserData } from "@/lib/nutrition-calculator";

const profileFormSchema = z.object({
  // Personal info
  name: z.string().optional(),
  nickname: z.string().optional(),
  // Physical stats & goals
  age: z.number().min(10).max(120).optional(),
  sex: z.enum(["male", "female"]).optional(),
  heightCm: z.number().min(100).max(250).optional(),
  currentWeightKg: z.number().min(30).max(300).optional(),
  goalWeightKg: z.number().min(30).max(300).optional(),
  activityLevel: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]).optional(),
  weightGoal: z.enum(["lose_weight", "maintain_weight", "gain_weight"]).optional(),
  medication: z.enum(["none", "ozempic", "wegovy", "mounjaro", "other_glp1"]).optional(),
  // Dietary & health
  dietaryRequirements: z.string().optional(),
  allergies: z.string().optional(),
  foodDislikes: z.string().optional(),
  healthConditions: z.string().optional(),
  // Work schedule
  defaultShiftType: z.string().optional(),
  customShiftStart: z.string().optional(),
  customShiftEnd: z.string().optional(),
  enableDailyShiftCheckIn: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export function ProfilePage() {
  const { toast } = useToast();
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [allergyTags, setAllergyTags] = useState<string[]>([]);
  const [selectedShiftType, setSelectedShiftType] = useState<string>("regular");
  const [breakTimes, setBreakTimes] = useState<string[]>([]);
  const [dailyCheckInEnabled, setDailyCheckInEnabled] = useState(false);
  const [calculatedData, setCalculatedData] = useState<any>(null);
  const [showCalculations, setShowCalculations] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/user-profile"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      nickname: "",
      age: undefined,
      sex: undefined,
      heightCm: undefined,
      currentWeightKg: undefined,
      goalWeightKg: undefined,
      activityLevel: undefined,
      weightGoal: undefined,
      medication: "none",
      dietaryRequirements: "",
      allergies: "",
      foodDislikes: "",
      healthConditions: "",
      defaultShiftType: "regular",
      customShiftStart: "",
      customShiftEnd: "",
      enableDailyShiftCheckIn: false,
    },
  });

  // Initialize tags and form fields when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.dietaryRequirements && Array.isArray(profile.dietaryRequirements)) {
        setDietaryTags(profile.dietaryRequirements);
      }
      if (profile.allergies && Array.isArray(profile.allergies)) {
        setAllergyTags(profile.allergies);
      }
      if (profile.defaultShiftType) {
        setSelectedShiftType(profile.defaultShiftType);
      }
      if (profile.customBreakWindows && Array.isArray(profile.customBreakWindows)) {
        setBreakTimes(profile.customBreakWindows);
      }
      if (profile.enableDailyShiftCheckIn !== undefined) {
        setDailyCheckInEnabled(profile.enableDailyShiftCheckIn === 1);
      }
      // Reset form with profile data
      form.reset({
        name: profile.name || "",
        nickname: profile.nickname || "",
        age: profile.age || undefined,
        sex: profile.sex as any || undefined,
        heightCm: profile.heightCm || undefined,
        currentWeightKg: profile.currentWeightKg || undefined,
        goalWeightKg: profile.goalWeightKg || undefined,
        activityLevel: profile.activityLevel as any || undefined,
        weightGoal: profile.weightGoal as any || undefined,
        medication: profile.medication as any || "none",
        dietaryRequirements: "",
        allergies: "",
        foodDislikes: profile.foodDislikes || "",
        healthConditions: profile.healthConditions || "",
        defaultShiftType: profile.defaultShiftType || "regular",
        customShiftStart: profile.customShiftStart || "",
        customShiftEnd: profile.customShiftEnd || "",
        enableDailyShiftCheckIn: profile.enableDailyShiftCheckIn === 1,
      });
    }
  }, [profile, form]);

  // Auto-calculate nutrition targets when physical stats change
  useEffect(() => {
    const subscription = form.watch((data) => {
      const { age, sex, heightCm, currentWeightKg, goalWeightKg, activityLevel, weightGoal, medication } = data;
      
      // Only calculate if all required fields are present
      if (age && sex && heightCm && currentWeightKg && goalWeightKg && activityLevel && weightGoal) {
        const userData: UserData = {
          age: age as number,
          sex: sex as "male" | "female",
          heightCm: heightCm as number,
          currentWeightKg: currentWeightKg as number,
          goalWeightKg: goalWeightKg as number,
          activityLevel: activityLevel as any,
          weightGoal: weightGoal as any,
          medication: medication as any,
        };
        
        const results = calculateNutritionTargets(userData);
        const macros = calculateMacroTargets(results.targetCalories, weightGoal as string);
        
        setCalculatedData({ ...results, macros });
        setShowCalculations(true);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/user-profile', data);
    },
    onSuccess: async () => {
      // Save nutrition goals if we have calculated data
      if (calculatedData && calculatedData.macros) {
        try {
          await apiRequest('POST', '/api/nutrition-goals', calculatedData.macros);
          queryClient.invalidateQueries({ queryKey: ["/api/nutrition-goals"] });
        } catch (error) {
          console.error("Failed to save nutrition goals:", error);
          toast({
            title: "Warning",
            description: "Profile saved but nutrition targets failed to update. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/user-profile"] });
      toast({
        title: "Profile saved!",
        description: calculatedData ? "Your profile and nutrition targets have been updated." : "Your profile has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    saveMutation.mutate({
      name: data.name || null,
      nickname: data.nickname || null,
      age: data.age || null,
      sex: data.sex || null,
      heightCm: data.heightCm || null,
      currentWeightKg: data.currentWeightKg || null,
      goalWeightKg: data.goalWeightKg || null,
      activityLevel: data.activityLevel || null,
      weightGoal: data.weightGoal || null,
      medication: data.medication || null,
      dietaryRequirements: dietaryTags,
      allergies: allergyTags,
      foodDislikes: data.foodDislikes || null,
      healthConditions: data.healthConditions || null,
      defaultShiftType: selectedShiftType,
      customShiftStart: data.customShiftStart || null,
      customShiftEnd: data.customShiftEnd || null,
      customBreakWindows: breakTimes,
      enableDailyShiftCheckIn: dailyCheckInEnabled ? 1 : 0,
    });
  };

  const addBreakTime = () => {
    setBreakTimes([...breakTimes, ""]);
  };

  const updateBreakTime = (index: number, value: string) => {
    const updated = [...breakTimes];
    updated[index] = value;
    setBreakTimes(updated);
  };

  const removeBreakTime = (index: number) => {
    setBreakTimes(breakTimes.filter((_, i) => i !== index));
  };

  const shiftTypes = [
    { value: "regular", label: "Regular Daytime", description: "Standard 9-5 working hours" },
    { value: "early_shift", label: "Early Shift", description: "e.g., 6am-2pm" },
    { value: "late_shift", label: "Late Shift", description: "e.g., 2pm-10pm" },
    { value: "night_shift", label: "Night Shift", description: "Overnight hours" },
    { value: "long_shift", label: "Long 12.5hr Clinical Shift", description: "For NHS/emergency workers" },
    { value: "custom", label: "Custom Shift", description: "Set your own hours" },
  ];

  const commonDietaryOptions = [
    "Vegetarian",
    "Vegan",
    "Pescatarian",
    "Keto",
    "Paleo",
    "Low Carb",
    "Gluten-Free",
    "Dairy-Free",
    "Halal",
    "Kosher",
  ];

  const commonAllergies = [
    "Peanuts",
    "Tree Nuts",
    "Milk/Dairy",
    "Eggs",
    "Fish",
    "Shellfish",
    "Soy",
    "Wheat/Gluten",
    "Sesame",
  ];

  const toggleTag = (tag: string, currentTags: string[], setTags: (tags: string[]) => void) => {
    if (currentTags.includes(tag)) {
      setTags(currentTags.filter((t) => t !== tag));
    } else {
      setTags([...currentTags, tag]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-gradient)'}}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground pb-32" style={{background: 'var(--bg-gradient)'}}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <button 
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6" />
              <h1 className="text-2xl font-bold">My Profile</h1>
            </div>
          </div>
          <p className="mt-2 text-white/90 text-sm ml-14">
            Help your AI Coach give you personalized advice
          </p>
        </div>
      </div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto p-4 space-y-6"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Help your AI Coach address you personally
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="block mb-2">
                  Your Name
                </Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="e.g., Sarah Johnson"
                  className="w-full"
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label htmlFor="nickname" className="block mb-2">
                  Preferred Name / Nickname
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  What should your AI Coach call you?
                </p>
                <Input
                  id="nickname"
                  {...form.register("nickname")}
                  placeholder="e.g., Sarah, SJ, Coach..."
                  className="w-full"
                  data-testid="input-nickname"
                />
              </div>
            </div>
          </div>

          {/* Physical Stats & Goals Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Physical Stats & Goals</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter your physical information to calculate your nutrition targets
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Age */}
              <div>
                <Label htmlFor="age" className="block mb-2">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  {...form.register("age", { valueAsNumber: true })}
                  placeholder="e.g., 30"
                  className="w-full"
                  data-testid="input-age"
                />
              </div>

              {/* Sex */}
              <div>
                <Label htmlFor="sex" className="block mb-2">Sex</Label>
                <Select onValueChange={(value) => form.setValue("sex", value as any)} value={form.watch("sex")}>
                  <SelectTrigger data-testid="select-sex" className="w-full">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Height */}
              <div>
                <Label htmlFor="heightCm" className="block mb-2">Height (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  {...form.register("heightCm", { valueAsNumber: true })}
                  placeholder="e.g., 170"
                  className="w-full"
                  data-testid="input-height"
                />
              </div>

              {/* Current Weight */}
              <div>
                <Label htmlFor="currentWeightKg" className="block mb-2">Current Weight (kg)</Label>
                <Input
                  id="currentWeightKg"
                  type="number"
                  {...form.register("currentWeightKg", { valueAsNumber: true })}
                  placeholder="e.g., 75"
                  className="w-full"
                  data-testid="input-current-weight"
                />
              </div>

              {/* Goal Weight */}
              <div>
                <Label htmlFor="goalWeightKg" className="block mb-2">Goal Weight (kg)</Label>
                <Input
                  id="goalWeightKg"
                  type="number"
                  {...form.register("goalWeightKg", { valueAsNumber: true })}
                  placeholder="e.g., 70"
                  className="w-full"
                  data-testid="input-goal-weight"
                />
              </div>

              {/* Activity Level */}
              <div>
                <Label htmlFor="activityLevel" className="block mb-2">Activity Level</Label>
                <Select onValueChange={(value) => form.setValue("activityLevel", value as any)} value={form.watch("activityLevel")}>
                  <SelectTrigger data-testid="select-activity" className="w-full">
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (desk job, no exercise)</SelectItem>
                    <SelectItem value="lightly_active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                    <SelectItem value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                    <SelectItem value="very_active">Very Active (heavy exercise 6-7 days/week)</SelectItem>
                    <SelectItem value="extra_active">Extra Active (very heavy exercise, physical job)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Weight Goal */}
              <div>
                <Label htmlFor="weightGoal" className="block mb-2">Weight Goal</Label>
                <Select onValueChange={(value) => form.setValue("weightGoal", value as any)} value={form.watch("weightGoal")}>
                  <SelectTrigger data-testid="select-weight-goal" className="w-full">
                    <SelectValue placeholder="Select weight goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose_weight">Lose Weight</SelectItem>
                    <SelectItem value="maintain_weight">Maintain Weight</SelectItem>
                    <SelectItem value="gain_weight">Gain Weight</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Medication */}
              <div>
                <Label htmlFor="medication" className="block mb-2">Weight Loss Medication (Optional)</Label>
                <Select onValueChange={(value) => form.setValue("medication", value as any)} value={form.watch("medication")}>
                  <SelectTrigger data-testid="select-medication" className="w-full">
                    <SelectValue placeholder="Select medication" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="ozempic">Ozempic</SelectItem>
                    <SelectItem value="wegovy">Wegovy</SelectItem>
                    <SelectItem value="mounjaro">Mounjaro</SelectItem>
                    <SelectItem value="other_glp1">Other GLP-1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Calculated Targets */}
            {calculatedData && showCalculations && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCalculations(!showCalculations)}
                  className="flex items-center justify-between w-full mb-4 text-left"
                  data-testid="button-toggle-calculations"
                >
                  <h3 className="text-md font-semibold text-purple-600 dark:text-purple-400">
                    Your Calculated Nutrition Targets
                  </h3>
                  {showCalculations ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">BMR</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{calculatedData.bmr}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">cal/day</div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">TDEE</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{calculatedData.tdee}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">cal/day</div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Target</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{calculatedData.targetCalories}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">cal/day</div>
                  </div>

                  <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Protein</div>
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{calculatedData.macros.dailyProtein}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">grams/day</div>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Carbs</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{calculatedData.macros.dailyCarbs}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">grams/day</div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Fat</div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{calculatedData.macros.dailyFat}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">grams/day</div>
                  </div>
                </div>

                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  These targets will be saved to your Goals page when you save your profile.
                </p>
              </div>
            )}
          </div>

          {/* Dietary Requirements Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Dietary Requirements</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select any dietary preferences or restrictions you follow
            </p>
            <div className="flex flex-wrap gap-2">
              {commonDietaryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleTag(option, dietaryTags, setDietaryTags)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    dietaryTags.includes(option)
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  data-testid={`tag-dietary-${option.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Allergies Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Allergies & Intolerances</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select any foods you're allergic to or intolerant of
            </p>
            <div className="flex flex-wrap gap-2">
              {commonAllergies.map((allergy) => (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => toggleTag(allergy, allergyTags, setAllergyTags)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    allergyTags.includes(allergy)
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  data-testid={`tag-allergy-${allergy.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}
                >
                  {allergy}
                </button>
              ))}
            </div>
          </div>

          {/* Food Dislikes Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <Label htmlFor="foodDislikes" className="text-lg font-semibold block mb-2">
              Foods You Dislike
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Let us know what foods you don't enjoy eating
            </p>
            <Textarea
              id="foodDislikes"
              {...form.register("foodDislikes")}
              placeholder="e.g., Brussels sprouts, cilantro, liver..."
              className="min-h-[100px]"
              data-testid="input-food-dislikes"
            />
          </div>

          {/* Health Conditions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <Label htmlFor="healthConditions" className="text-lg font-semibold block mb-2">
              Health Conditions
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Optional: Share any health conditions that might affect your diet
            </p>
            <Textarea
              id="healthConditions"
              {...form.register("healthConditions")}
              placeholder="e.g., Type 2 diabetes, hypertension, PCOS..."
              className="min-h-[100px]"
              data-testid="input-health-conditions"
            />
          </div>

          {/* Work Pattern Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Work Pattern</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Help your AI Coach adapt meal timing and nutrition advice for your work schedule
            </p>
            
            {/* Shift Type Selection */}
            <div className="space-y-3 mb-6">
              <Label className="text-sm font-medium">Default Shift Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shiftTypes.map((shift) => (
                  <button
                    key={shift.value}
                    type="button"
                    onClick={() => setSelectedShiftType(shift.value)}
                    className={`p-4 rounded-xl text-left border-2 transition-all ${
                      selectedShiftType === shift.value
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                    }`}
                    data-testid={`shift-type-${shift.value}`}
                  >
                    <div className="font-medium text-sm">{shift.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {shift.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Shift Times (shown when custom is selected) */}
            {selectedShiftType === "custom" && (
              <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customShiftStart" className="text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Shift Start
                    </Label>
                    <Input
                      id="customShiftStart"
                      type="time"
                      {...form.register("customShiftStart")}
                      className="mt-1"
                      data-testid="input-shift-start"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customShiftEnd" className="text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Shift End
                    </Label>
                    <Input
                      id="customShiftEnd"
                      type="time"
                      {...form.register("customShiftEnd")}
                      className="mt-1"
                      data-testid="input-shift-end"
                    />
                  </div>
                </div>

                {/* Break Times */}
                <div>
                  <Label className="text-sm mb-2 block">Break Times (Optional)</Label>
                  <div className="space-y-2">
                    {breakTimes.map((breakTime, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="time"
                          value={breakTime}
                          onChange={(e) => updateBreakTime(index, e.target.value)}
                          placeholder="HH:MM"
                          className="flex-1"
                          data-testid={`input-break-time-${index}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeBreakTime(index)}
                          data-testid={`button-remove-break-${index}`}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addBreakTime}
                      className="w-full"
                      data-testid="button-add-break"
                    >
                      + Add Break Time
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Check-in Toggle */}
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="flex-1 pr-4">
                <Label htmlFor="dailyCheckIn" className="text-sm font-medium cursor-pointer">
                  Daily Shift Check-in
                </Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Get asked about your shift at the start of each day for personalized meal planning
                </p>
              </div>
              <Switch
                id="dailyCheckIn"
                checked={dailyCheckInEnabled}
                onCheckedChange={setDailyCheckInEnabled}
                data-testid="switch-daily-checkin"
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 rounded-xl text-lg font-semibold shadow-lg"
            data-testid="button-save-profile"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Profile
              </>
            )}
          </Button>
        </form>
      </motion.div>

      {/* Dropdown Navigation */}
      <DropdownNavigation />
    </div>
  );
}

export default ProfilePage;
