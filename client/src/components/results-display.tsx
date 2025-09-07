import { Share2, Bookmark, Plus, Camera, Utensils, PieChart } from "lucide-react";
import type { FoodAnalysis } from "@shared/schema";

interface ResultsDisplayProps {
  data: FoodAnalysis;
  onScanAnother: () => void;
}

export function ResultsDisplay({ data, onScanAnother }: ResultsDisplayProps) {
  const formatTime = (date: Date | string) => {
    try {
      const now = new Date();
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
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
      <div className="bg-card rounded-xl shadow-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
            <img 
              src={`/${data.imageUrl}`}
              alt="Analyzed food plate thumbnail" 
              className="w-full h-full object-cover"
              data-testid="img-thumbnail"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" data-testid="text-meal-title">
              Food Analysis
            </h3>
            <p className="text-muted-foreground text-sm">
              <span data-testid="text-timestamp">{formatTime(data.createdAt)}</span> • 
              <span data-testid="text-confidence" className="ml-1">{data.confidence}% confidence</span>
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
      <div className="grid grid-cols-2 gap-3">
        {/* Calories */}
        <div className="bg-card rounded-xl p-4 shadow-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Calories</span>
            <i className="fas fa-fire text-red-500"></i>
          </div>
          <p className="text-2xl font-bold text-red-500" data-testid="text-calories">
            {data.totalCalories}
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round((data.totalCalories / 2000) * 100)}% daily value
          </p>
        </div>

        {/* Protein */}
        <div className="bg-card rounded-xl p-4 shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Protein</span>
            <i className="fas fa-dumbbell text-blue-500"></i>
          </div>
          <p className="text-2xl font-bold text-blue-500" data-testid="text-protein">
            {data.totalProtein}g
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round((data.totalProtein / 50) * 100)}% daily value
          </p>
        </div>

        {/* Carbs */}
        <div className="bg-card rounded-xl p-4 shadow-lg border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Carbs</span>
            <i className="fas fa-bread-slice text-orange-500"></i>
          </div>
          <p className="text-2xl font-bold text-orange-500" data-testid="text-carbs">
            {data.totalCarbs}g
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round((data.totalCarbs / 300) * 100)}% daily value
          </p>
        </div>

        {/* Fat */}
        <div className="bg-card rounded-xl p-4 shadow-lg border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Fat</span>
            <i className="fas fa-tint text-yellow-500"></i>
          </div>
          <p className="text-2xl font-bold text-yellow-500" data-testid="text-fat">
            {data.totalFat}g
          </p>
          <p className="text-xs text-muted-foreground">
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
      <div className="flex space-x-3 pt-4">
        <button 
          className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          data-testid="button-add-diary"
        >
          <Plus className="inline mr-2 h-4 w-4" />
          Add to Diary
        </button>
        <button 
          className="flex-1 bg-secondary text-secondary-foreground py-3 px-4 rounded-lg font-medium hover:bg-secondary/90 transition-colors"
          onClick={onScanAnother}
          data-testid="button-scan-another"
        >
          <Camera className="inline mr-2 h-4 w-4" />
          Scan Another
        </button>
      </div>
    </div>
  );
}
