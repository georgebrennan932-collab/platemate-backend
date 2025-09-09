import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footprints, Target, TrendingUp, Users, Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@shared/schema";

export function StepRecommendations() {
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['/api/user-profile'],
    retry: false,
  });

  const [customGoal, setCustomGoal] = useState<string>('');

  // Function to apply recommended steps to step counter
  const applyStepsToCounter = (recommendedSteps: number) => {
    localStorage.setItem('platemate-step-goal', recommendedSteps.toString());
    window.dispatchEvent(new CustomEvent('platemate-steps-updated'));
  };

  // Function to apply custom goal
  const applyCustomGoal = () => {
    const goal = parseInt(customGoal);
    if (goal && goal > 0 && goal <= 50000) {
      localStorage.setItem('platemate-step-goal', goal.toString());
      window.dispatchEvent(new CustomEvent('platemate-steps-updated'));
      setCustomGoal('');
    }
  };

  const calculateRecommendedSteps = (profile: UserProfile): { 
    recommended: number; 
    min: number; 
    optimal: number; 
    reasoning: string;
  } => {
    // Ensure required fields have valid values
    const age = profile.age || 30;
    const activityLevel = profile.activityLevel || "moderately_active";
    const weightGoal = profile.weightGoal || "maintain_weight";
    const currentWeight = profile.currentWeightKg || 70;
    const height = profile.heightCm || 170;
    const sex = profile.sex || "male";

    // Base recommendations by activity level
    const activityBaseSteps = {
      sedentary: 6000,
      lightly_active: 8000,
      moderately_active: 10000,
      very_active: 12000,
      extra_active: 15000,
    };

    let baseSteps = activityBaseSteps[activityLevel as keyof typeof activityBaseSteps];

    // Age adjustments
    if (age >= 65) {
      baseSteps = Math.max(baseSteps - 2000, 4000); // Lower for seniors, min 4k
    } else if (age >= 50) {
      baseSteps = Math.max(baseSteps - 1000, 5000); // Slightly lower for 50+
    } else if (age <= 25) {
      baseSteps += 1000; // Higher for young adults
    }

    // Weight goal adjustments
    if (weightGoal === "lose_weight") {
      baseSteps += 2000; // More steps for weight loss
    } else if (weightGoal === "gain_weight") {
      baseSteps -= 1000; // Fewer steps when gaining weight (muscle building focus)
    }

    // BMI-based adjustments
    const bmi = currentWeight / Math.pow(height / 100, 2);
    if (bmi > 30) {
      baseSteps += 1500; // More steps for obesity
    } else if (bmi > 25) {
      baseSteps += 1000; // More steps for overweight
    }

    // Gender adjustments (men typically have longer strides)
    if (sex === "male") {
      baseSteps -= 500; // Slightly fewer steps for men (same distance, longer strides)
    }

    const recommended = Math.max(Math.min(baseSteps, 20000), 4000); // Cap between 4k-20k
    const min = Math.max(Math.round(recommended * 0.7), 3000);
    const optimal = Math.min(Math.round(recommended * 1.3), 25000);

    // Generate reasoning
    let reasoning = `Based on your ${activityLevel.replace('_', ' ')} lifestyle`;
    if (age >= 50) reasoning += ` and age (${age})`;
    if (weightGoal === "lose_weight") reasoning += ` and weight loss goal`;
    if (bmi > 25) reasoning += ` and current BMI (${bmi.toFixed(1)})`;
    reasoning += ", this target balances health benefits with achievability.";

    return { recommended, min, optimal, reasoning };
  };

  // Use default profile if no data available  
  const effectiveProfile = profile || {
    id: "default",
    userId: "default", 
    age: 30,
    sex: "male",
    heightCm: 170,
    currentWeightKg: 70,
    goalWeightKg: null,
    activityLevel: "moderately_active",
    weightGoal: "maintain_weight",
    weeklyWeightChangeKg: null,
    medication: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const stepData = calculateRecommendedSteps(effectiveProfile);
  
  // Show note if using defaults
  const isUsingDefaults = !profile || !profile.age || !profile.activityLevel || !profile.currentWeightKg || !profile.heightCm;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Footprints className="h-5 w-5 text-blue-600" />
          <span>Daily Step Recommendations</span>
        </CardTitle>
        <CardDescription>
          {isUsingDefaults ? 
            "Default recommendations - complete your profile in Calculator for personalized targets" :
            "Personalized targets based on your profile and goals"
          }
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

        {/* Apply Button */}
        <Button 
          onClick={() => applyStepsToCounter(stepData.recommended)}
          className="w-full"
          variant="outline"
        >
          <Edit className="h-4 w-4 mr-2" />
          Apply {stepData.recommended.toLocaleString()} steps to counter
        </Button>

        {/* Profile Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
          <div>Activity: <span className="capitalize">{(effectiveProfile.activityLevel || 'moderate').replace('_', ' ')}</span></div>
          <div>Goal: <span className="capitalize">{(effectiveProfile.weightGoal || 'maintain').replace('_', ' ')}</span></div>
          <div>Age: {effectiveProfile.age || 'N/A'} years</div>
          <div>BMI: {effectiveProfile.currentWeightKg && effectiveProfile.heightCm ? 
            (effectiveProfile.currentWeightKg / Math.pow(effectiveProfile.heightCm / 100, 2)).toFixed(1) : 'N/A'}</div>
        </div>
        
        {isUsingDefaults && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/30 dark:border-amber-700/30">
            <span className="font-medium">📊 Using default values:</span> Complete your profile in the Calculator page for more accurate recommendations.
          </div>
        )}

        {/* Manual Goal Setting */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-center space-x-2">
            <Plus className="h-4 w-4 text-purple-600" />
            <Label htmlFor="customGoal" className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Set Custom Step Goal
            </Label>
          </div>
          <div className="flex space-x-2">
            <Input
              id="customGoal"
              type="number"
              placeholder="Enter steps (1000-50000)"
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              min="1000"
              max="50000"
              className="flex-1"
            />
            <Button 
              onClick={applyCustomGoal}
              disabled={!customGoal || parseInt(customGoal) < 1000 || parseInt(customGoal) > 50000}
              variant="outline"
              className="px-4"
            >
              Apply
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a custom daily step goal between 1,000 and 50,000 steps
          </p>
        </div>
      </CardContent>
    </Card>
  );
}