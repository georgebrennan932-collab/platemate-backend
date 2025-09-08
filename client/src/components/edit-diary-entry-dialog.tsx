import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Edit2, Save, X, Clock, Type, FileText } from "lucide-react";
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

  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      await apiRequest("PATCH", `/api/diary/${entry.id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Entry Updated",
        description: "Your meal entry has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/diary"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update entry. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating diary entry:", error);
    },
  });

  const handleSave = () => {
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