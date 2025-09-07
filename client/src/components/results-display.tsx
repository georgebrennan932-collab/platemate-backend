import { Share2, Bookmark, Plus, Camera, Utensils, PieChart, Calendar, Clock } from "lucide-react";
import type { FoodAnalysis } from "@shared/schema";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ResultsDisplayProps {
  data: FoodAnalysis;
  onScanAnother: () => void;
}

export function ResultsDisplay({ data, onScanAnother }: ResultsDisplayProps) {
  const [showDiaryDialog, setShowDiaryDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5));
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToDiaryMutation = useMutation({
    mutationFn: async () => {
      const mealDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const response = await apiRequest('POST', '/api/diary', {
        analysisId: data.id,
        mealType: selectedMealType,
        mealDate: mealDateTime.toISOString(),
        notes: ""
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
      {/* Photo thumbnail and actions */}
      <div className="modern-card glass-card p-6">
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted relative">
            <img 
              src={`/${data.imageUrl}`}
              alt="Analyzed food plate thumbnail" 
              className="w-full h-full object-cover"
              data-testid="img-thumbnail"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl gradient-text" data-testid="text-meal-title">
              Food Analysis Complete
            </h3>
            <p className="text-muted-foreground text-sm space-x-2">
              <span data-testid="text-timestamp">{formatTime(data.createdAt)}</span> • 
              <span data-testid="text-confidence" className="ml-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">{data.confidence}% confidence</span>
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

      {/* Nutrition Summary Cards */}
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
            {data.totalCalories}
          </p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70 font-medium">
            {Math.round((data.totalCalories / 2000) * 100)}% daily value
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
            {data.totalProtein}g
          </p>
          <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">
            {Math.round((data.totalProtein / 50) * 100)}% daily value
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
            {data.totalCarbs}g
          </p>
          <p className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium">
            {Math.round((data.totalCarbs / 300) * 100)}% daily value
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
            {data.totalFat}g
          </p>
          <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 font-medium">
            {Math.round((data.totalFat / 65) * 100)}% daily value
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Utensils className="text-primary mr-2 h-5 w-5" />
          Food Items Detected
        </h3>
        
        <div className="space-y-4">
          {data.detectedFoods.map((food, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              data-testid={`card-food-${index}`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <i className={`${getFoodIcon(food.icon)} text-primary`}></i>
                </div>
                <div>
                  <p className="font-medium" data-testid={`text-food-name-${index}`}>
                    {food.name}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-food-portion-${index}`}>
                    {food.portion}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold" data-testid={`text-food-calories-${index}`}>
                  {food.calories} cal
                </p>
                <p className="text-xs text-muted-foreground">
                  {food.protein}g protein
                </p>
              </div>
            </div>
          ))}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add to Food Diary</h3>
            
            <div className="space-y-4">
              {/* Meal Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Meal Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                    <button
                      key={meal}
                      onClick={() => setSelectedMealType(meal)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedMealType === meal
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                      data-testid={`button-meal-${meal}`}
                    >
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background"
                  data-testid="input-meal-date"
                />
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background"
                  data-testid="input-meal-time"
                />
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDiaryDialog(false)}
                className="flex-1 py-2 px-4 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                data-testid="button-cancel-diary"
              >
                Cancel
              </button>
              <button
                onClick={() => addToDiaryMutation.mutate()}
                disabled={addToDiaryMutation.isPending}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                data-testid="button-save-diary"
              >
                {addToDiaryMutation.isPending ? 'Saving...' : 'Save to Diary'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
