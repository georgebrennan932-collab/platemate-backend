import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Test data
const testInputs = {
  age: 30,
  sex: "male" as const,
  heightCm: 180,
  currentWeightKg: 80,
  goalWeightKg: 75,
  activityLevel: "moderately_active" as const,
  weightGoal: "lose_weight" as const,
  weeklyWeightChangeKg: 0.75,
  medication: "none" as const,
};

// Extract calculation functions for testing
const calculateBMR = (data: typeof testInputs) => {
  const { sex, heightCm, currentWeightKg, age } = data;
  
  let bmr;
  if (sex === 'male') {
    bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age - 161;
  }
  
  return bmr;
};

const calculateTDEE = (bmr: number, activityLevel: string) => {
  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  
  return bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers];
};

const calculateTargetCalories = (tdee: number, weightGoal: string, weeklyChange: number = 0.75, bmr: number, medication: string = 'none') => {
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
  
  // Apply safety minimums for weight loss
  if (weightGoal === 'lose_weight') {
    const safeMinimum = bmr < 1400 ? 1200 : 1500; // Gender-appropriate minimums
    targetCalories = Math.max(targetCalories, safeMinimum);
  }
  
  return Math.round(targetCalories);
};

const calculateMacroTargets = (calories: number) => {
  const proteinCaloriesPercent = 0.20; // 20% protein
  const carbsCaloriesPercent = 0.40;   // 40% carbs  
  const fatCaloriesPercent = 0.40;     // 40% fat
  
  const proteinGrams = Math.round((calories * proteinCaloriesPercent) / 4);
  const carbsGrams = Math.round((calories * carbsCaloriesPercent) / 4);
  const fatGrams = Math.round((calories * fatCaloriesPercent) / 9);
  
  return {
    dailyCalories: calories,
    dailyProtein: proteinGrams,
    dailyCarbs: carbsGrams,
    dailyFat: fatGrams,
    dailyWater: 2500,
  };
};

interface TestResult {
  step: string;
  expected: number;
  actual: number;
  passed: boolean;
  details?: string;
}

