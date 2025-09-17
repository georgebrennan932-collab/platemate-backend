/**
 * Nutrition Calculator - Shared calculation functions for BMR, TDEE, and calorie targets
 * 
 * This module contains all the mathematical functions used for calculating:
 * - BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
 * - TDEE (Total Daily Energy Expenditure) 
 * - Target calories with weight goals and medication considerations
 * - Macronutrient targets
 */

export interface UserData {
  age: number;
  sex: "male" | "female";
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
  weightGoal: "lose_weight" | "maintain_weight" | "gain_weight";
  weeklyWeightChangeKg?: number;
  medication?: "none" | "ozempic" | "wegovy" | "mounjaro" | "other_glp1";
}

export interface CalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  weightChange: number;
  timeToGoal: number;
  medication?: string;
  medicationAdjustment?: MedicationAdjustment | null;
}

export interface MedicationAdjustment {
  minMultiplier: number;
  maxDeficit: number;
  name: string;
}

export interface MacroTargets {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyWater: number;
}

/**
 * Calculate BMR using Mifflin-St Jeor Equation (more accurate than Harris-Benedict)
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
 */
export function calculateBMR(data: UserData): number {
  const { sex, heightCm, currentWeightKg, age } = data;
  
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age - 161;
  }
  
  return bmr;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure) by applying activity multiplier to BMR
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityMultipliers = {
    sedentary: 1.2,           // Little to no exercise
    lightly_active: 1.375,    // Light exercise 1-3 days/week
    moderately_active: 1.55,  // Moderate exercise 3-5 days/week
    very_active: 1.725,       // Heavy exercise 6-7 days/week
    extra_active: 1.9,        // Very heavy exercise, physical job
  };
  
  return bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers];
}

/**
 * Get medication-specific adjustments for GLP-1 medications
 */
export function getMedicationAdjustment(medication: string): MedicationAdjustment {
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
}

/**
 * Calculate daily calories needed for weight goal with medication considerations
 */
export function calculateTargetCalories(
  tdee: number, 
  weightGoal: string, 
  weeklyChange: number = 0.75, 
  bmr: number, 
  medication: string = 'none'
): number {
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
}

/**
 * Calculate recommended macronutrient targets based on calculated calories
 */
export function calculateMacroTargets(calories: number): MacroTargets {
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
}

/**
 * Main calculation function that performs all calculations in sequence
 */
export function calculateNutritionTargets(data: UserData): CalculationResult {
  const bmr = calculateBMR(data);
  const tdee = calculateTDEE(bmr, data.activityLevel);
  const targetCalories = calculateTargetCalories(
    tdee, 
    data.weightGoal, 
    Math.abs(data.weeklyWeightChangeKg || 0.75), 
    bmr, 
    data.medication
  );
  
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    weightChange: data.goalWeightKg - data.currentWeightKg,
    timeToGoal: Math.abs(data.goalWeightKg - data.currentWeightKg) / (Math.abs(data.weeklyWeightChangeKg || 0.75) / 7),
    medication: data.medication,
    medicationAdjustment: data.medication !== 'none' ? getMedicationAdjustment(data.medication || 'none') : null,
  };
}

/**
 * Validate macronutrient calculations back-calculate to target calories correctly
 * Returns the actual calories from macro breakdown and variance from target
 */
export function validateMacroCalculations(macros: MacroTargets): { actualCalories: number; variance: number } {
  const proteinCals = macros.dailyProtein * 4;
  const carbsCals = macros.dailyCarbs * 4; 
  const fatCals = macros.dailyFat * 9;
  
  const actualCalories = proteinCals + carbsCals + fatCals;
  const variance = actualCalories - macros.dailyCalories;
  
  return { actualCalories, variance };
}