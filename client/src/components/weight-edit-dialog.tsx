import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWeightEntrySchema, type WeightEntry } from "@shared/schema";

// Form schema with unit-aware validation (omit server-side fields)
const weightFormSchema = insertWeightEntrySchema.extend({
  weight: z.number().min(1, "Weight must be greater than 0"),
  unit: z.enum(["kg", "lb"]).default("kg"),
}).omit({ 
  weightGrams: true, // Remove weightGrams since we'll calculate it
  userId: true, // Remove userId since it's added server-side
}).refine((data) => {
  // Unit-aware validation
  if (data.unit === "kg") {
    return data.weight >= 20 && data.weight <= 300;
  } else { // lb
    return data.weight >= 44 && data.weight <= 660; // 20-300kg in lb
  }
}, {
  message: "Weight must be reasonable for the selected unit",
  path: ["weight"],
});

type WeightFormData = z.infer<typeof weightFormSchema>;

interface WeightEditDialogProps {
  entry: WeightEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function WeightEditDialog({ entry, open, onOpenChange, onSuccess }: WeightEditDialogProps) {
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form with current entry data
  const form = useForm<WeightFormData>({
    resolver: zodResolver(weightFormSchema),
    defaultValues: {
      weight: 0,
      unit: "kg",
      loggedAt: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  // Update form when entry changes
  useEffect(() => {
    if (entry) {
      // Default to kg display (could be made user preference later)
      const displayWeight = Math.round((entry.weightGrams / 1000) * 10) / 10; // Convert to kg
      const displayUnit = "kg";
      
      form.reset({
        weight: displayWeight,
        unit: displayUnit,
        loggedAt: format(new Date(entry.loggedAt), "yyyy-MM-dd"),
        notes: entry.notes || "",
      });
      setUnit(displayUnit);
    }
  }, [entry, form]);

  const updateWeightMutation = useMutation({
    mutationFn: async (data: WeightFormData) => {
      if (!entry) throw new Error("No entry to update");
      
      // Calculate weight in grams for storage
      const weightGrams = data.unit === "kg" 
        ? Math.round(data.weight * 1000)
        : Math.round(data.weight * 453.592);

      const updateData = {
        weightGrams,
        loggedAt: data.loggedAt,
        notes: data.notes || null,
      };

      return apiRequest("PATCH", `/api/weights/${entry.id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Weight entry updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/weights'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update weight entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WeightFormData) => {
    updateWeightMutation.mutate(data);
  };

  const handleUnitChange = (newUnit: "kg" | "lb") => {
    const currentWeight = form.getValues("weight");
    
    // Only convert if units are actually different and weight is valid
    if (currentWeight > 0 && unit !== newUnit) {
      const convertedWeight = unit === "kg" && newUnit === "lb"
        ? currentWeight * 2.20462 // kg to lb
        : unit === "lb" && newUnit === "kg"
        ? currentWeight * 0.453592 // lb to kg
        : currentWeight; // fallback - no conversion
      
      form.setValue("weight", Math.round(convertedWeight * 10) / 10);
    }
    
    // Update unit state
    setUnit(newUnit);
    form.setValue("unit", newUnit);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Scale className="h-5 w-5 text-blue-600" />
            <span>Edit Weight Entry</span>
          </DialogTitle>
          <DialogDescription>
            Update your weight entry details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Date Input */}
          <div className="space-y-2">
            <Label htmlFor="loggedAt" data-testid="label-edit-date">Date</Label>
            <div className="relative">
              <Input
                id="loggedAt"
                type="date"
                {...form.register("loggedAt")}
                className="pr-10"
                data-testid="input-edit-date"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {form.formState.errors.loggedAt && (
              <p className="text-sm text-red-500" data-testid="error-edit-date">
                {form.formState.errors.loggedAt.message}
              </p>
            )}
          </div>

          {/* Weight Input */}
          <div className="space-y-2">
            <Label htmlFor="weight" data-testid="label-edit-weight">Weight</Label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="Enter weight"
                  {...form.register("weight", { valueAsNumber: true })}
                  className="pr-12"
                  data-testid="input-edit-weight"
                />
              </div>
              <Select value={unit} onValueChange={handleUnitChange}>
                <SelectTrigger className="w-20" data-testid="select-edit-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lb">lb</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.formState.errors.weight && (
              <p className="text-sm text-red-500" data-testid="error-edit-weight">
                {form.formState.errors.weight.message}
              </p>
            )}
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes" data-testid="label-edit-notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about your weigh-in..."
              {...form.register("notes")}
              rows={3}
              data-testid="input-edit-notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateWeightMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateWeightMutation.isPending ? "Updating..." : "Update Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}