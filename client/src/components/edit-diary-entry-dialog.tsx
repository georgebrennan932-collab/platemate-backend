import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Edit2, Save, X, Clock, Type, FileText, UtensilsCrossed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DiaryEntryWithAnalysis } from "@shared/schema";

interface EditDiaryEntryDialogProps {
  entry: DiaryEntryWithAnalysis;
}

export function EditDiaryEntryDialog({ entry }: EditDiaryEntryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const [mealType, setMealType] = useState(entry.mealType || "lunch");
  const [mealDate, setMealDate] = useState(
    format(new Date(entry.mealDate), "yyyy-MM-dd'T'HH:mm")
  );
  const [notes, setNotes] = useState(entry.notes || "");
  const [customMealName, setCustomMealName] = useState("");
  
  // Food portions state - initialize from analysis
  const [foodPortions, setFoodPortions] = useState<{[key: number]: string}>(
    entry.analysis?.detectedFoods?.reduce((acc, food, index) => ({
      ...acc,
      [index]: food.portion
    }), {}) || {}
  );

  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      console.log("🔄 Attempting to update entry:", {
        entryId: entry.id,
        updateData,
        url: `/api/diary/${entry.id}`
      });
      
      try {
        const response = await apiRequest("PATCH", `/api/diary/${entry.id}`, updateData);
        const result = await response.json();
        console.log("✅ Update successful:", result);
        return result;
      } catch (error) {
        console.error("❌ Update failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("🎉 Mutation success callback triggered");
      toast({
        title: "Entry Updated",
        description: "Your meal entry has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/diary"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      console.error("💥 Mutation error callback triggered:", error);
      
      // Extract more specific error information
      let errorMessage = "Failed to update entry. Please try again.";
      if (error.message) {
        // Check if it's a network error or API error
        if (error.message.includes("401")) {
          errorMessage = "Please log in again to continue.";
        } else if (error.message.includes("403")) {
          errorMessage = "You don't have permission to edit this entry.";
        } else if (error.message.includes("404")) {
          errorMessage = "Entry not found. It may have been deleted.";
        } else if (error.message.includes("400")) {
          errorMessage = "Invalid data. Please check your input.";
        } else {
          errorMessage = `Update failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    // First, check if food portions changed and update analysis if needed
    const originalPortions = entry.analysis?.detectedFoods?.map(f => f.portion) || [];
    const portionsChanged = Object.keys(foodPortions).some((index) => 
      foodPortions[parseInt(index)] !== originalPortions[parseInt(index)]
    );

    if (portionsChanged && entry.analysis) {
      try {
        // Calculate updated nutrition based on new portions
        const updatedFoods = entry.analysis.detectedFoods.map((food, index) => {
          const newPortion = foodPortions[index] || food.portion;
          
          // Extract numeric multiplier from portions
          const getMultiplier = (original: string, updated: string): number => {
            const originalMatch = original.match(/\d+(\.\d+)?/);
            const updatedMatch = updated.match(/\d+(\.\d+)?/);
            
            if (originalMatch && updatedMatch) {
              return parseFloat(updatedMatch[0]) / parseFloat(originalMatch[0]);
            }
            return 1;
          };
          
          const multiplier = getMultiplier(food.portion, newPortion);
          
          return {
            ...food,
            portion: newPortion,
            calories: Math.round(food.calories * multiplier),
            protein: Math.round(food.protein * multiplier * 10) / 10,
            carbs: Math.round(food.carbs * multiplier * 10) / 10,
            fat: Math.round(food.fat * multiplier * 10) / 10,
          };
        });

        // Update food analysis
        await apiRequest("PATCH", `/api/analyses/${entry.analysis.id}`, {
          detectedFoods: updatedFoods
        });
        
        // Invalidate analyses cache
        queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      } catch (error) {
        console.error("Failed to update food portions:", error);
        toast({
          title: "Portion Update Failed",
          description: "Could not update food portions. Other changes will still be saved.",
          variant: "destructive",
        });
        // Continue to update diary entry even if portion update fails
      }
    }

    // Update diary entry metadata
    const updateData: any = {
      mealType,
      mealDate: new Date(mealDate).toISOString(),
      notes: notes.trim() || undefined,
    };

    if (mealType === "custom" && customMealName.trim()) {
      updateData.customMealName = customMealName.trim();
    }

    updateMutation.mutate(updateData);
  };

  const resetForm = () => {
    setMealType(entry.mealType || "lunch");
    setMealDate(format(new Date(entry.mealDate), "yyyy-MM-dd'T'HH:mm"));
    setNotes(entry.notes || "");
    setCustomMealName("");
    setFoodPortions(
      entry.analysis?.detectedFoods?.reduce((acc, food, index) => ({
        ...acc,
        [index]: food.portion
      }), {}) || {}
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border-blue-200 dark:border-blue-800"
          onClick={resetForm}
          data-testid="button-edit-entry"
        >
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edit Meal Entry
          </DialogTitle>
          <DialogDescription>
            Update the details of your meal entry
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Meal Type */}
          <div className="space-y-2">
            <Label htmlFor="meal-type" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Meal Type
            </Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger data-testid="select-meal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                <SelectItem value="lunch">🌞 Lunch</SelectItem>
                <SelectItem value="dinner">🌜 Dinner</SelectItem>
                <SelectItem value="snack">🍎 Snack</SelectItem>
                <SelectItem value="custom">✨ Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Meal Name */}
          {mealType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-name">Custom Meal Name</Label>
              <Input
                id="custom-name"
                placeholder="e.g., Post-workout snack"
                value={customMealName}
                onChange={(e) => setCustomMealName(e.target.value)}
                data-testid="input-custom-meal-name"
              />
            </div>
          )}

          {/* Meal Date and Time */}
          <div className="space-y-2">
            <Label htmlFor="meal-date" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Date & Time
            </Label>
            <Input
              id="meal-date"
              type="datetime-local"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              data-testid="input-meal-date"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this meal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="input-notes"
            />
          </div>

          {/* Food Portions */}
          {entry.analysis?.detectedFoods && entry.analysis.detectedFoods.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Food Portions
              </Label>
              <div className="space-y-2 p-3 rounded-md bg-muted/50">
                {entry.analysis.detectedFoods.map((food, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{food.name}</span>
                    <Input
                      type="text"
                      value={foodPortions[index] || food.portion}
                      onChange={(e) => setFoodPortions({ ...foodPortions, [index]: e.target.value })}
                      className="w-32 h-8 text-sm"
                      placeholder="e.g., 100g"
                      data-testid={`input-portion-${index}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => setOpen(false)}
            variant="outline"
            className="flex-1"
            data-testid="button-cancel"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-1" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}