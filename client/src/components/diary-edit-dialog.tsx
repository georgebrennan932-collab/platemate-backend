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
    console.log("🔄 Form submitted:", data);
    console.log("📝 Portion input value:", portionInput);
    
    // Commit any uncommitted portion input before submitting
    const portionValue = parseInt(portionInput) || 100;
    const clampedValue = Math.max(10, Math.min(500, portionValue));
    
    console.log("✅ Final portion value:", clampedValue);
    
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
      <DialogContent className="max-w-sm">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center space-x-2 text-base">
            <Utensils className="h-4 w-4" />
            <span>Edit Meal Entry</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Adjust portion size, meal type, or add notes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(
          onSubmit,
          (errors) => {
            console.error("❌ Form validation errors:", errors);
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: "Please check all fields and try again.",
            });
          }
        )} className="space-y-3">
          {/* Compact Portion Size */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Portion Size</Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={portionInput}
                  onChange={(e) => {
                    setPortionInput(e.target.value);
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value) || 100;
                    const clampedValue = Math.max(10, Math.min(500, value));
                    form.setValue("portionMultiplier", clampedValue);
                    setPortionInput(clampedValue.toString());
                  }}
                  min={10}
                  max={500}
                  step={10}
                  className="w-16 px-2 py-0.5 text-sm border rounded text-center dark:bg-gray-800 dark:border-gray-700"
                  data-testid="input-portion-value"
                />
                <span className="text-sm font-bold text-primary">{portionDisplay}x</span>
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
              className="w-full h-6"
              data-testid="slider-portion"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground -mt-1">
              <span>0.1x (10%)</span>
              <span>1.0x (100%)</span>
              <span>5.0x (500%)</span>
            </div>
          </div>

          {/* Inline Nutrition Preview */}
          {previewNutrition && (
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-xs font-medium mb-1.5">Adjusted Nutrition:</p>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div>
                  <div className="text-sm font-bold text-orange-600">{previewNutrition.calories}</div>
                  <div className="text-[10px] text-muted-foreground">cal</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-blue-600">{previewNutrition.protein}g</div>
                  <div className="text-[10px] text-muted-foreground">protein</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-yellow-600">{previewNutrition.carbs}g</div>
                  <div className="text-[10px] text-muted-foreground">carbs</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-green-600">{previewNutrition.fat}g</div>
                  <div className="text-[10px] text-muted-foreground">fat</div>
                </div>
              </div>
            </div>
          )}

          {/* Compact Meal Type */}
          <div className="space-y-1">
            <Label className="text-sm">Meal Type</Label>
            <Select
              value={form.watch("mealType")}
              onValueChange={(value) => form.setValue("mealType", value as any)}
            >
              <SelectTrigger className="h-8 text-sm" data-testid="select-meal-type">
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
            <div className="space-y-1">
              <Label className="text-sm">Custom Meal Name</Label>
              <input
                {...form.register("customMealName")}
                placeholder="e.g., Brunch"
                className="w-full px-2 py-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                data-testid="input-custom-meal-name"
              />
            </div>
          )}

          {/* Compact Notes */}
          <div className="space-y-1">
            <Label className="text-sm">Notes (Optional)</Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Add notes..."
              rows={2}
              className="text-sm resize-none"
              data-testid="textarea-notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-8 text-sm"
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateDiaryMutation.isPending}
              className="flex-1 h-8 text-sm bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
              data-testid="button-save-edit"
            >
              {updateDiaryMutation.isPending ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
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