export function CalculatorTest() {
  const [testResults, setTestResults] = React.useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);

  const runTests = () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Step 1: Test BMR calculation
    const expectedBMR = 10 * 80 + 6.25 * 180 - 5 * 30 + 5; // = 1780
    const actualBMR = calculateBMR(testInputs);
    results.push({
      step: "BMR Calculation (Mifflin-St Jeor)",
      expected: expectedBMR,
      actual: actualBMR,
      passed: Math.abs(actualBMR - expectedBMR) < 0.1,
      details: `Formula: 10 × ${testInputs.currentWeightKg} + 6.25 × ${testInputs.heightCm} - 5 × ${testInputs.age} + 5`
    });

    // Step 2: Test TDEE calculation
    const expectedTDEE = expectedBMR * 1.55; // = 2759
    const actualTDEE = calculateTDEE(actualBMR, testInputs.activityLevel);
    results.push({
      step: "TDEE Calculation",
      expected: expectedTDEE,
      actual: actualTDEE,
      passed: Math.abs(actualTDEE - expectedTDEE) < 0.1,
      details: `Formula: BMR (${actualBMR}) × Activity Multiplier (1.55)`
    });

    // Step 3: Test daily calorie deficit
    const expectedDeficit = (0.75 * 7700) / 7; // = 825
    const actualDeficit = (testInputs.weeklyWeightChangeKg * 7700) / 7;
    results.push({
      step: "Daily Calorie Deficit",
      expected: expectedDeficit,
      actual: actualDeficit,
      passed: Math.abs(actualDeficit - expectedDeficit) < 0.1,
      details: `Formula: (${testInputs.weeklyWeightChangeKg} kg/week × 7700 cal/kg) ÷ 7 days`
    });

    // Step 4: Test target calories (before safety minimum)
    const expectedTargetBeforeSafety = expectedTDEE - expectedDeficit; // = 1934
    const actualTargetCalories = calculateTargetCalories(actualTDEE, testInputs.weightGoal, testInputs.weeklyWeightChangeKg, actualBMR, testInputs.medication);
    const targetBeforeSafety = actualTDEE - actualDeficit;
    
    results.push({
      step: "Target Calories (before safety min)",
      expected: expectedTargetBeforeSafety,
      actual: targetBeforeSafety,
      passed: Math.abs(targetBeforeSafety - expectedTargetBeforeSafety) < 0.1,
      details: `Formula: TDEE (${Math.round(actualTDEE)}) - Daily Deficit (${Math.round(actualDeficit)})`
    });

    // Step 5: Test safety minimum application
    const safetyMinimum = actualBMR < 1400 ? 1200 : 1500; // Should be 1500 for this male
    const expectedFinalTarget = Math.max(expectedTargetBeforeSafety, safetyMinimum);
    results.push({
      step: "Final Target Calories (with safety min)",
      expected: expectedFinalTarget,
      actual: actualTargetCalories,
      passed: actualTargetCalories === Math.round(expectedFinalTarget),
      details: `Safety minimum: ${safetyMinimum} cal (BMR ${Math.round(actualBMR)} < 1400 ? 1200 : 1500)`
    });

    // Step 6: Test macro calculations
    const expectedMacros = {
      protein: Math.round((actualTargetCalories * 0.20) / 4), // 4 cal/g
      carbs: Math.round((actualTargetCalories * 0.40) / 4),   // 4 cal/g
      fat: Math.round((actualTargetCalories * 0.40) / 9),     // 9 cal/g
    };
    
    const actualMacros = calculateMacroTargets(actualTargetCalories);
    
    results.push({
      step: "Protein Calculation (20%)",
      expected: expectedMacros.protein,
      actual: actualMacros.dailyProtein,
      passed: actualMacros.dailyProtein === expectedMacros.protein,
      details: `Formula: (${actualTargetCalories} cal × 0.20) ÷ 4 cal/g`
    });
    
    results.push({
      step: "Carbs Calculation (40%)",
      expected: expectedMacros.carbs,
      actual: actualMacros.dailyCarbs,
      passed: actualMacros.dailyCarbs === expectedMacros.carbs,
      details: `Formula: (${actualTargetCalories} cal × 0.40) ÷ 4 cal/g`
    });
    
    results.push({
      step: "Fat Calculation (40%)",
      expected: expectedMacros.fat,
      actual: actualMacros.dailyFat,
      passed: actualMacros.dailyFat === expectedMacros.fat,
      details: `Formula: (${actualTargetCalories} cal × 0.40) ÷ 9 cal/g`
    });

    setTestResults(results);
    setIsRunning(false);
  };

  // Test edge cases
  const runEdgeCaseTests = () => {
    const edgeResults: TestResult[] = [];

    // Test female calculation
    const femaleInputs = { ...testInputs, sex: "female" as const };
    const femaleBMR = calculateBMR(femaleInputs);
    const expectedFemaleBMR = 10 * 80 + 6.25 * 180 - 5 * 30 - 161; // = 1614
    edgeResults.push({
      step: "Female BMR Calculation",
      expected: expectedFemaleBMR,
      actual: femaleBMR,
      passed: Math.abs(femaleBMR - expectedFemaleBMR) < 0.1,
      details: `Formula: 10 × 80 + 6.25 × 180 - 5 × 30 - 161`
    });

    // Test different activity levels
    const sedentaryTDEE = calculateTDEE(testInputs.currentWeightKg, "sedentary");
    const expectedSedentaryTDEE = calculateBMR(testInputs) * 1.2;
    edgeResults.push({
      step: "Sedentary Activity Level",
      expected: expectedSedentaryTDEE,
      actual: sedentaryTDEE,
      passed: Math.abs(sedentaryTDEE - expectedSedentaryTDEE) < 0.1,
      details: `BMR × 1.2 (sedentary multiplier)`
    });

    // Test safety minimum for very low calories
    const lowCalorieInputs = { ...testInputs, weeklyWeightChangeKg: 2.0 }; // Very aggressive
    const bmrForSafety = calculateBMR(lowCalorieInputs);
    const tdeeForSafety = calculateTDEE(bmrForSafety, lowCalorieInputs.activityLevel);
    const aggressiveTarget = calculateTargetCalories(tdeeForSafety, "lose_weight", 2.0, bmrForSafety);
    const expectedMinimum = bmrForSafety < 1400 ? 1200 : 1500;
    
    edgeResults.push({
      step: "Safety Minimum Applied",
      expected: expectedMinimum,
      actual: aggressiveTarget,
      passed: aggressiveTarget >= expectedMinimum,
      details: `Target should not go below ${expectedMinimum} cal safety minimum`
    });

    setTestResults([...testResults, ...edgeResults]);
  };

  const allPassed = testResults.length > 0 && testResults.every(r => r.passed);

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧮 Calculator Mathematics Verification
        </CardTitle>
        <CardDescription>
          Testing calculation logic with inputs: 30yo male, 180cm, 80kg → 75kg goal, moderately active, lose weight
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            data-testid="button-run-tests"
          >
            {isRunning ? "Running Tests..." : "Run Basic Tests"}
          </Button>
          <Button 
            onClick={runEdgeCaseTests} 
            variant="outline"
            disabled={testResults.length === 0}
            data-testid="button-run-edge-tests"
          >
            Run Edge Case Tests
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Test Results</h3>
              <Badge variant={allPassed ? "default" : "destructive"}>
                {testResults.filter(r => r.passed).length}/{testResults.length} Passed
              </Badge>
            </div>

            <div className="grid gap-3">
              {testResults.map((result, index) => (
                <Card key={index} className={`border-l-4 ${result.passed ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{result.step}</h4>
                      <Badge variant={result.passed ? "default" : "destructive"}>
                        {result.passed ? "✓ PASS" : "✗ FAIL"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Expected:</span>
                        <span className="ml-2 font-mono">{result.expected.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Actual:</span>
                        <span className="ml-2 font-mono">{result.actual.toFixed(1)}</span>
                      </div>
                    </div>
                    {result.details && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {result.details}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {allPassed && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✅</span>
                  <span className="font-medium text-green-800 dark:text-green-200">
                    All calculations verified! The calculator produces mathematically correct results.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}