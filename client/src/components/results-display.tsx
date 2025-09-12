import { Share2, Bookmark, Plus, Camera, Utensils, PieChart, Calendar, Clock, AlertTriangle, Info, Zap, Edit3, Check, X, Minus, Trash2 } from "lucide-react";
import type { FoodAnalysis, DetectedFood } from "@shared/schema";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResultsDisplayProps {
  data: FoodAnalysis;
  onScanAnother: () => void;
}

export function ResultsDisplay({ data, onScanAnother }: ResultsDisplayProps) {
  const [showDiaryDialog, setShowDiaryDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5));
  const [editableFoods, setEditableFoods] = useState<DetectedFood[]>(data.detectedFoods);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to update portion for a specific food item
  const updateFoodPortion = (index: number, newPortion: string) => {
    const updatedFoods = [...editableFoods];
    const originalFood = data.detectedFoods[index];
    const originalPortion = originalFood.portion;
    
    // Extract numeric value from portions (assuming format like "150g" or "1 cup")
    const getPortionMultiplier = (original: string, updated: string): number => {
      const originalMatch = original.match(/\d+(\.\d+)?/);
      const updatedMatch = updated.match(/\d+(\.\d+)?/);
      
      if (originalMatch && updatedMatch) {
        return parseFloat(updatedMatch[0]) / parseFloat(originalMatch[0]);
      }
      return 1; // Default to no change if we can't parse
    };
    
    const multiplier = getPortionMultiplier(originalPortion, newPortion);
    
    // Update nutrition values based on the multiplier
    updatedFoods[index] = {
      ...originalFood,
      portion: newPortion,
      calories: Math.round(originalFood.calories * multiplier),
      protein: Math.round(originalFood.protein * multiplier * 10) / 10,
      carbs: Math.round(originalFood.carbs * multiplier * 10) / 10,
      fat: Math.round(originalFood.fat * multiplier * 10) / 10,
    };
    
    setEditableFoods(updatedFoods);
  };

  const updateFoodName = (index: number, newName: string) => {
    const updatedFoods = [...editableFoods];
    updatedFoods[index] = {
      ...updatedFoods[index],
      name: newName,
    };
    setEditableFoods(updatedFoods);
  };

  const removeFoodItem = (index: number) => {
    const updatedFoods = editableFoods.filter((_, i) => i !== index);
    setEditableFoods(updatedFoods);
    setEditingIndex(null);
  };

  const addNewFoodItem = () => {
    const newFood = {
      name: "New Food Item",
      portion: "1 serving",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      icon: "fas fa-utensils"
    };
    const updatedFoods = [...editableFoods, newFood];
    setEditableFoods(updatedFoods);
    setEditingIndex(updatedFoods.length - 1); // Start editing the new item immediately
  };

  const hasChanges = () => {
    return JSON.stringify(editableFoods) !== JSON.stringify(data.detectedFoods);
  };

  const saveChanges = () => {
    // Update the original data with the edited foods AND recalculated totals
    const newTotals = calculateTotals();
    data.detectedFoods = [...editableFoods];
    data.totalCalories = newTotals.calories;
    data.totalProtein = newTotals.protein;
    data.totalCarbs = newTotals.carbs;
    data.totalFat = newTotals.fat;
    
    console.log("🔄 Saved changes with recalculated totals:", newTotals);
    
    toast({
      title: "Changes Saved",
      description: "Your food corrections have been saved successfully.",
    });
  };

  const resetChanges = () => {
    setEditableFoods([...data.detectedFoods]);
    setEditingIndex(null);
    toast({
      title: "Changes Reset",
      description: "All changes have been reset to original AI detection.",
    });
  };

  const updateFoodNutrition = (index: number, field: string, value: number) => {
    const updatedFoods = [...editableFoods];
    updatedFoods[index] = {
      ...updatedFoods[index],
      [field]: value,
    };
    setEditableFoods(updatedFoods);
  };

  // Calculate total nutrition from editable foods
  const calculateTotals = () => {
    return editableFoods.reduce(
      (totals, food) => ({
        calories: totals.calories + food.calories,
        protein: totals.protein + food.protein,
        carbs: totals.carbs + food.carbs,
        fat: totals.fat + food.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const totals = calculateTotals();

  const addToDiaryMutation = useMutation({
    mutationFn: async () => {
      const mealDateTime = new Date(`${selectedDate}T${selectedTime}`);
      
      // Create a modified analysis with updated food data
      const modifiedAnalysis = {
        ...data,
        detectedFoods: editableFoods,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat
      };
      
      const response = await apiRequest('POST', '/api/diary', {
        analysisId: data.id,
        mealType: selectedMealType,
        mealDate: mealDateTime.toISOString(),
        notes: "",
        modifiedAnalysis // Send the modified data
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Added to Diary!",
        description: "Your meal has been saved to your food diary.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      setShowDiaryDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to save meal to diary. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding to diary:", error);
    },
  });
  const formatTime = (date: Date | string | null | undefined) => {
    try {
      // Handle null, undefined, or invalid inputs
      if (!date) {
        return 'Unknown time';
      }
      
      const now = new Date();
      let dateObj: Date;
      
      if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return 'Unknown time';
      }
      
      // Check if dateObj is valid
      if (isNaN(dateObj.getTime())) {
        return 'Unknown time';
      }
      
      const diff = now.getTime() - dateObj.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  };

  const getNutrientIcon = (type: string) => {
    switch (type) {
      case 'protein': return 'fas fa-dumbbell';
      case 'carbs': return 'fas fa-bread-slice';
      case 'fat': return 'fas fa-tint';
      case 'calories': return 'fas fa-fire';
      default: return 'fas fa-circle';
    }
  };

  const getFoodIcon = (iconName: string) => {
    switch (iconName) {
      case 'egg': return 'fas fa-egg';
      case 'bacon': return 'fas fa-bacon';
      case 'bread-slice': return 'fas fa-bread-slice';
      case 'apple-alt': return 'fas fa-apple-alt';
      default: return 'fas fa-utensils';
    }
  };

  // Calculate percentages for macro breakdown
  const totalMacros = data.totalProtein * 4 + data.totalCarbs * 4 + data.totalFat * 9;
  const proteinPercent = Math.round((data.totalProtein * 4 / totalMacros) * 100);
  const carbsPercent = Math.round((data.totalCarbs * 4 / totalMacros) * 100);
  const fatPercent = Math.round((data.totalFat * 9 / totalMacros) * 100);

  return (
    <div className="p-4 space-y-4">
      {/* AI Unavailable Warning */}
      {data.isAITemporarilyUnavailable && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <strong>AI services temporarily unavailable</strong><br />
            We've provided estimated values based on typical portions. You can still save this entry and edit the details later when our AI services are back online.
          </AlertDescription>
        </Alert>
      )}
      {/* Photo thumbnail and actions */}
      <div className="modern-card glass-card p-6">
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted relative">
            {data.imageUrl ? (
              <img 
                src={data.imageUrl.startsWith('/') ? data.imageUrl : `/${data.imageUrl}`}
                alt="Analyzed food plate thumbnail" 
                className="w-full h-full object-cover"
                data-testid="img-thumbnail"
                onError={(e) => {
                  console.log('Image failed to load:', data.imageUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl gradient-text" data-testid="text-meal-title">
              Food Analysis Complete
            </h3>
            <p className="text-muted-foreground text-sm space-x-2">
              <span data-testid="text-timestamp">{formatTime(data.createdAt)}</span> • 
              <span 
                data-testid="text-confidence" 
                className={`ml-1 px-2 py-1 rounded-full font-medium ${
                  data.isAITemporarilyUnavailable 
                    ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                }`}
              >
                {data.isAITemporarilyUnavailable ? 'Estimated values' : `${data.confidence}% confidence`}
              </span>
            </p>
          </div>
          <div className="flex flex-col space-y-2">
            <button 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-bookmark"
            >
              <Bookmark className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detected Foods - Now First */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Utensils className="text-primary mr-2 h-5 w-5" />
          Food Items Detected
        </h3>
        
        <div className="space-y-4">
          {editableFoods.map((food, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg transition-all ${
                editingIndex === index 
                  ? 'bg-primary/10 border-2 border-primary/30' 
                  : 'bg-secondary/50 border border-transparent'
              }`}
              data-testid={`card-food-${index}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <i className={`${getFoodIcon(food.icon)} text-primary`}></i>
                  </div>
                  <div className="flex-1">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={food.name}
                        onChange={(e) => updateFoodName(index, e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background font-medium"
                        placeholder="e.g., Jacket Potato with Ham and Cheese"
                        data-testid={`input-food-name-${index}`}
                      />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="font-medium" data-testid={`text-food-name-${index}`}>
                          {food.name}
                        </p>
                        <button
                          onClick={() => setEditingIndex(index)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded opacity-70 hover:opacity-100 transition-opacity"
                          title="Edit food name"
                          data-testid={`button-edit-name-${index}`}
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {editingIndex === index ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="text"
                          value={food.portion}
                          onChange={(e) => updateFoodPortion(index, e.target.value)}
                          className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                          placeholder="e.g., 200g, 1 cup"
                          data-testid={`input-food-portion-${index}`}
                        />
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                          data-testid={`button-save-portion-${index}`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditableFoods([...data.detectedFoods]); // Reset to original
                            setEditingIndex(null);
                          }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Cancel changes"
                          data-testid={`button-cancel-portion-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFoodItem(index)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Remove this food item"
                          data-testid={`button-remove-food-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-muted-foreground" data-testid={`text-food-portion-${index}`}>
                          {food.portion}
                        </p>
                        <button
                          onClick={() => setEditingIndex(index)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded opacity-70 hover:opacity-100 transition-opacity"
                          title="Edit portion"
                          data-testid={`button-edit-portion-${index}`}
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold" data-testid={`text-food-calories-${index}`}>
                    {food.calories} cal
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {food.protein}g protein
                  </p>
                  {editingIndex === index && (
                    <div className="text-xs text-blue-600 mt-1 space-y-2">
                      <div>{food.carbs}g carbs • {food.fat}g fat</div>
                      {food.name === "New Food Item" && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400">Calories</label>
                            <input
                              type="number"
                              value={food.calories}
                              onChange={(e) => updateFoodNutrition(index, 'calories', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border rounded bg-background"
                              placeholder="0"
                              data-testid={`input-calories-${index}`}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400">Protein (g)</label>
                            <input
                              type="number"
                              value={food.protein}
                              onChange={(e) => updateFoodNutrition(index, 'protein', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border rounded bg-background"
                              placeholder="0"
                              data-testid={`input-protein-${index}`}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400">Carbs (g)</label>
                            <input
                              type="number"
                              value={food.carbs}
                              onChange={(e) => updateFoodNutrition(index, 'carbs', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border rounded bg-background"
                              placeholder="0"
                              data-testid={`input-carbs-${index}`}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400">Fat (g)</label>
                            <input
                              type="number"
                              value={food.fat}
                              onChange={(e) => updateFoodNutrition(index, 'fat', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border rounded bg-background"
                              placeholder="0"
                              data-testid={`input-fat-${index}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Missing Food Item */}
        <div className="mt-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
          <button
            onClick={() => addNewFoodItem()}
            className="w-full flex items-center justify-center space-x-2 py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
            data-testid="button-add-food"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Add Missing Food Item</span>
          </button>
        </div>
        
        {/* Save Changes Button */}
        {hasChanges() && (
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => saveChanges()}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              data-testid="button-save-changes"
            >
              <Check className="h-5 w-5" />
              <span>Save All Changes</span>
            </button>
            <button
              onClick={() => resetChanges()}
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              data-testid="button-reset-changes"
            >
              Reset
            </button>
          </div>
        )}
        
        {/* Always show editing tip */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> AI sometimes misidentifies foods. Click the <Edit3 className="h-3 w-3 inline mx-1" /> icon to edit food names and portions, use the <Trash2 className="h-3 w-3 inline mx-1" /> icon to remove incorrect items, or use "Add Missing Food Item" to add foods the AI missed. Remember to save your changes!
            </p>
          </div>
        </div>
        
        {data.isAITemporarilyUnavailable && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>AI Unavailable:</strong> These are estimated values. Edit them above for more accuracy.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Nutrition Summary Cards - Now Second */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calories */}
        <div className="modern-card bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 p-5 border-0 relative overflow-hidden">
          <div className="absolute -top-2 -right-2 w-16 h-16 bg-red-200/20 dark:bg-red-800/20 rounded-full"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">Calories</span>
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-fire text-red-500 dark:text-red-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1" data-testid="text-calories">
            {totals.calories}
          </p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70 font-medium">
            {Math.round((totals.calories / 2000) * 100)}% daily value
          </p>
        </div>

        {/* Protein */}
        <div className="modern-card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-5 border-0 relative overflow-hidden">
          <div className="absolute -top-2 -right-2 w-16 h-16 bg-blue-200/20 dark:bg-blue-800/20 rounded-full"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Protein</span>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-dumbbell text-blue-500 dark:text-blue-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1" data-testid="text-protein">
            {totals.protein}g
          </p>
          <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">
            {Math.round((totals.protein / 50) * 100)}% daily value
          </p>
        </div>

        {/* Carbs */}
        <div className="modern-card bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 p-5 border-0 relative overflow-hidden">
          <div className="absolute -top-2 -right-2 w-16 h-16 bg-orange-200/20 dark:bg-orange-800/20 rounded-full"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">Carbs</span>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-bread-slice text-orange-500 dark:text-orange-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1" data-testid="text-carbs">
            {totals.carbs}g
          </p>
          <p className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">
            {Math.round((totals.carbs / 300) * 100)}% daily value
          </p>
        </div>

        {/* Fat */}
        <div className="modern-card bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 p-5 border-0 relative overflow-hidden">
          <div className="absolute -top-2 -right-2 w-16 h-16 bg-yellow-200/20 dark:bg-yellow-800/20 rounded-full"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">Fat</span>
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <i className="fas fa-tint text-yellow-500 dark:text-yellow-400"></i>
            </div>
          </div>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1" data-testid="text-fat">
            {totals.fat}g
          </p>
          <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 font-medium">
            {Math.round((totals.fat / 65) * 100)}% daily value
          </p>
        </div>
      </div>

      {/* Macro Breakdown Chart */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <PieChart className="text-primary mr-2 h-5 w-5" />
          Macronutrient Breakdown
        </h3>
        
        <div className="space-y-4">
          {/* Protein */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="font-medium">Protein</span>
            </div>
            <span className="text-sm text-muted-foreground" data-testid="text-protein-percent">
              {proteinPercent}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
              style={{width: `${proteinPercent}%`}}
            ></div>
          </div>

          {/* Carbohydrates */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="font-medium">Carbohydrates</span>
            </div>
            <span className="text-sm text-muted-foreground" data-testid="text-carbs-percent">
              {carbsPercent}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-1000" 
              style={{width: `${carbsPercent}%`}}
            ></div>
          </div>

          {/* Fat */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="font-medium">Fat</span>
            </div>
            <span className="text-sm text-muted-foreground" data-testid="text-fat-percent">
              {fatPercent}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-1000" 
              style={{width: `${fatPercent}%`}}
            ></div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-4 pt-6">
        <button 
          className="flex-1 gradient-button py-4 px-6 rounded-xl font-medium hover:scale-[1.02] flex items-center justify-center space-x-2"
          onClick={() => setShowDiaryDialog(true)}
          data-testid="button-add-diary"
        >
          <Plus className="h-5 w-5" />
          <span>Add to Diary</span>
        </button>
        <button 
          className="flex-1 modern-card bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 text-gray-700 dark:text-gray-300 py-4 px-6 rounded-xl font-medium hover:scale-[1.02] smooth-transition flex items-center justify-center space-x-2"
          onClick={onScanAnother}
          data-testid="button-scan-another"
        >
          <Camera className="h-5 w-5" />
          <span>Scan Another</span>
        </button>
      </div>

      {/* Add to Diary Dialog */}
      {showDiaryDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-gray-700/50 animate-in slide-in-from-bottom-4 duration-300">
            
            {/* Beautiful Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Add to Food Diary
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Track your delicious meal</p>
            </div>
            
            <div className="space-y-6">
              {/* Enhanced Meal Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  🍽️ Meal Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'breakfast', icon: '🌅', gradient: 'from-orange-400 to-yellow-400' },
                    { type: 'lunch', icon: '☀️', gradient: 'from-green-400 to-blue-400' },
                    { type: 'dinner', icon: '🌙', gradient: 'from-purple-400 to-pink-400' },
                    { type: 'snack', icon: '🍿', gradient: 'from-pink-400 to-red-400' }
                  ].map((meal) => (
                    <button
                      key={meal.type}
                      onClick={() => setSelectedMealType(meal.type as any)}
                      className={`relative p-4 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                        selectedMealType === meal.type
                          ? `bg-gradient-to-r ${meal.gradient} text-white shadow-xl scale-105`
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      }`}
                      data-testid={`button-meal-${meal.type}`}
                    >
                      <div className="text-2xl mb-1">{meal.icon}</div>
                      <div className="capitalize font-semibold">{meal.type}</div>
                      {selectedMealType === meal.type && (
                        <div className="absolute inset-0 rounded-xl ring-2 ring-white ring-offset-2 ring-offset-transparent"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced Date Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  📅 Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    data-testid="input-meal-date"
                  />
                </div>
              </div>

              {/* Enhanced Time Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  ⏰ Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    data-testid="input-meal-time"
                  />
                </div>
              </div>
            </div>

            {/* Enhanced Dialog Actions - Always visible */}
            <div className="flex space-x-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 -mx-6 px-6 -mb-6 pb-6 rounded-b-2xl">
              <button
                onClick={() => setShowDiaryDialog(false)}
                className="flex-1 py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md"
                data-testid="button-cancel-diary"
              >
                Cancel
              </button>
              <button
                onClick={() => addToDiaryMutation.mutate()}
                disabled={addToDiaryMutation.isPending}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                data-testid="button-save-diary"
              >
                <Plus className="h-5 w-5 mr-2 inline" />
                {addToDiaryMutation.isPending ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </span>
                ) : (
                  'Add to Diary'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
