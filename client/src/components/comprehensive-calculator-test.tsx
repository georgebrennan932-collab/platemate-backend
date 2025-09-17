import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalorieCalculator } from './calorie-calculator';
import { 
  calculateNutritionTargets, 
  calculateMacroTargets, 
  validateMacroCalculations,
  type UserData, 
  type CalculationResult,
  type MacroTargets
} from '@/lib/nutrition-calculator';

interface TestResult {
  step: string;
  expected: number | string | boolean;
  actual: number | string | boolean;
  passed: boolean;
  details?: string;
  category: 'calculation' | 'macro_validation' | 'edge_case' | 'medication';
}

interface TestScenario {
  name: string;
  data: UserData;
  expectedBMR?: number;
  expectedTDEE?: number;
  description: string;
}

// Comprehensive test scenarios covering all requirements
const testScenarios: TestScenario[] = [
  {
    name: "Male Standard",
    data: {
      age: 30,
      sex: "male",
      heightCm: 180,
      currentWeightKg: 80,
      goalWeightKg: 75,
      activityLevel: "moderately_active",
      weightGoal: "lose_weight",
      weeklyWeightChangeKg: 0.75,
      medication: "none",
    },
    expectedBMR: 1780, // 10*80 + 6.25*180 - 5*30 + 5
    expectedTDEE: 2759, // 1780 * 1.55
    description: "30yo male, 180cm, 80kg → 75kg, moderately active, lose weight"
  },
  {
    name: "Female Standard",
    data: {
      age: 25,
      sex: "female",
      heightCm: 165,
      currentWeightKg: 65,
      goalWeightKg: 60,
      activityLevel: "lightly_active",
      weightGoal: "lose_weight",
      weeklyWeightChangeKg: 0.5,
      medication: "none",
    },
    expectedBMR: 1454, // 10*65 + 6.25*165 - 5*25 - 161
    expectedTDEE: 1999, // 1454 * 1.375
    description: "25yo female, 165cm, 65kg → 60kg, lightly active, lose weight"
  },
  {
    name: "Male Maintain Weight",
    data: {
      age: 35,
      sex: "male",
      heightCm: 175,
      currentWeightKg: 70,
      goalWeightKg: 70,
      activityLevel: "very_active",
      weightGoal: "maintain_weight",
      weeklyWeightChangeKg: 0,
      medication: "none",
    },
    expectedBMR: 1670, // 10*70 + 6.25*175 - 5*35 + 5
    expectedTDEE: 2881, // 1670 * 1.725
    description: "35yo male, 175cm, 70kg, very active, maintain weight"
  },
  {
    name: "Female Gain Weight",
    data: {
      age: 22,
      sex: "female",
      heightCm: 160,
      currentWeightKg: 50,
      goalWeightKg: 55,
      activityLevel: "sedentary",
      weightGoal: "gain_weight",
      weeklyWeightChangeKg: 0.5,
      medication: "none",
    },
    expectedBMR: 1239, // 10*50 + 6.25*160 - 5*22 - 161
    expectedTDEE: 1487, // 1239 * 1.2
    description: "22yo female, 160cm, 50kg → 55kg, sedentary, gain weight"
  },
  {
    name: "Ozempic Medication",
    data: {
      age: 45,
      sex: "female",
      heightCm: 170,
      currentWeightKg: 90,
      goalWeightKg: 75,
      activityLevel: "moderately_active",
      weightGoal: "lose_weight",
      weeklyWeightChangeKg: 1.0,
      medication: "ozempic",
    },
    expectedBMR: 1544, // 10*90 + 6.25*170 - 5*45 - 161
    expectedTDEE: 2393, // 1544 * 1.55
    description: "45yo female, 170cm, 90kg → 75kg, moderately active, lose weight, on Ozempic"
  },
  {
    name: "Mounjaro Medication",
    data: {
      age: 40,
      sex: "male",
      heightCm: 185,
      currentWeightKg: 95,
      goalWeightKg: 80,
      activityLevel: "lightly_active",
      weightGoal: "lose_weight",
      weeklyWeightChangeKg: 1.0,
      medication: "mounjaro",
    },
    expectedBMR: 1860, // 10*95 + 6.25*185 - 5*40 + 5
    expectedTDEE: 2558, // 1860 * 1.375
    description: "40yo male, 185cm, 95kg → 80kg, lightly active, lose weight, on Mounjaro"
  },
  {
    name: "Safety Floor Edge Case",
    data: {
      age: 20,
      sex: "female",
      heightCm: 150,
      currentWeightKg: 45,
      goalWeightKg: 40,
      activityLevel: "sedentary",
      weightGoal: "lose_weight",
      weeklyWeightChangeKg: 1.0,
      medication: "none",
    },
    expectedBMR: 1044, // 10*45 + 6.25*150 - 5*20 - 161
    expectedTDEE: 1253, // 1044 * 1.2
    description: "20yo female, 150cm, 45kg → 40kg, sedentary, aggressive weight loss (should hit safety minimum)"
  }
];

