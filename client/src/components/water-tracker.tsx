import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Droplets, Plus, Trash2, Edit } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WaterIntake, InsertWaterIntake, NutritionGoals, UserProfile } from "@shared/schema";
import { format } from "date-fns";

interface WaterTrackerProps {
  selectedDate?: Date;
}

export function WaterTracker({ selectedDate = new Date() }: WaterTrackerProps) {
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editedGoal, setEditedGoal] = useState("");

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch user's water goal
  const { data: nutritionGoals } = useQuery<NutritionGoals>({
    queryKey: ["/api/nutrition-goals"],
  });

  // Fetch user profile for health condition-based adjustments
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  // Fetch water entries for selected date
  const { data: waterEntriesData, isLoading } = useQuery<WaterIntake[]>({
    queryKey: [`/api/water/${dateStr}`],
  });

  // Ensure waterEntries is always an array
  const waterEntries = Array.isArray(waterEntriesData) ? waterEntriesData : [];

  // Calculate total consumed
  const totalConsumed = waterEntries.reduce((sum, entry) => sum + entry.amountMl, 0);

  // Calculate daily goal with medical condition adjustments
  const calculateDailyGoal = (): number => {
    const baseGoal = nutritionGoals?.dailyWater || 2500;
    
    // Check for medical conditions that restrict fluid intake
    const healthConditions = userProfile?.healthConditions?.toLowerCase() || "";
    const restrictiveConditions = [
      "kidney disease",
      "kidney failure",
      "renal",
      "heart failure",
      "cardiac",
      "fluid retention",
      "edema",
      "oedema",
      "hyponatremia"
    ];
    
    const hasRestrictiveCondition = restrictiveConditions.some(condition => 
      healthConditions.includes(condition)
    );
    
    if (hasRestrictiveCondition && baseGoal > 2000) {
      // Suggest lower goal for people with fluid restrictions
      return 1500;
    }
    
    return baseGoal;
  };

  const dailyGoal = calculateDailyGoal();
  const remaining = Math.max(0, dailyGoal - totalConsumed);
  const percentComplete = Math.min(100, (totalConsumed / dailyGoal) * 100);

  // Add water mutation
  const addWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      console.log("🚰 Mutation started:", amountMl, "for date:", dateStr);
      const entry: InsertWaterIntake = {
        userId: "", // Will be set by backend
        amountMl,
        loggedAt: new Date().toISOString(),
        loggedDate: dateStr,
      };
      console.log("🚰 Sending entry:", entry);
      const res = await apiRequest("POST", "/api/water", entry);
      const data = await res.json();
      console.log("🚰 Response:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/water/${dateStr}`] });
      setCustomAmount("");
      toast({
        title: "Fluid logged",
        description: "Your fluid intake has been recorded.",
      });
    },
    onError: (error) => {
      console.error("Failed to log water:", error);
      toast({
        title: "Error",
        description: "Failed to log fluid intake.",
        variant: "destructive",
      });
    },
  });

  // Delete water mutation
  const deleteWaterMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/water/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/water/${dateStr}`] });
      toast({
        title: "Entry deleted",
        description: "Fluid entry has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete entry.",
        variant: "destructive",
      });
    },
  });

  // Update water goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async (newGoal: number) => {
      const res = await apiRequest("POST", "/api/nutrition-goals", {
        userId: "", // Will be set by backend
        dailyWater: newGoal,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition-goals"] });
      setIsEditingGoal(false);
      setEditedGoal("");
      toast({
        title: "Goal updated",
        description: "Your daily water goal has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update water goal.",
        variant: "destructive",
      });
    },
  });

  const handleQuickAdd = (amount: number) => {
    console.log("🚰 Quick add clicked:", amount);
    addWaterMutation.mutate(amount);
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (amount && amount > 0 && amount <= 5000) {
      addWaterMutation.mutate(amount);
    } else {
      toast({
        title: "Invalid amount",
        description: "Please enter a value between 1 and 5000 ml.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteWaterMutation.mutate(id);
  };

  const handleSaveGoal = () => {
    const newGoal = parseInt(editedGoal);
    if (newGoal && newGoal > 0 && newGoal <= 10000) {
      updateGoalMutation.mutate(newGoal);
    } else {
      toast({
        title: "Invalid goal",
        description: "Please enter a goal between 1 and 10000 ml.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Fluid Intake
            </h3>
          </div>
          {selectedDate.toDateString() === new Date().toDateString() && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
              Today
            </span>
          )}
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-water-consumed">
                {totalConsumed}ml
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                of{" "}
                {isEditingGoal ? (
                  <span className="inline-flex items-center gap-1">
                    <Input
                      type="number"
                      value={editedGoal}
                      onChange={(e) => setEditedGoal(e.target.value)}
                      className="w-20 h-6 text-sm inline-block"
                      placeholder={dailyGoal.toString()}
                      data-testid="input-water-goal"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={handleSaveGoal}
                      data-testid="button-save-water-goal"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => {
                        setIsEditingGoal(false);
                        setEditedGoal("");
                      }}
                      data-testid="button-cancel-water-goal"
                    >
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() => {
                      setIsEditingGoal(true);
                      setEditedGoal(dailyGoal.toString());
                    }}
                    data-testid="button-edit-water-goal"
                  >
                    {dailyGoal}ml <Edit className="h-3 w-3" />
                  </span>
                )}
                {" "}goal
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300" data-testid="text-water-remaining">
                {remaining}ml
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">remaining</p>
            </div>
          </div>
          <Progress value={percentComplete} className="h-3" data-testid="progress-water" />
          <p className="text-xs text-center text-gray-600 dark:text-gray-400" data-testid="text-water-percentage">
            {Math.round(percentComplete)}% complete
          </p>
        </div>

        {/* Quick Add Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Add</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              onClick={() => handleQuickAdd(250)}
              variant="outline"
              className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              disabled={addWaterMutation.isPending}
              data-testid="button-add-water-250"
            >
              <Plus className="h-4 w-4 mr-1" />
              250ml
            </Button>
            <Button
              onClick={() => handleQuickAdd(500)}
              variant="outline"
              className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              disabled={addWaterMutation.isPending}
              data-testid="button-add-water-500"
            >
              <Plus className="h-4 w-4 mr-1" />
              500ml
            </Button>
            <Button
              onClick={() => handleQuickAdd(750)}
              variant="outline"
              className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              disabled={addWaterMutation.isPending}
              data-testid="button-add-water-750"
            >
              <Plus className="h-4 w-4 mr-1" />
              750ml
            </Button>
            <Button
              onClick={() => handleQuickAdd(1000)}
              variant="outline"
              className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              disabled={addWaterMutation.isPending}
              data-testid="button-add-water-1000"
            >
              <Plus className="h-4 w-4 mr-1" />
              1L
            </Button>
          </div>
        </div>

        {/* Custom Amount */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Amount</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter ml..."
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCustomAdd();
                }
              }}
              className="flex-1"
              data-testid="input-custom-water"
            />
            <Button
              onClick={handleCustomAdd}
              disabled={addWaterMutation.isPending || !customAmount}
              data-testid="button-add-custom-water"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Today's Log */}
        {waterEntries.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Today's Log</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {waterEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2 text-sm"
                  data-testid={`water-entry-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-900 dark:text-white" data-testid={`text-water-amount-${index}`}>
                      {entry.amountMl}ml
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(entry.loggedAt), "HH:mm")}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleteWaterMutation.isPending}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    data-testid={`button-delete-water-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Loading fluid intake...
          </p>
        )}
      </div>
    </Card>
  );
}
