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

// Helper function to parse portion into number and unit (first word only)
function parsePortion(portion: string): { amount: number; unit: string } {
  if (!portion) return { amount: 1, unit: "serving" };
  
  // Extract number and first word only as unit (e.g., "4 biscuits ..." => amount: 4, unit: "biscuits")
  const match = portion.match(/^([\d.]+)\s+(\w+)/);
  if (match) {
    return {
      amount: parseFloat(match[1]) || 1,
      unit: match[2].trim() || "serving"
    };
  }
  return { amount: 1, unit: "serving" };
}

export function EditDiaryEntryDialog({ entry }: EditDiaryEntryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  // Get first food item for display
  const firstFood = entry.analysis?.detectedFoods?.[0];
  const foodName = firstFood?.name || "Food Item";
  
  // Parse portion into number and unit
  const originalPortion = firstFood?.portion || "1 serving";
  const { amount: initialAmount, unit } = parsePortion(originalPortion);
  
  const [mealDate, setMealDate] = useState(
    format(new Date(entry.mealDate), "yyyy-MM-dd'T'HH:mm")
  );
  const [notes, setNotes] = useState(entry.notes || "");
  const [portionAmount, setPortionAmount] = useState(initialAmount.toString());

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
    // Combine amount and unit for the new portion
    const newPortion = `${portionAmount} ${unit}`.trim();
    
    // If serving size changed, trigger fresh AI analysis (like adding new meal)
    if (portionAmount.trim() && entry.analysis) {
      try {
        toast({
          title: "Re-analyzing food...",
          description: "Getting fresh nutrition analysis",
        });

        // Extract original food description from notes (e.g., "Added via text input: \"four Weetabix\"")
        // Or use the unit as base food name (e.g., "biscuits" from "4 biscuits")
        let baseFoodName = unit; // Fallback to unit
        
        if (entry.notes && entry.notes.includes('Added via text input:')) {
          const match = entry.notes.match(/Added via text input:\s*"(.+?)"/);
          if (match && match[1]) {
            baseFoodName = match[1]; // Use original input like "four Weetabix"
          }
        }
        
        // Build food description for AI with new portion (e.g., "2 weetabix")
        const foodDescription = `${portionAmount} ${baseFoodName}`.trim();
        console.log("🔄 Sending to AI for fresh analysis:", foodDescription);

        const response = await apiRequest("POST", "/api/analyze-text", {
          foodDescription
        });
        
        const newAnalysis = await response.json();
        console.log("✅ Fresh AI analysis received:", newAnalysis);
        
        if (newAnalysis && newAnalysis.id) {
          // Update diary entry to use new analysis ID and delete old one
          const updateData: any = {
            mealType: entry.mealType,
            mealDate: new Date(mealDate).toISOString(),
            notes: notes.trim() || undefined,
            analysisId: newAnalysis.id,
            deleteOldAnalysisId: entry.analysis.id // Signal backend to clean up old analysis
          };
          
          updateMutation.mutate(updateData);
          queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
        }
      } catch (error) {
        console.error("Failed to re-analyze:", error);
        toast({
          title: "Re-analysis Failed",
          description: "Could not get fresh nutrition analysis",
          variant: "destructive",
        });
      }
    } else {
      // No serving size change, just update date/notes
      const updateData: any = {
        mealType: entry.mealType,
        mealDate: new Date(mealDate).toISOString(),
        notes: notes.trim() || undefined,
      };

      updateMutation.mutate(updateData);
    }
  };

  const resetForm = () => {
    setMealDate(format(new Date(entry.mealDate), "yyyy-MM-dd'T'HH:mm"));
    setNotes(entry.notes || "");
    setPortionAmount(initialAmount.toString());
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
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Edit Meal Entry</DialogTitle>
          <DialogDescription>Update the serving size, time, or notes for this meal</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Food Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Salad className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {foodName}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {firstFood?.portion || "Serving"}
              </p>
            </div>
          </div>

          {/* Serving Size */}
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Serving Size
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                min="0.1"
                value={portionAmount}
                onChange={(e) => setPortionAmount(e.target.value)}
                className="text-base w-20 text-center"
                data-testid="input-portion-amount"
              />
              <span className="text-base text-gray-700 dark:text-gray-300 font-medium">
                {unit}
              </span>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Date & Time
            </h3>
            <Input
              id="meal-date"
              type="datetime-local"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              className="text-sm"
              data-testid="input-meal-date"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes (Optional)
            </h3>
            <Textarea
              id="notes"
              placeholder="Add any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-sm"
              data-testid="input-notes"
            />
          </div>
        </div>

        {/* Buttons - Fixed at bottom */}
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <Button
            onClick={() => setOpen(false)}
            variant="outline"
            className="flex-1"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white"
            data-testid="button-save"
          >
            {updateMutation.isPending ? "Saving..." : "Add to Diary"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}