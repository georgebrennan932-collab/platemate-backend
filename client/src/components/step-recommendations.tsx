import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footprints, Target, TrendingUp, Users } from "lucide-react";

interface UserProfile {
  age: number;
  sex: "male" | "female";
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
  weightGoal: "lose_weight" | "maintain_weight" | "gain_weight";
}

export function StepRecommendations() {
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['/api/user-profile'],
    retry: false,
  });

  const calculateRecommendedSteps = (profile: UserProfile): { 
    recommended: number; 
    min: number; 
    optimal: number; 
    reasoning: string;
  } => {
    // Base recommendations by activity level
    const activityBaseSteps = {
      sedentary: 6000,
      lightly_active: 8000,
      moderately_active: 10000,
      very_active: 12000,
      extra_active: 15000,
    };

    let baseSteps = activityBaseSteps[profile.activityLevel];

    // Age adjustments
    if (profile.age >= 65) {
      baseSteps = Math.max(baseSteps - 2000, 4000); // Lower for seniors, min 4k
    } else if (profile.age >= 50) {
      baseSteps = Math.max(baseSteps - 1000, 5000); // Slightly lower for 50+
    } else if (profile.age <= 25) {
      baseSteps += 1000; // Higher for young adults
    }

    // Weight goal adjustments
    if (profile.weightGoal === "lose_weight") {
      baseSteps += 2000; // More steps for weight loss
    } else if (profile.weightGoal === "gain_weight") {
      baseSteps -= 1000; // Fewer steps when gaining weight (muscle building focus)
    }

    // BMI-based adjustments
    const bmi = profile.currentWeightKg / Math.pow(profile.heightCm / 100, 2);
    if (bmi > 30) {
      baseSteps += 1500; // More steps for obesity
    } else if (bmi > 25) {
      baseSteps += 1000; // More steps for overweight
    }

    // Gender adjustments (men typically have longer strides)
    if (profile.sex === "male") {
      baseSteps -= 500; // Slightly fewer steps for men (same distance, longer strides)
    }

    const recommended = Math.max(Math.min(baseSteps, 20000), 4000); // Cap between 4k-20k
    const min = Math.max(Math.round(recommended * 0.7), 3000);
    const optimal = Math.min(Math.round(recommended * 1.3), 25000);

    // Generate reasoning
    let reasoning = `Based on your ${profile.activityLevel.replace('_', ' ')} lifestyle`;
    if (profile.age >= 50) reasoning += ` and age (${profile.age})`;
    if (profile.weightGoal === "lose_weight") reasoning += ` and weight loss goal`;
    if (bmi > 25) reasoning += ` and current BMI (${bmi.toFixed(1)})`;
    reasoning += ", this target balances health benefits with achievability.";

    return { recommended, min, optimal, reasoning };
  };

  if (!profile) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Footprints className="h-5 w-5 text-blue-600" />
            <span>Daily Step Recommendations</span>
          </CardTitle>
          <CardDescription>
            Complete your profile in the calculator to get personalized step targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No profile data available</p>
            <p className="text-sm mt-2">Visit the Calculator page to set up your personal profile</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stepData = calculateRecommendedSteps(profile);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Footprints className="h-5 w-5 text-blue-600" />
          <span>Daily Step Recommendations</span>
        </CardTitle>
        <CardDescription>
          Personalized targets based on your profile and goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Recommendation */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 rounded-lg border border-blue-200/30 dark:border-blue-700/30">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Recommended Target</span>
          </div>
          <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
            {stepData.recommended.toLocaleString()}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">steps per day</div>
        </div>

        {/* Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200/30 dark:border-orange-700/30">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Users className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Minimum</span>
            </div>
            <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
              {stepData.min.toLocaleString()}
            </div>
          </div>
          
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200/30 dark:border-green-700/30">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Optimal</span>
            </div>
            <div className="text-lg font-bold text-green-800 dark:text-green-200">
              {stepData.optimal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200/30 dark:border-gray-700/30">
          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Why this target?</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {stepData.reasoning}
          </p>
        </div>

        {/* Profile Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
          <div>Activity: <span className="capitalize">{profile.activityLevel.replace('_', ' ')}</span></div>
          <div>Goal: <span className="capitalize">{profile.weightGoal.replace('_', ' ')}</span></div>
          <div>Age: {profile.age} years</div>
          <div>BMI: {(profile.currentWeightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)}</div>
        </div>
      </CardContent>
    </Card>
  );
}