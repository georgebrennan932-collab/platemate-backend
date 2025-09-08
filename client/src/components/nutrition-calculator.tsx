import React from 'react';
import { Calculator, Target, Plus, Minus, ChefHat, Coffee, Utensils, Apple, Beef, Wheat, Droplets, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';

interface NutritionGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyWater: number;
}

interface ConsumedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

interface FoodSuggestion {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  icon: string;
}

const commonFoods: FoodSuggestion[] = [
  { name: "Grilled Chicken Breast", portion: "100g", calories: 165, protein: 31, carbs: 0, fat: 3.6, icon: "🐔" },
  { name: "Brown Rice", portion: "1 cup cooked", calories: 216, protein: 5, carbs: 45, fat: 1.8, icon: "🍚" },
  { name: "Greek Yogurt", portion: "1 cup", calories: 130, protein: 23, carbs: 9, fat: 0, icon: "🥛" },
  { name: "Banana", portion: "1 medium", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, icon: "🍌" },
  { name: "Almonds", portion: "1 oz (23 nuts)", calories: 164, protein: 6, carbs: 6, fat: 14, icon: "🥜" },
  { name: "Salmon Fillet", portion: "100g", calories: 208, protein: 25, carbs: 0, fat: 12, icon: "🐟" },
  { name: "Sweet Potato", portion: "1 medium baked", calories: 112, protein: 2, carbs: 26, fat: 0.1, icon: "🍠" },
  { name: "Broccoli", portion: "1 cup", calories: 25, protein: 3, carbs: 5, fat: 0.3, icon: "🥦" },
  { name: "Oatmeal", portion: "1 cup cooked", calories: 154, protein: 6, carbs: 28, fat: 3, icon: "🥣" },
  { name: "Eggs", portion: "2 large", calories: 140, protein: 12, carbs: 1, fat: 10, icon: "🥚" },
];

interface NutritionCalculatorProps {
  goals?: NutritionGoals;
  consumed: ConsumedNutrition;
}

