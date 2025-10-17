import { Share2, Bookmark, Plus, Camera, Utensils, PieChart, Calendar, Clock, AlertTriangle, Info, Zap, Edit3, Check, X, Minus, Trash2, Mic, MicOff, ArrowLeft } from "lucide-react";
import type { FoodAnalysis, DetectedFood } from "@shared/schema";
import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { updateStreak } from "@/lib/streak-tracker";
import { soundService } from "@/lib/sound-service";

// Extended food item with baseline data for editing
interface EditableFood extends DetectedFood {
  baselinePortionValue: number;
  baselinePortionUnit: string;
  baselineCalories: number;
  baselineProtein: number;
  baselineCarbs: number;
  baselineFat: number;
}

interface ResultsDisplayProps {
  data: FoodAnalysis;
  onScanAnother: () => void;
}

// Helper function to parse portion string and extract numeric value and unit
function parsePortionString(portion: string): { value: number; unit: string } {
  // Remove extra spaces and lowercase for matching
  const cleaned = portion.trim().toLowerCase();
  
  // Common unit patterns (prioritize longer matches first)
  const unitPatterns = [
    { regex: /(\d+(?:\.\d+)?)\s*(?:servings?|srv)/i, unit: 'serving' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:cups?)/i, unit: 'cup' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:tablespoons?|tbsp)/i, unit: 'tbsp' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:teaspoons?|tsp)/i, unit: 'tsp' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:ounces?|oz)/i, unit: 'oz' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?)/i, unit: 'lb' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:grams?|g)(?:\s|$|,)/i, unit: 'g' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:kilograms?|kg)/i, unit: 'kg' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:milliliters?|ml)/i, unit: 'ml' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:liters?|l)(?:\s|$|,)/i, unit: 'L' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:slices?)/i, unit: 'slice' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:pieces?|pcs?)/i, unit: 'piece' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:items?)/i, unit: 'item' },
  ];
  
  // Try to match each pattern
  for (const { regex, unit } of unitPatterns) {
    const match = cleaned.match(regex);
    if (match && match[1]) {
      return { value: parseFloat(match[1]), unit };
    }
  }
  
  // Fallback: just grab the first number
  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numMatch && numMatch[1]) {
    return { value: parseFloat(numMatch[1]), unit: 'g' }; // default to grams
  }
  
  // Ultimate fallback
  return { value: 100, unit: 'g' };
}

// Helper function to initialize editable food with baseline data
function initializeEditableFood(food: DetectedFood): EditableFood {
  const { value, unit } = parsePortionString(food.portion);
  
  return {
    ...food,
    baselinePortionValue: value,
    baselinePortionUnit: unit,
    baselineCalories: food.calories,
    baselineProtein: food.protein,
    baselineCarbs: food.carbs,
    baselineFat: food.fat,
  };
}