export function ComprehensiveCalculatorTest() {
  const [testResults, setTestResults] = React.useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [selectedScenario, setSelectedScenario] = React.useState<TestScenario>(testScenarios[0]);
  const [liveCalculatorResults, setLiveCalculatorResults] = React.useState<CalculationResult | null>(null);

  const runCalculationTests = () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    testScenarios.forEach((scenario) => {
      const calculationData = calculateNutritionTargets(scenario.data);
      
      // Test BMR calculation
      if (scenario.expectedBMR) {
        results.push({
          step: `${scenario.name} - BMR Calculation`,
          expected: scenario.expectedBMR,
          actual: calculationData.bmr,
          passed: Math.abs(calculationData.bmr - scenario.expectedBMR) < 1,
          details: `${scenario.description}`,
          category: 'calculation'
        });
      }

      // Test TDEE calculation
      if (scenario.expectedTDEE) {
        results.push({
          step: `${scenario.name} - TDEE Calculation`,
          expected: scenario.expectedTDEE,
          actual: calculationData.tdee,
          passed: Math.abs(calculationData.tdee - scenario.expectedTDEE) < 1,
          details: `BMR ${calculationData.bmr} × activity multiplier`,
          category: 'calculation'
        });
      }

      // Test target calories logic
      const targetShouldBeValid = calculationData.targetCalories > 0 && 
                                  (scenario.data.weightGoal !== 'lose_weight' || calculationData.targetCalories >= 1200);
      results.push({
        step: `${scenario.name} - Target Calories Valid`,
        expected: true,
        actual: targetShouldBeValid,
        passed: targetShouldBeValid,
        details: `Target: ${calculationData.targetCalories} cal should be > 0 and >= 1200 for weight loss`,
        category: 'calculation'
      });

      // Test medication adjustments specifically
      if (scenario.data.medication && scenario.data.medication !== 'none' && scenario.data.weightGoal === 'lose_weight') {
        const maxDeficitExpected = scenario.data.medication === 'mounjaro' ? 850 : 800;
        const actualDeficit = calculationData.tdee - calculationData.targetCalories;
        
        results.push({
          step: `${scenario.name} - Medication Deficit Cap`,
          expected: `<= ${maxDeficitExpected}`,
          actual: actualDeficit,
          passed: actualDeficit <= maxDeficitExpected,
          details: `Deficit should not exceed ${maxDeficitExpected} cal/day for ${scenario.data.medication}`,
          category: 'medication'
        });

        const minCaloriesExpected = Math.round(calculationData.bmr * 1.1);
        results.push({
          step: `${scenario.name} - Medication Minimum Floor`,
          expected: `>= ${minCaloriesExpected}`,
          actual: calculationData.targetCalories,
          passed: calculationData.targetCalories >= minCaloriesExpected,
          details: `Target should be >= 110% of BMR (${minCaloriesExpected}) for GLP-1 meds`,
          category: 'medication'
        });
      }

      // Test safety minimums for aggressive weight loss
      if (scenario.data.weightGoal === 'lose_weight') {
        const expectedMinimum = calculationData.bmr < 1400 ? 1200 : 1500;
        results.push({
          step: `${scenario.name} - Safety Minimum`,
          expected: `>= ${expectedMinimum}`,
          actual: calculationData.targetCalories,
          passed: calculationData.targetCalories >= expectedMinimum,
          details: `Target should not go below ${expectedMinimum} cal safety minimum`,
          category: 'edge_case'
        });
      }
    });

    setTestResults(results);
    setIsRunning(false);
  };

  const runMacroValidationTests = () => {
    const macroResults: TestResult[] = [];

    testScenarios.forEach((scenario) => {
      const calculationData = calculateNutritionTargets(scenario.data);
      const macros = calculateMacroTargets(calculationData.targetCalories);
      const validation = validateMacroCalculations(macros);

      // Test that macros back-calculate to target calories correctly
      macroResults.push({
        step: `${scenario.name} - Macro Back-Calculation`,
        expected: calculationData.targetCalories,
        actual: validation.actualCalories,
        passed: Math.abs(validation.variance) <= 5, // Allow 5 calorie variance for rounding
        details: `Variance: ${validation.variance} cal (protein: ${macros.dailyProtein}g, carbs: ${macros.dailyCarbs}g, fat: ${macros.dailyFat}g)`,
        category: 'macro_validation'
      });

      // Test macro percentages are correct
      const proteinPercent = (macros.dailyProtein * 4) / macros.dailyCalories;
      const carbsPercent = (macros.dailyCarbs * 4) / macros.dailyCalories;
      const fatPercent = (macros.dailyFat * 9) / macros.dailyCalories;

      macroResults.push({
        step: `${scenario.name} - Protein % (20%)`,
        expected: 0.20,
        actual: Number(proteinPercent.toFixed(3)),
        passed: Math.abs(proteinPercent - 0.20) < 0.05,
        details: `Actual: ${(proteinPercent * 100).toFixed(1)}%`,
        category: 'macro_validation'
      });

      macroResults.push({
        step: `${scenario.name} - Carbs % (40%)`,
        expected: 0.40,
        actual: Number(carbsPercent.toFixed(3)),
        passed: Math.abs(carbsPercent - 0.40) < 0.05,
        details: `Actual: ${(carbsPercent * 100).toFixed(1)}%`,
        category: 'macro_validation'
      });

      macroResults.push({
        step: `${scenario.name} - Fat % (40%)`,
        expected: 0.40,
        actual: Number(fatPercent.toFixed(3)),
        passed: Math.abs(fatPercent - 0.40) < 0.05,
        details: `Actual: ${(fatPercent * 100).toFixed(1)}%`,
        category: 'macro_validation'
      });
    });

    setTestResults([...testResults, ...macroResults]);
  };

  const handleLiveCalculatorTest = (calories: number) => {
    console.log('Live calculator produced:', calories);
    // This gets called when the live calculator completes
    // We can use this to verify the live calculator matches our expected results
    const expectedResult = calculateNutritionTargets(selectedScenario.data);
    setLiveCalculatorResults(expectedResult);
    
    const liveResult: TestResult = {
      step: `Live Calculator - ${selectedScenario.name}`,
      expected: expectedResult.targetCalories,
      actual: calories,
      passed: calories === expectedResult.targetCalories,
      details: `Live calculator should match shared function results`,
      category: 'calculation'
    };
    
    setTestResults([...testResults, liveResult]);
  };

  const getCategoryResults = (category: string) => {
    return testResults.filter(r => r.category === category);
  };

  const getCategoryStats = (category: string) => {
    const categoryResults = getCategoryResults(category);
    const passed = categoryResults.filter(r => r.passed).length;
    return { passed, total: categoryResults.length };
  };

  const allPassed = testResults.length > 0 && testResults.every(r => r.passed);

  return (
    <div className="space-y-6">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧮 Comprehensive Nutrition Calculator Verification
          </CardTitle>
          <CardDescription>
            End-to-end testing of calculation logic, macro validation, medication adjustments, and live calculator verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tests" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tests">Test Results</TabsTrigger>
              <TabsTrigger value="live">Live Calculator Test</TabsTrigger>
              <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
            </TabsList>

            <TabsContent value="tests" className="space-y-6">
              <div className="flex gap-4 flex-wrap">
                <Button 
                  onClick={runCalculationTests} 
                  disabled={isRunning}
                  data-testid="button-run-calculation-tests"
                >
                  {isRunning ? "Running Tests..." : "Run Calculation Tests"}
                </Button>
                <Button 
                  onClick={runMacroValidationTests} 
                  variant="outline"
                  disabled={testResults.length === 0}
                  data-testid="button-run-macro-tests"
                >
                  Run Macro Validation Tests
                </Button>
                <Button 
                  onClick={() => setTestResults([])} 
                  variant="outline"
                  data-testid="button-clear-tests"
                >
                  Clear Results
                </Button>
              </div>

              {testResults.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {['calculation', 'macro_validation', 'medication', 'edge_case'].map(category => {
                      const stats = getCategoryStats(category);
                      return (
                        <Card key={category} className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {stats.passed}/{stats.total}
                            </div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {category.replace('_', ' ')}
                            </div>
                            <Badge variant={stats.passed === stats.total ? "default" : "destructive"}>
                              {stats.passed === stats.total ? "✓ PASS" : "✗ FAIL"}
                            </Badge>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <Card key={index} className={`border-l-4 ${result.passed ? 'border-l-green-500' : 'border-l-red-500'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{result.step}</h4>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                {result.category}
                              </Badge>
                              <Badge variant={result.passed ? "default" : "destructive"}>
                                {result.passed ? "✓" : "✗"}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Expected:</span>
                              <span className="ml-2 font-mono">{String(result.expected)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actual:</span>
                              <span className="ml-2 font-mono">{String(result.actual)}</span>
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
                          All calculations verified! The calculator produces mathematically correct results across all scenarios.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="live" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Test Scenario:</label>
                  <select 
                    value={selectedScenario.name}
                    onChange={(e) => setSelectedScenario(testScenarios.find(s => s.name === e.target.value) || testScenarios[0])}
                    className="mt-1 block w-full p-2 border rounded-md"
                    data-testid="select-test-scenario"
                  >
                    {testScenarios.map((scenario) => (
                      <option key={scenario.name} value={scenario.name}>
                        {scenario.name} - {scenario.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="font-medium mb-2">Live Calculator Test</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will test the actual CalorieCalculator component with the selected scenario. 
                    Fill in the form with the values and click calculate to verify the live calculator matches our expected results.
                  </p>
                  
                  {liveCalculatorResults && (
                    <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
                      <div className="text-sm font-medium">Expected Results for {selectedScenario.name}:</div>
                      <div className="text-sm text-muted-foreground">
                        BMR: {liveCalculatorResults.bmr} cal | TDEE: {liveCalculatorResults.tdee} cal | Target: {liveCalculatorResults.targetCalories} cal
                      </div>
                    </div>
                  )}
                </div>

                <CalorieCalculator onCaloriesCalculated={handleLiveCalculatorTest} />
              </div>
            </TabsContent>

            <TabsContent value="scenarios" className="space-y-4">
              <div className="grid gap-4">
                {testScenarios.map((scenario, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{scenario.name}</CardTitle>
                      <CardDescription>{scenario.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><strong>Age:</strong> {scenario.data.age}</div>
                        <div><strong>Sex:</strong> {scenario.data.sex}</div>
                        <div><strong>Height:</strong> {scenario.data.heightCm}cm</div>
                        <div><strong>Weight:</strong> {scenario.data.currentWeightKg}kg → {scenario.data.goalWeightKg}kg</div>
                        <div><strong>Activity:</strong> {scenario.data.activityLevel}</div>
                        <div><strong>Goal:</strong> {scenario.data.weightGoal}</div>
                        <div><strong>Rate:</strong> {scenario.data.weeklyWeightChangeKg}kg/week</div>
                        <div><strong>Medication:</strong> {scenario.data.medication}</div>
                      </div>
                      {scenario.expectedBMR && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Expected BMR: {scenario.expectedBMR} cal | Expected TDEE: {scenario.expectedTDEE} cal
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}