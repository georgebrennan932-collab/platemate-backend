import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Edit2, Salad, Clock, FileText } from "lucide-react";
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
  
  const [mealDate, setMealDate] = useState(
    format(new Date(entry.mealDate), "yyyy-MM-dd'T'HH:mm")
  );
  const [notes, setNotes] = useState(entry.notes || "");
  const [servingSize, setServingSize] = useState(entry.notes?.match(/:\s*"([^"]+)"/)?.[1] || "");
  
  // Get first food item for display
  const firstFood = entry.analysis?.detectedFoods?.[0];
  const foodName = firstFood?.name || "Food Item";

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
    // If serving size changed, trigger re-analysis
    if (servingSize.trim() && entry.analysis) {
      try {
        toast({
          title: "Re-analyzing food...",
          description: "Calculating nutrition for new serving size",
        });

        const response = await apiRequest("POST", "/api/calculate-nutrition", {
          foods: [{ name: foodName, portion: servingSize }]
        });
        
        const nutritionData = await response.json();
        
        if (nutritionData.foods && nutritionData.foods.length > 0) {
          // Update analysis with new nutrition data
          await apiRequest("PATCH", `/api/analyses/${entry.analysis.id}`, {
            detectedFoods: nutritionData.foods
          });
          
          queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
        }
      } catch (error) {
        console.error("Failed to re-analyze:", error);
        toast({
          title: "Re-analysis Failed",
          description: "Could not calculate new nutrition values",
          variant: "destructive",
        });
      }
    }

    // Update diary entry
    const updateData: any = {
      mealType: entry.mealType,
      mealDate: new Date(mealDate).toISOString(),
      notes: notes.trim() || undefined,
    };

    updateMutation.mutate(updateData);
  };

  const resetForm = () => {
    setMealDate(format(new Date(entry.mealDate), "yyyy-MM-dd'T'HH:mm"));
    setNotes(entry.notes || "");
    setServingSize(entry.notes?.match(/:\s*"([^"]+)"/)?.[1] || "");
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
      <DialogContent className="max-w-md bg-white dark:bg-gray-900">
        <div className="space-y-6 py-4">
          {/* Food Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Salad className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {foodName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {firstFood?.portion || "Serving"}
              </p>
            </div>
          </div>

          {/* Serving Size */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Serving Size
            </h3>
            <Input
              type="text"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              placeholder="e.g., 4 biscuits, 100g, 2 slices"
              className="text-lg"
              data-testid="input-serving-size"
            />
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Date & Time
            </h3>
            <Input
              id="meal-date"
              type="datetime-local"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              className="text-base"
              data-testid="input-meal-date"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Notes (Optional)
            </h3>
            <Textarea
              id="notes"
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-base"
              data-testid="input-notes"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              size="lg"
              className="flex-1 text-base"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              size="lg"
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white text-base"
              data-testid="button-save"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}