export function ResultsDisplay({ data, onScanAnother }: ResultsDisplayProps) {
  const [showDiaryDialog, setShowDiaryDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5));
  const [editableFoods, setEditableFoods] = useState<EditableFood[]>(
    data.detectedFoods.map(initializeEditableFood)
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [showVoiceMealDialog, setShowVoiceMealDialog] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [showLowConfidenceDialog, setShowLowConfidenceDialog] = useState(false);
  const [nutritionUpdateTimer, setNutritionUpdateTimer] = useState<NodeJS.Timeout | null>(null);
  const [nutritionUpdateController, setNutritionUpdateController] = useState<AbortController | null>(null);
  const [nutritionRequestId, setNutritionRequestId] = useState<number>(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check speech recognition support
  useEffect(() => {
    const checkSpeechSupport = () => {
      const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(supported);
    };
    checkSpeechSupport();
    
    // Cleanup function to clear any pending nutrition updates
    return () => {
      if (nutritionUpdateTimer) {
        clearTimeout(nutritionUpdateTimer);
      }
      if (nutritionUpdateController) {
        nutritionUpdateController.abort();
      }
    };
  }, []);

  // Check for low confidence on mount
  useEffect(() => {
    if (!data.isAITemporarilyUnavailable && data.confidence < 90) {
      setShowLowConfidenceDialog(true);
    }
  }, [data.confidence, data.isAITemporarilyUnavailable]);

  // Handle voice input for adding food items
  const handleVoiceInput = async () => {
    if (!speechSupported) {
      toast({
        title: "Speech Not Supported",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    // If already listening, stop the recording
    if (isListening && recognitionInstance) {
      console.log('🛑 User clicked stop - current state:', {
        isListening,
        hasRecognitionInstance: !!recognitionInstance,
        recognitionState: recognitionInstance
      });
      
      try {
        // Force immediate stop with state cleanup
        setIsListening(false);
        setRecognitionInstance(null);
        
        recognitionInstance.abort(); // Use abort() for immediate termination
        console.log('🛑 Recognition.abort() called and state cleared');
      } catch (error) {
        console.warn('Error aborting recognition:', error);
        try {
          recognitionInstance.stop();
          console.log('🛑 Recognition.stop() called as fallback');
        } catch (stopError) {
          console.warn('Error with stop() fallback:', stopError);
        }
        // Ensure state is cleared even if abort/stop fails
        setIsListening(false);
        setRecognitionInstance(null);
      }
      
      toast({
        title: "Voice Recording Stopped",
        description: "Speech recognition has been stopped",
      });
      return;
    }

    try {
      const recognition = new (window.SpeechRecognition || (window as any).webkitSpeechRecognition)();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('🎤 Voice recording started');
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Say your food item and quantity (e.g., '100g salmon')",
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Voice captured:', transcript);
        setVoiceInput(transcript);
        setShowVoiceMealDialog(true);
        toast({
          title: "Voice captured!",
          description: `Heard: "${transcript}"`,
        });
        setIsListening(false);
        setRecognitionInstance(null);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Don't show error for aborted (user stopped)
        if (event.error === 'aborted') {
          console.log('🎤 Voice recording stopped by user');
        } else {
          toast({
            title: "Speech Error",
            description: "Could not recognize speech. Please try again.",
            variant: "destructive",
          });
        }
        setIsListening(false);
        setRecognitionInstance(null);
      };

      recognition.onend = () => {
        console.log('🎤 Voice recording ended');
        setIsListening(false);
        setRecognitionInstance(null);
      };

      // Store the recognition instance so we can stop it later
      setRecognitionInstance(recognition);
      recognition.start();
    } catch (error) {
      toast({
        title: "Speech Error",
        description: "Failed to start speech recognition",
        variant: "destructive",
      });
      setIsListening(false);
      setRecognitionInstance(null);
    }
  };

  // Function to update portion for a specific food item using numeric value
  const updateFoodPortionValue = (index: number, newValue: number) => {
    const updatedFoods = [...editableFoods];
    const currentFood = editableFoods[index];
    
    // Guard against division by zero or invalid baseline
    if (!currentFood.baselinePortionValue || currentFood.baselinePortionValue <= 0) {
      console.warn('Invalid baseline portion value, skipping update');
      return;
    }
    
    // Calculate multiplier from baseline value
    const multiplier = newValue / currentFood.baselinePortionValue;
    
    // Clamp multiplier to reasonable range (0.01x to 100x)
    const clampedMultiplier = Math.max(0.01, Math.min(100, multiplier));
    
    // Update display portion string with spacing
    const newPortionString = `${newValue} ${currentFood.baselinePortionUnit}`;
    
    // Update nutrition values based on baseline
    updatedFoods[index] = {
      ...currentFood,
      portion: newPortionString,
      calories: Math.round(currentFood.baselineCalories * clampedMultiplier),
      protein: Math.round(currentFood.baselineProtein * clampedMultiplier * 10) / 10,
      carbs: Math.round(currentFood.baselineCarbs * clampedMultiplier * 10) / 10,
      fat: Math.round(currentFood.baselineFat * clampedMultiplier * 10) / 10,
    };
    
    setEditableFoods(updatedFoods);
    scheduleNutritionUpdate(updatedFoods);
  };
  
  // Function to update portion unit
  const updateFoodPortionUnit = (index: number, newUnit: string) => {
    const updatedFoods = [...editableFoods];
    const currentFood = editableFoods[index];
    
    // Extract current numeric value from portion
    const currentValue = parsePortionString(currentFood.portion).value;
    
    // Update portion string with new unit (with spacing)
    updatedFoods[index] = {
      ...currentFood,
      portion: `${currentValue} ${newUnit}`,
      baselinePortionUnit: newUnit,
    };
    
    setEditableFoods(updatedFoods);
    // Trigger nutrition recalculation with new unit - server will update baseline
    scheduleNutritionUpdate(updatedFoods);
  };

  // Debounced nutrition calculation function with race condition protection
  const updateNutritionValues = useCallback(async (foodsToUpdate: DetectedFood[], requestId: number) => {
    try {
      // Cancel previous request if it exists
      if (nutritionUpdateController) {
        nutritionUpdateController.abort();
      }
      
      // Create new AbortController for this request
      const controller = new AbortController();
      setNutritionUpdateController(controller);
      
      const response = await fetch('/api/calculate-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foods: foodsToUpdate }),
        credentials: 'include',
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const nutritionData = await response.json();
      
      // Only update if this is still the latest request
      if (requestId === nutritionRequestId && nutritionData.foods) {
        // Merge nutrition data while preserving current user edits and updating baseline
        setEditableFoods(currentFoods => {
          return currentFoods.map((currentFood, index) => {
            const updatedFood = nutritionData.foods[index];
            if (updatedFood) {
              // Update both displayed and baseline nutrition values from server
              const { value, unit } = parsePortionString(updatedFood.portion);
              return {
                ...currentFood,
                calories: updatedFood.calories || currentFood.calories,
                protein: updatedFood.protein || currentFood.protein,
                carbs: updatedFood.carbs || currentFood.carbs,
                fat: updatedFood.fat || currentFood.fat,
                // Update baseline to match new nutrition values
                baselineCalories: updatedFood.calories || currentFood.baselineCalories,
                baselineProtein: updatedFood.protein || currentFood.baselineProtein,
                baselineCarbs: updatedFood.carbs || currentFood.baselineCarbs,
                baselineFat: updatedFood.fat || currentFood.baselineFat,
                // Update baseline portion if portion changed
                baselinePortionValue: value,
                baselinePortionUnit: unit,
              };
            }
            return currentFood;
          });
        });
      }
      
      // Clear the controller reference
      setNutritionUpdateController(null);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      setNutritionUpdateController(null);
      
    }
  }, []);

  // Debounced function to trigger nutrition updates with request versioning
  const scheduleNutritionUpdate = useCallback((foods: DetectedFood[]) => {
    
    // Clear existing timer
    if (nutritionUpdateTimer) {
      clearTimeout(nutritionUpdateTimer);
    }
    
    // Increment request ID for race condition protection
    const newRequestId = nutritionRequestId + 1;
    setNutritionRequestId(newRequestId);
    
    // Set new timer with 1 second delay
    const timer = setTimeout(() => {
      updateNutritionValues(foods, newRequestId);
    }, 1000);
    
    setNutritionUpdateTimer(timer);
  }, [updateNutritionValues]);

  const updateFoodName = (index: number, newName: string) => {
    const updatedFoods = [...editableFoods];
    
    // Expanded quick nutrition lookup for instant feedback
    const quickNutrition: { [key: string]: { calories: number; protein: number; carbs: number; fat: number } } = {
      // Proteins
      'chicken breast': { calories: 231, protein: 43, carbs: 0, fat: 5 },
      'chicken': { calories: 231, protein: 43, carbs: 0, fat: 5 },
      'beef': { calories: 250, protein: 35, carbs: 0, fat: 15 },
      'salmon': { calories: 208, protein: 30, carbs: 0, fat: 12 },
      'tuna': { calories: 184, protein: 40, carbs: 0, fat: 1 },
      'pork': { calories: 242, protein: 27, carbs: 0, fat: 14 },
      'turkey': { calories: 189, protein: 29, carbs: 0, fat: 7 },
      'fish': { calories: 206, protein: 22, carbs: 0, fat: 12 },
      'shrimp': { calories: 99, protein: 24, carbs: 0, fat: 0 },
      'eggs': { calories: 155, protein: 13, carbs: 1, fat: 11 },
      'tofu': { calories: 144, protein: 17, carbs: 3, fat: 9 },
      
      // Carbohydrates
      'rice': { calories: 130, protein: 3, carbs: 28, fat: 0 },
      'pasta': { calories: 220, protein: 8, carbs: 44, fat: 1 },
      'bread': { calories: 80, protein: 4, carbs: 15, fat: 1 },
      'potato': { calories: 161, protein: 4, carbs: 37, fat: 0 },
      'sweet potato': { calories: 112, protein: 2, carbs: 26, fat: 0 },
      'quinoa': { calories: 222, protein: 8, carbs: 39, fat: 4 },
      'oats': { calories: 389, protein: 17, carbs: 66, fat: 7 },
      
      // Fruits
      'apple': { calories: 95, protein: 0, carbs: 25, fat: 0 },
      'banana': { calories: 105, protein: 1, carbs: 27, fat: 0 },
      'orange': { calories: 62, protein: 1, carbs: 15, fat: 0 },
      'berries': { calories: 57, protein: 1, carbs: 14, fat: 0 },
      'strawberries': { calories: 49, protein: 1, carbs: 12, fat: 0 },
      
      // Vegetables
      'broccoli': { calories: 55, protein: 4, carbs: 11, fat: 0 },
      'spinach': { calories: 23, protein: 3, carbs: 4, fat: 0 },
      'carrots': { calories: 41, protein: 1, carbs: 10, fat: 0 },
      'beans': { calories: 245, protein: 15, carbs: 45, fat: 1 },
      'baked beans': { calories: 105, protein: 5, carbs: 22, fat: 1 },
      
      // Nuts and seeds
      'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50 },
      'walnuts': { calories: 654, protein: 15, carbs: 14, fat: 65 },
      
      // Dairy
      'milk': { calories: 42, protein: 3, carbs: 5, fat: 1 },
      'cheese': { calories: 402, protein: 25, carbs: 1, fat: 33 },
      'yogurt': { calories: 59, protein: 10, carbs: 4, fat: 0 }
    };
    
    const lowerName = newName.toLowerCase();
    const nutritionMatch = Object.keys(quickNutrition).find(key => lowerName.includes(key));
    
    if (nutritionMatch) {
      // Update with known nutrition values immediately for instant feedback
      updatedFoods[index] = {
        ...updatedFoods[index],
        name: newName,
        ...quickNutrition[nutritionMatch]
      };
    } else {
      // Just update name, nutrition will be calculated by API
      updatedFoods[index] = {
        ...updatedFoods[index],
        name: newName,
      };
    }
    
    setEditableFoods(updatedFoods);
    
    // ALWAYS call API for the most accurate nutrition values
    scheduleNutritionUpdate(updatedFoods);
  };

  const removeFoodItem = (index: number) => {
    const updatedFoods = editableFoods.filter((_, i) => i !== index);
    setEditableFoods(updatedFoods);
    setEditingIndex(null);
  };

  const addNewFoodItem = () => {
    const newFood: EditableFood = {
      name: "New Food Item",
      portion: "1 serving",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      icon: "fas fa-utensils",
      baselinePortionValue: 1,
      baselinePortionUnit: "serving",
      baselineCalories: 0,
      baselineProtein: 0,
      baselineCarbs: 0,
      baselineFat: 0,
    };
    const updatedFoods = [...editableFoods, newFood];
    setEditableFoods(updatedFoods);
    setEditingIndex(updatedFoods.length - 1); // Start editing the new item immediately
    scheduleNutritionUpdate(updatedFoods);
  };

  const hasChanges = () => {
    return JSON.stringify(editableFoods) !== JSON.stringify(data.detectedFoods);
  };

  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      // Server calculates totals for security - only send detectedFoods
      const response = await apiRequest('PATCH', `/api/analyses/${data.id}`, {
        detectedFoods: editableFoods
      });
      return await response.json();
    },
    onSuccess: (updatedAnalysis) => {
      soundService.playClick();
      // Update the original data with server-calculated values
      data.detectedFoods = [...updatedAnalysis.detectedFoods];
      data.totalCalories = updatedAnalysis.totalCalories;
      data.totalProtein = updatedAnalysis.totalProtein;
      data.totalCarbs = updatedAnalysis.totalCarbs;
      data.totalFat = updatedAnalysis.totalFat;
      
      // Update local state to match server response
      setEditableFoods(updatedAnalysis.detectedFoods.map(initializeEditableFood));
      
      console.log("✅ Successfully saved changes to database. Server totals:", {
        calories: updatedAnalysis.totalCalories,
        protein: updatedAnalysis.totalProtein
      });
      
      toast({
        title: "Changes Saved",
        description: "Your food corrections have been saved to the database.",
      });
      
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analyses', data.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/streak'] });
    },
    onError: (error: Error) => {
      console.error("❌ Failed to save changes:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveChanges = () => {
    saveChangesMutation.mutate();
  };

  const resetChanges = () => {
    setEditableFoods(data.detectedFoods.map(initializeEditableFood));
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
        calories: totals.calories + (food.calories || 0),
        protein: totals.protein + (food.protein || 0),
        carbs: totals.carbs + (food.carbs || 0),
        fat: totals.fat + (food.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const totals = calculateTotals();

  const addVoiceMealMutation = useMutation({
    mutationFn: async ({ foodDescription }: { foodDescription: string }) => {
      // Analyze the text-based food description
      const analysisResponse = await apiRequest('POST', '/api/analyze-text', { foodDescription });
      const analysis = await analysisResponse.json();
      
      // Add the new food to the current analysis
      const newFood = analysis.detectedFoods[0]; // Take the first detected food
      if (newFood) {
        const updatedFoods = [...editableFoods, initializeEditableFood(newFood)];
        setEditableFoods(updatedFoods);
        
        // Save changes to the database
        const updateResponse = await apiRequest('PATCH', `/api/analyses/${data.id}`, {
          detectedFoods: updatedFoods
        });
        return await updateResponse.json();
      }
      return analysis;
    },
    onSuccess: (updatedAnalysis) => {
      soundService.playSuccess();
      toast({
        title: "Food Added!",
        description: "Voice food item has been added to your analysis.",
      });
      
      // Update data totals if we got an updated analysis back
      if (updatedAnalysis && updatedAnalysis.detectedFoods) {
        data.detectedFoods = [...updatedAnalysis.detectedFoods];
        data.totalCalories = updatedAnalysis.totalCalories;
        data.totalProtein = updatedAnalysis.totalProtein;
        data.totalCarbs = updatedAnalysis.totalCarbs;
        data.totalFat = updatedAnalysis.totalFat;
        setEditableFoods(updatedAnalysis.detectedFoods.map(initializeEditableFood));
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/streak'] });
      setShowVoiceMealDialog(false);
      setVoiceInput('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to add food from voice. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding voice food:", error);
    },
  });

  const handleConfirmVoiceFood = () => {
    if (!voiceInput.trim()) return;
    addVoiceMealMutation.mutate({
      foodDescription: voiceInput.trim()
    });
  };

  const addToDiaryMutation = useMutation({
    mutationFn: async () => {
      console.log("🍽️ Adding to diary - Starting...");
      console.log("  Analysis data:", {
        id: data.id,
        hasImageUrl: !!data.imageUrl,
        confidence: data.confidence,
        foodsCount: editableFoods.length
      });
      
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
      
      const requestBody = {
        analysisId: data.id,
        mealType: selectedMealType,
        mealDate: mealDateTime.toISOString(),
        notes: "",
        modifiedAnalysis // Send the modified data
      };
      
      console.log("  Request body:", requestBody);
      
      const response = await apiRequest('POST', '/api/diary', requestBody);
      
      console.log("  Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("  Response error:", errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to save to diary`);
      }
      
      const result = await response.json();
      console.log("✅ Successfully added to diary:", result);
      return result;
    },
    onSuccess: () => {
      soundService.playSuccess();
      // Update streak when diary entry is saved
      const streakData = updateStreak();
      
      toast({
        title: "Added to Diary!",
        description: `Your meal has been saved to your food diary. ${streakData.currentStreak > 0 ? `Streak: ${streakData.currentStreak} days!` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/streak'] });
      setShowDiaryDialog(false);
      
      // Trigger a re-render of the StreakCounter component
      window.dispatchEvent(new Event('streakUpdated'));
    },
    onError: (error: Error) => {
      console.error("❌ Error adding to diary - Full error:", error);
      console.error("  Error message:", error.message);
      console.error("  Error stack:", error.stack);
      
      toast({
        title: "Error Adding to Diary",
        description: error.message || "Failed to save meal to diary. Please try again.",
        variant: "destructive",
      });
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
    <motion.div 
      className="p-4 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Back Button */}
      <motion.div 
        className="flex items-center mb-4"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <button 
          onClick={onScanAnother}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted/30 rounded-xl"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Camera</span>
        </button>
      </motion.div>
      
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
      
      {/* Editing Instructions */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <strong>💡 Tip:</strong> Click the pencil icon <Edit3 className="h-3 w-3 inline mx-1" /> next to food names or portions to edit them. Nutrition values will update automatically!
        </AlertDescription>
      </Alert>
      {/* Beautiful Header with Purple Gradient */}
      <motion.div 
        className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-3xl p-6 shadow-2xl border border-purple-400/30"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          boxShadow: [
            "0 20px 25px -5px rgba(147, 51, 234, 0.3), 0 10px 10px -5px rgba(147, 51, 234, 0.2)",
            "0 20px 25px -5px rgba(147, 51, 234, 0.5), 0 10px 10px -5px rgba(147, 51, 234, 0.4)",
            "0 20px 25px -5px rgba(147, 51, 234, 0.3), 0 10px 10px -5px rgba(147, 51, 234, 0.2)",
          ]
        }}
        transition={{ 
          duration: 0.5,
          delay: 0.2,
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm relative ring-2 ring-white/20">
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
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white/80" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-xl text-white drop-shadow-md" data-testid="text-meal-title">
                Analysis Complete
              </h3>
              <p className="text-white/80 text-sm" data-testid="text-timestamp">
                {formatTime(data.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <button 
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              data-testid="button-share"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button 
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              data-testid="button-bookmark"
            >
              <Bookmark className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Confidence Badge */}
        <div 
          data-testid="text-confidence" 
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full font-semibold shadow-lg ${
            data.isAITemporarilyUnavailable 
              ? 'bg-amber-400 text-amber-900'
              : 'bg-white text-purple-600'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>
            {data.isAITemporarilyUnavailable ? 'Estimated values' : `${data.confidence}% confidence`}
          </span>
        </div>
      </motion.div>

      {/* Detected Foods - Beautiful Cream/Beige Cards */}
      <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/10 dark:via-amber-900/10 dark:to-yellow-900/10 rounded-3xl shadow-xl p-6 border border-orange-200/30 dark:border-orange-700/30">
        <h3 className="text-xl font-bold mb-6 flex items-center text-gray-800 dark:text-gray-100">
          <Utensils className="text-orange-600 dark:text-orange-400 mr-3 h-6 w-6" />
          Food Items Detected
        </h3>
        
        <div className="space-y-3">
          {editableFoods.map((food, index) => (
            <div 
              key={index}
              className={`p-4 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg ${
                editingIndex === index 
                  ? 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-400 dark:border-blue-500 scale-[1.02]' 
                  : 'bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-900/20 border border-orange-100 dark:border-orange-800/30'
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingIndex(null);
                          } else if (e.key === 'Escape') {
                            setEditableFoods(data.detectedFoods.map(initializeEditableFood));
                            setEditingIndex(null);
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background font-medium"
                        placeholder="e.g., Jacket Potato with Ham and Cheese"
                        data-testid={`input-food-name-${index}`}
                      />
                    ) : (
                      <div className="flex items-center space-x-1.5">
                        <p className="font-medium" data-testid={`text-food-name-${index}`}>
                          {food.name}
                        </p>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingIndex(index);
                          }}
                          className="inline-flex items-center justify-center rounded-md h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          title="Edit food name"
                          data-testid={`button-edit-name-${index}`}
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 mt-3">
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2 block">
                          📏 Portion Size
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={parsePortionString(food.portion).value}
                            onChange={(e) => updateFoodPortionValue(index, parseFloat(e.target.value) || 0)}
                            className="flex-1 px-4 py-3 text-base font-medium border-2 border-orange-300 dark:border-orange-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white dark:bg-gray-800 transition-all shadow-sm"
                            placeholder="100"
                            min="0"
                            step="any"
                            data-testid={`input-food-portion-value-${index}`}
                          />
                          <select
                            value={food.baselinePortionUnit}
                            onChange={(e) => updateFoodPortionUnit(index, e.target.value)}
                            className="px-3 py-3 text-base font-medium border-2 border-orange-300 dark:border-orange-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white dark:bg-gray-800 transition-all shadow-sm"
                            data-testid={`select-food-portion-unit-${index}`}
                          >
                            <option value="g">g</option>
                            <option value="oz">oz</option>
                            <option value="lb">lb</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                            <option value="cup">cup</option>
                            <option value="tbsp">tbsp</option>
                            <option value="tsp">tsp</option>
                            <option value="serving">serving</option>
                            <option value="slice">slice</option>
                            <option value="piece">piece</option>
                            <option value="item">item</option>
                          </select>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Enter amount and unit to adjust calories</p>
                      </div>
                      <button
                        onClick={() => removeFoodItem(index)}
                        className="mt-8 p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Remove this food item"
                        data-testid={`button-remove-food-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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

        {/* Add Missing Foods - Beautiful Light Design */}
        <div className="mt-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-orange-900/20 rounded-3xl p-6 shadow-lg border-2 border-purple-200/50 dark:border-purple-700/50">
          {/* Header with Instructions */}
          <div className="text-center mb-6">
            <h3 className="text-purple-700 dark:text-purple-300 text-lg font-bold mb-2">Add Missing Foods</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              AI might miss some items in your meal
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            {/* Voice Add Button */}
            <button
              onClick={handleVoiceInput}
              disabled={!speechSupported}
              className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 border-2 transition-all duration-300 shadow-md hover:scale-105 font-semibold ${
                isListening
                  ? 'bg-gradient-to-br from-red-500 to-pink-500 text-white border-red-400 animate-pulse shadow-xl'
                  : speechSupported
                  ? 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900 text-purple-700 dark:text-purple-200 border-purple-300 dark:border-purple-600 hover:from-purple-200 hover:to-purple-300 hover:shadow-purple-500/25'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-300 dark:border-gray-600'
              }`}
              data-testid="button-add-voice"
            >
              {isListening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
              <span>{isListening ? 'Stop' : 'Voice Add'}</span>
            </button>
            
            {/* Type Button */}
            <button
              onClick={() => addNewFoodItem()}
              className="flex-1 bg-gradient-to-br from-white to-orange-50 dark:from-gray-700 dark:to-orange-900/30 text-gray-800 dark:text-gray-100 py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 shadow-md hover:scale-105 transition-all duration-300 hover:shadow-lg border-2 border-orange-200 dark:border-orange-700"
              data-testid="button-add-type"
            >
              <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-semibold">Type</span>
            </button>
          </div>
        </div>
        

        {/* Save Changes Button - Beautiful Modern Design */}
        {hasChanges() && (
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => saveChanges()}
              disabled={saveChangesMutation.isPending}
              className="flex-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-bold transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-xl hover:shadow-2xl disabled:shadow-none flex items-center justify-center space-x-2 border-2 border-green-400/30"
              data-testid="button-save-changes"
            >
              {saveChangesMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
            <button
              onClick={() => resetChanges()}
              className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-300 py-4 px-6 rounded-2xl font-bold hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-gray-300 dark:border-gray-600"
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

      {/* Voice Meal Confirmation Dialog */}
      {showVoiceMealDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/20">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              Voice Input Captured
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  What did I hear?
                </label>
                <div className="p-3 bg-muted rounded-lg border">
                  <p className="text-foreground font-medium">"{voiceInput}"</p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>This will be added to your current meal analysis.</p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowVoiceMealDialog(false);
                  setVoiceInput('');
                }}
                className="flex-1 py-2 px-4 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                data-testid="button-cancel-voice"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoiceFood}
                disabled={addVoiceMealMutation.isPending}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                data-testid="button-confirm-voice"
              >
                {addVoiceMealMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Add Food</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Low Confidence Warning Dialog */}
      {showLowConfidenceDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-white via-orange-50 to-red-50 dark:from-gray-900 dark:via-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-orange-200/50 dark:border-orange-700/50 animate-in slide-in-from-bottom-4 duration-300">
            
            {/* Warning Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg mb-4">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Low Confidence Detection
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                AI confidence: <span className="font-semibold text-orange-600 dark:text-orange-400">{data.confidence}%</span>
              </p>
            </div>
            
            {/* Warning Content */}
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl border border-orange-200 dark:border-orange-700">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-800 dark:text-orange-200">
                    <p className="font-medium mb-1">The AI is less confident about this analysis.</p>
                    <p>Please review the detected foods and portions. You can edit them before saving to your diary.</p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Tip: Taking photos with better lighting and closer angles helps improve accuracy.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLowConfidenceDialog(false)}
                className="flex-1 py-3 px-4 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-xl font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md border border-orange-200 dark:border-orange-700"
                data-testid="button-review-foods"
              >
                <Edit3 className="h-4 w-4 mr-2 inline" />
                Review & Edit
              </button>
              <button
                onClick={() => {
                  setShowLowConfidenceDialog(false);
                  setShowDiaryDialog(true);
                }}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                data-testid="button-proceed-anyway"
              >
                <Check className="h-4 w-4 mr-2 inline" />
                Use Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
