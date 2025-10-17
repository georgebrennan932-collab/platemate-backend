import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { Calendar, Save, Target, Camera, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWeightEntrySchema } from "@shared/schema";

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

interface WeightFormProps {
  onSuccess?: () => void;
  compact?: boolean;
}

export function WeightForm({ onSuccess, compact = false }: WeightFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [progressPhoto, setProgressPhoto] = useState<File | null>(null);
  const [progressPhotoPreview, setProgressPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<WeightFormData>({
    resolver: zodResolver(weightFormSchema),
    defaultValues: {
      weight: 0,
      unit: "kg",
      loggedAt: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProgressPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProgressPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setProgressPhoto(null);
    setProgressPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createWeightMutation = useMutation({
    mutationFn: async (data: WeightFormData) => {
      // Convert weight to grams based on unit
      const weightInGrams = data.unit === "kg" 
        ? Math.round(data.weight * 1000) 
        : Math.round(data.weight * 453.592); // 1 lb = 453.592g

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('weightGrams', weightInGrams.toString());
      formData.append('loggedAt', data.loggedAt.toString());
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      if (progressPhoto) {
        formData.append('progressPhoto', progressPhoto);
      }

      return fetch('/api/weights', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to save weight entry');
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Weight Logged",
        description: "Your weight entry has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/weights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/streak'] });
      
      // Reset form with proper default values - delay to avoid validation conflicts
      setTimeout(() => {
        form.reset({
          weight: 0,
          unit: "kg", 
          loggedAt: format(new Date(), "yyyy-MM-dd"),
          notes: "",
        });
        setUnit("kg"); // Sync unit state with form
        handleRemovePhoto(); // Clear progress photo
      }, 100);
      
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save weight entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WeightFormData) => {
    createWeightMutation.mutate(data);
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
    <div className={compact ? "space-y-3" : "bg-card border rounded-xl p-6"}>
      {!compact && (
        <div className="flex items-center space-x-2 mb-4">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium">Log Today's Weight</h3>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className={compact ? "space-y-3" : "space-y-4"}>
        {/* Date Input */}
        <div className="space-y-2">
          <Label htmlFor="loggedAt" data-testid="label-log-date">Date</Label>
          <div className="relative">
            <Input
              id="loggedAt"
              type="date"
              {...form.register("loggedAt")}
              className="pr-10"
              data-testid="input-log-date"
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          {form.formState.errors.loggedAt && (
            <p className="text-sm text-red-500" data-testid="error-log-date">
              {form.formState.errors.loggedAt.message}
            </p>
          )}
        </div>

        {/* Weight Input with Unit Selector */}
        <div className="space-y-2">
          <Label htmlFor="weight" data-testid="label-weight">Weight</Label>
          <div className="flex space-x-2">
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              placeholder={`Enter weight in ${unit}`}
              {...form.register("weight", { valueAsNumber: true })}
              className="flex-1"
              data-testid="input-weight"
              onFocus={(e) => {
                if (e.target.value === "0") {
                  e.target.value = "";
                }
              }}
            />
            <Select value={unit} onValueChange={handleUnitChange}>
              <SelectTrigger className="w-20" data-testid="select-weight-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lb">lb</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.formState.errors.weight && (
            <p className="text-sm text-red-500" data-testid="error-weight">
              {form.formState.errors.weight.message}
            </p>
          )}
        </div>

        {/* Notes Input */}
        <div className="space-y-2">
          <Label htmlFor="notes" data-testid="label-notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add notes about your weigh-in..."
            {...form.register("notes")}
            rows={3}
            data-testid="input-notes"
          />
          {form.formState.errors.notes && (
            <p className="text-sm text-red-500" data-testid="error-notes">
              {form.formState.errors.notes.message}
            </p>
          )}
        </div>

        {/* Progress Photo Upload */}
        <div className="space-y-2">
          <Label data-testid="label-progress-photo">Progress Photo (Optional)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Add a photo to track your visual progress
          </p>
          
          {progressPhotoPreview ? (
            <div className="relative inline-block">
              <img 
                src={progressPhotoPreview} 
                alt="Progress preview" 
                className="w-full max-w-xs h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                data-testid="img-progress-preview"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                data-testid="button-remove-photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
                data-testid="input-photo-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
                data-testid="button-take-photo"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="flex-1"
                data-testid="button-upload-photo"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pt-4 mt-6 -mx-6 -mb-6 px-6 pb-6 z-50 shadow-lg">
          <Button
            type="submit"
            disabled={createWeightMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-md transition-colors"
            data-testid="button-save-weight"
          >
            {createWeightMutation.isPending ? (
              <span className="text-white">Saving...</span>
            ) : (
              <span className="flex items-center justify-center text-white">
                <Save className="h-4 w-4 mr-2" />
                Save Weight Entry
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}