export function NutritionCalculator({ goals, consumed }: NutritionCalculatorProps) {
  const [plannedMeals, setPlannedMeals] = React.useState<FoodSuggestion[]>([]);
  const [customFood, setCustomFood] = React.useState({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const defaultGoals = {
    dailyCalories: 2000,
    dailyProtein: 150,
    dailyCarbs: 250,
    dailyFat: 65,
    dailyWater: 2000,
  };

  const currentGoals = goals || defaultGoals;

  // Calculate remaining nutrients needed
  const remaining = {
    calories: Math.max(0, currentGoals.dailyCalories - consumed.calories),
    protein: Math.max(0, currentGoals.dailyProtein - consumed.protein),
    carbs: Math.max(0, currentGoals.dailyCarbs - consumed.carbs),
    fat: Math.max(0, currentGoals.dailyFat - consumed.fat),
    water: Math.max(0, currentGoals.dailyWater - consumed.water),
  };

  // Calculate totals including planned meals
  const plannedTotals = plannedMeals.reduce((total, meal) => ({
    calories: total.calories + meal.calories,
    protein: total.protein + meal.protein,
    carbs: total.carbs + meal.carbs,
    fat: total.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const projectedTotals = {
    calories: consumed.calories + plannedTotals.calories,
    protein: consumed.protein + plannedTotals.protein,
    carbs: consumed.carbs + plannedTotals.carbs,
    fat: consumed.fat + plannedTotals.fat,
  };

  const addPlannedMeal = (food: FoodSuggestion) => {
    setPlannedMeals([...plannedMeals, food]);
  };

  const removePlannedMeal = (index: number) => {
    setPlannedMeals(plannedMeals.filter((_, i) => i !== index));
  };

  const addCustomFood = () => {
    if (customFood.name && customFood.calories > 0) {
      addPlannedMeal({
        ...customFood,
        portion: "custom portion",
        icon: "🍽️"
      });
      setCustomFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
    }
  };

  // Smart food suggestions based on remaining nutrients
  const getSmartSuggestions = () => {
    const suggestions = [];
    
    if (remaining.protein > 20) {
      suggestions.push(commonFoods.find(f => f.name === "Grilled Chicken Breast"));
      suggestions.push(commonFoods.find(f => f.name === "Greek Yogurt"));
    }
    
    if (remaining.carbs > 30) {
      suggestions.push(commonFoods.find(f => f.name === "Brown Rice"));
      suggestions.push(commonFoods.find(f => f.name === "Sweet Potato"));
    }
    
    if (remaining.fat > 10) {
      suggestions.push(commonFoods.find(f => f.name === "Almonds"));
      suggestions.push(commonFoods.find(f => f.name === "Salmon Fillet"));
    }
    
    if (remaining.calories > 200) {
      suggestions.push(commonFoods.find(f => f.name === "Oatmeal"));
    }
    
    return suggestions.filter(Boolean).slice(0, 4);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Calculator className="h-8 w-8 text-primary" />
          Nutrition Calculator
        </h1>
        <p className="text-muted-foreground">
          Plan your meals and calculate exactly what you need to reach your goals
        </p>
      </div>

      <Tabs defaultValue="remaining" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="remaining" data-testid="tab-remaining">Remaining</TabsTrigger>
          <TabsTrigger value="planner" data-testid="tab-planner">Meal Planner</TabsTrigger>
          <TabsTrigger value="suggestions" data-testid="tab-suggestions">Smart Suggestions</TabsTrigger>
          <TabsTrigger value="scenarios" data-testid="tab-scenarios">Scenarios</TabsTrigger>
        </TabsList>

        {/* Remaining Nutrients Tab */}
        <TabsContent value="remaining" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Remaining to Reach Goals
              </CardTitle>
              <CardDescription>
                How much more you need to eat today to hit your targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg" data-testid="remaining-calories">
                  <Flame className="h-8 w-8 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-600">{remaining.calories}</div>
                  <div className="text-sm text-muted-foreground">calories left</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg" data-testid="remaining-protein">
                  <Beef className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{remaining.protein}g</div>
                  <div className="text-sm text-muted-foreground">protein left</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg" data-testid="remaining-carbs">
                  <Wheat className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">{remaining.carbs}g</div>
                  <div className="text-sm text-muted-foreground">carbs left</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg" data-testid="remaining-fat">
                  <Droplets className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-600">{remaining.fat}g</div>
                  <div className="text-sm text-muted-foreground">fat left</div>
                </div>
              </div>
              
              {remaining.calories === 0 && remaining.protein === 0 && remaining.carbs === 0 && remaining.fat === 0 && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                  <div className="text-green-800 dark:text-green-200 font-medium">
                    🎉 Congratulations! You've reached all your nutrition goals for today!
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meal Planner Tab */}
        <TabsContent value="planner" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Plan Your Meals
                </CardTitle>
                <CardDescription>
                  Add foods to see how they'll affect your daily totals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Quick Add Common Foods</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {commonFoods.slice(0, 6).map((food, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto p-3"
                        onClick={() => addPlannedMeal(food)}
                        data-testid={`add-food-${food.name.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <span className="text-lg mr-2">{food.icon}</span>
                        <div className="text-left">
                          <div className="font-medium">{food.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {food.calories} cal, {food.protein}g protein
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Food</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Food name"
                      value={customFood.name}
                      onChange={(e) => setCustomFood({...customFood, name: e.target.value})}
                      data-testid="input-custom-food-name"
                    />
                    <Input
                      type="number"
                      placeholder="Calories"
                      value={customFood.calories || ''}
                      onChange={(e) => setCustomFood({...customFood, calories: parseInt(e.target.value) || 0})}
                      data-testid="input-custom-calories"
                    />
                    <Input
                      type="number"
                      placeholder="Protein (g)"
                      value={customFood.protein || ''}
                      onChange={(e) => setCustomFood({...customFood, protein: parseInt(e.target.value) || 0})}
                      data-testid="input-custom-protein"
                    />
                    <Input
                      type="number"
                      placeholder="Carbs (g)"
                      value={customFood.carbs || ''}
                      onChange={(e) => setCustomFood({...customFood, carbs: parseInt(e.target.value) || 0})}
                      data-testid="input-custom-carbs"
                    />
                  </div>
                  <Button onClick={addCustomFood} className="w-full" data-testid="button-add-custom-food">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Food
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Planned Meals</CardTitle>
                <CardDescription>
                  Foods you're planning to eat today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plannedMeals.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Utensils className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No meals planned yet</p>
                    <p className="text-sm">Add foods to see how they affect your goals</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {plannedMeals.map((meal, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`planned-meal-${index}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{meal.icon}</span>
                          <div>
                            <div className="font-medium">{meal.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {meal.calories} cal, {meal.protein}g protein, {meal.carbs}g carbs, {meal.fat}g fat
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePlannedMeal(index)}
                          data-testid={`remove-meal-${index}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Projected Totals */}
          {plannedMeals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Projected Daily Totals</CardTitle>
                <CardDescription>
                  Your nutrition if you eat everything planned
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Calories', current: projectedTotals.calories, target: currentGoals.dailyCalories, icon: Flame, color: 'red' },
                    { label: 'Protein', current: projectedTotals.protein, target: currentGoals.dailyProtein, icon: Beef, color: 'blue' },
                    { label: 'Carbs', current: projectedTotals.carbs, target: currentGoals.dailyCarbs, icon: Wheat, color: 'yellow' },
                    { label: 'Fat', current: projectedTotals.fat, target: currentGoals.dailyFat, icon: Droplets, color: 'green' },
                  ].map(({ label, current, target, icon: Icon, color }) => {
                    const progress = calculateProgress(current, target);
                    return (
                      <div key={label} className="text-center" data-testid={`projected-${label.toLowerCase()}`}>
                        <Icon className={`h-6 w-6 mx-auto mb-2 text-${color}-600`} />
                        <div className="text-lg font-bold">{Math.round(current)}</div>
                        <div className="text-xs text-muted-foreground">/ {target}</div>
                        <Progress value={progress} className="h-2 mt-2" />
                        <div className={`text-xs mt-1 ${progress >= 100 ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {Math.round(progress)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Smart Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Smart Food Suggestions
              </CardTitle>
              <CardDescription>
                Based on your remaining nutrient needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getSmartSuggestions().map((food, index) => (
                  <div key={index} className="p-4 border rounded-lg" data-testid={`suggestion-${index}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{food.icon}</span>
                        <div>
                          <div className="font-medium">{food.name}</div>
                          <div className="text-xs text-muted-foreground">{food.portion}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addPlannedMeal(food)}
                        data-testid={`add-suggested-${index}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium">{food.calories}</div>
                        <div className="text-muted-foreground">cal</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{food.protein}g</div>
                        <div className="text-muted-foreground">protein</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{food.carbs}g</div>
                        <div className="text-muted-foreground">carbs</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{food.fat}g</div>
                        <div className="text-muted-foreground">fat</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {getSmartSuggestions().length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Apple className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Great job! You're close to reaching all your goals.</p>
                  <p className="text-sm">No specific food suggestions needed right now.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goal Achievement Scenarios</CardTitle>
              <CardDescription>
                Different ways to reach your remaining targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {remaining.calories > 100 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium mb-2">High Protein Scenario</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      To get {remaining.calories} calories with emphasis on protein:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>• Greek yogurt (1 cup) = 130 cal, 23g protein</div>
                      <div>• Chicken breast (50g) = 83 cal, 15g protein</div>
                      <div>• Almonds (15g) = 87 cal, 3g protein</div>
                      <div>• Banana (1 medium) = 105 cal, 1g protein</div>
                    </div>
                  </div>
                )}
                
                {remaining.carbs > 30 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <h4 className="font-medium mb-2">Carb-Focused Scenario</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      To get {remaining.carbs}g carbs while staying within calories:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>• Brown rice (1 cup) = 216 cal, 45g carbs</div>
                      <div>• Sweet potato (1 medium) = 112 cal, 26g carbs</div>
                      <div>• Oatmeal (1 cup) = 154 cal, 28g carbs</div>
                      <div>• Apple (1 medium) = 95 cal, 25g carbs</div>
                    </div>
                  </div>
                )}
                
                {remaining.fat > 10 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium mb-2">Healthy Fats Scenario</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      To get {remaining.fat}g healthy fats:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>• Avocado (1/2 medium) = 160 cal, 15g fat</div>
                      <div>• Olive oil (1 tbsp) = 119 cal, 14g fat</div>
                      <div>• Salmon (100g) = 208 cal, 12g fat</div>
                      <div>• Nuts (1 oz) = 164 cal, 14g fat</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}