import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Utensils, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { updateDiaryEntrySchema, type DiaryEntryWithAnalysis } from "@shared/schema";

// Form schema for diary editing
const diaryEditFormSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "custom"]),
  portionMultiplier: z.number().int().min(10).max(500), // 10% to 500% (0.1x to 5x)
  notes: z.string().optional(),
  customMealName: z.string().optional(),
});

type DiaryEditFormData = z.infer<typeof diaryEditFormSchema>;

interface DiaryEditDialogProps {
  entry: DiaryEntryWithAnalysis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DiaryEditDialog({ entry, open, onOpenChange, onSuccess }: DiaryEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for portion input to allow typing without immediate clamping
  const [portionInput, setPortionInput] = useState<string>("100");

  // Initialize form with current entry data
  const form = useForm<DiaryEditFormData>({
    resolver: zodResolver(diaryEditFormSchema),
    defaultValues: {
      mealType: "breakfast",
      portionMultiplier: 100, // 1.0x
      notes: "",
      customMealName: "",
    },
  });

  // Update form when entry changes
  useEffect(() => {
    if (entry) {
      const portionValue = entry.portionMultiplier || 100;
      form.reset({
        mealType: entry.mealType as "breakfast" | "lunch" | "dinner" | "snack" | "custom",
        portionMultiplier: portionValue,
        notes: entry.notes || "",
        customMealName: entry.customMealName || "",
      });
      setPortionInput(portionValue.toString());
    }
  }, [entry, form]);

  const updateDiaryMutation = useMutation({
    mutationFn: async (data: DiaryEditFormData) => {
      if (!entry) throw new Error("No entry to update");
      
      const updateData = {
        mealType: data.mealType,
        portionMultiplier: data.portionMultiplier,
        notes: data.notes || null,
        customMealName: data.mealType === "custom" ? data.customMealName : null,
      };

      return apiRequest("PATCH", `/api/diary/${entry.id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Meal entry updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Diary update error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update meal entry.",
      });
    },
  });

  const onSubmit = (data: DiaryEditFormData) => {
    // Commit any uncommitted portion input before submitting
    const portionValue = parseInt(portionInput) || 100;
    const clampedValue = Math.max(10, Math.min(500, portionValue));
    
    updateDiaryMutation.mutate({
      ...data,
      portionMultiplier: clampedValue,
    });
  };

  const portionValue = form.watch("portionMultiplier");
  const portionDisplay = (portionValue / 100).toFixed(1);

  // Calculate multiplied nutrition values for preview
  const previewNutrition = entry ? {
    calories: Math.round((entry.analysis?.totalCalories || 0) * (portionValue / 100)),
    protein: Math.round((entry.analysis?.totalProtein || 0) * (portionValue / 100)),
    carbs: Math.round((entry.analysis?.totalCarbs || 0) * (portionValue / 100)),
    fat: Math.round((entry.analysis?.totalFat || 0) * (portionValue / 100)),
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Utensils className="h-5 w-5" />
            <span>Edit Meal Entry</span>
          </DialogTitle>
          <DialogDescription>
            Adjust portion size, meal type, or add notes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Portion Size Slider and Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Portion Size</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={portionInput}
                  onChange={(e) => {
                    // Allow typing freely
                    setPortionInput(e.target.value);
                  }}
                  onBlur={(e) => {
                    // Validate and clamp on blur
                    const value = parseInt(e.target.value) || 100;
                    const clampedValue = Math.max(10, Math.min(500, value));
                    form.setValue("portionMultiplier", clampedValue);
                    setPortionInput(clampedValue.toString());
                  }}
                  min={10}
                  max={500}
                  step={10}
                  className="w-20 px-2 py-1 text-sm border rounded-md text-center dark:bg-gray-800 dark:border-gray-700"
                  data-testid="input-portion-value"
                />
                <span className="text-lg font-bold text-primary">{portionDisplay}x</span>
              </div>
            </div>
            <Slider
              value={[portionValue]}
              onValueChange={(values) => {
                form.setValue("portionMultiplier", values[0]);
                setPortionInput(values[0].toString());
              }}
              min={10}
              max={500}
              step={10}
              className="w-full"
              data-testid="slider-portion"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1x (10%)</span>
              <span>1.0x (100%)</span>
              <span>5.0x (500%)</span>
            </div>
          </div>

          {/* Nutrition Preview */}
          {previewNutrition && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Adjusted Nutrition:</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div>
                  <div className="font-bold text-orange-600">{previewNutrition.calories}</div>
                  <div className="text-xs text-muted-foreground">cal</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">{previewNutrition.protein}g</div>
                  <div className="text-xs text-muted-foreground">protein</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-600">{previewNutrition.carbs}g</div>
                  <div className="text-xs text-muted-foreground">carbs</div>
                </div>
                <div>
                  <div className="font-bold text-green-600">{previewNutrition.fat}g</div>
                  <div className="text-xs text-muted-foreground">fat</div>
                </div>
              </div>
            </div>
          )}

          {/* Meal Type */}
          <div className="space-y-2">
            <Label>Meal Type</Label>
            <Select
              value={form.watch("mealType")}
              onValueChange={(value) => form.setValue("mealType", value as any)}
            >
              <SelectTrigger data-testid="select-meal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                <SelectItem value="lunch">☀️ Lunch</SelectItem>
                <SelectItem value="dinner">🌙 Dinner</SelectItem>
                <SelectItem value="snack">🍎 Snack</SelectItem>
                <SelectItem value="custom">✨ Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Meal Name (if custom type selected) */}
          {form.watch("mealType") === "custom" && (
            <div className="space-y-2">
              <Label>Custom Meal Name</Label>
              <input
                {...form.register("customMealName")}
                placeholder="e.g., Brunch, Late Night Snack"
                className="w-full px-3 py-2 border rounded-md"
                data-testid="input-custom-meal-name"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Add any notes about this meal..."
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateDiaryMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
              data-testid="button-save-edit"
            >
              {updateDiaryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
