import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets, Trash2, Edit, Coffee, Wine, Beer, GlassWater } from "lucide-react";
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
  const [customDrinkType, setCustomDrinkType] = useState<"water" | "coffee" | "tea" | "wine" | "beer" | "custom">("water");
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
    mutationFn: async (data: { amountMl: number; drinkType: "water" | "coffee" | "tea" | "wine" | "beer" | "custom"; drinkName: string }) => {
      const entry: InsertWaterIntake = {
        userId: "", // Will be set by backend
        amountMl: data.amountMl,
        drinkType: data.drinkType,
        drinkName: data.drinkName,
        loggedAt: new Date().toISOString(),
        loggedDate: dateStr,
      };
      const res = await apiRequest("POST", "/api/water", entry);
      return res.json();
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

  const handleQuickAdd = (amount: number, drinkType: "water" | "coffee" | "tea" | "wine" | "beer" | "custom", drinkName: string) => {
    addWaterMutation.mutate({ amountMl: amount, drinkType, drinkName });
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount);
    if (amount && amount > 0 && amount <= 5000) {
      const drinkNames = {
        water: "Water",
        coffee: "Coffee",
        tea: "Tea",
        wine: "Wine",
        beer: "Beer",
        custom: "Custom Drink"
      };
      
      addWaterMutation.mutate({ 
        amountMl: amount, 
        drinkType: customDrinkType, 
        drinkName: drinkNames[customDrinkType] 
      });
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 p-4 text-white">
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-1.5 h-1.5 bg-white/30 rounded-full top-[10%] left-[15%] animate-float-slow"></div>
        <div className="absolute w-1 h-1 bg-white/20 rounded-full top-[25%] right-[20%] animate-float-medium"></div>
        <div className="absolute w-2 h-2 bg-white/25 rounded-full top-[60%] left-[25%] animate-float-fast"></div>
        <div className="absolute w-1 h-1 bg-white/30 rounded-full top-[80%] right-[30%] animate-float-slow"></div>
        <div className="absolute w-1.5 h-1.5 bg-white/20 rounded-full top-[40%] right-[10%] animate-float-medium"></div>
        <div className="absolute w-1 h-1 bg-white/25 rounded-full bottom-[15%] left-[40%] animate-float-fast"></div>
      </div>

      <div className="relative z-10 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Fluid Intake</h2>
          {selectedDate.toDateString() === new Date().toDateString() && (
            <span className="bg-cyan-400 text-blue-900 px-3 py-1 rounded-full text-xs font-semibold">
              Today
            </span>
          )}
        </div>

        {/* Main Display Area */}
        <div className="flex items-center justify-between gap-4">
          {/* Water Droplet */}
          <div className="relative">
            <div className="w-24 h-24 relative">
              {/* Glossy water droplet effect */}
              <div className="absolute inset-0 rounded-[50%] bg-gradient-to-br from-cyan-300 via-blue-400 to-blue-500 opacity-90"
                   style={{ borderRadius: '50% 50% 50% 0%', transform: 'rotate(45deg)' }}>
                <div className="absolute top-3 left-3 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
              </div>
              {/* Water level inside droplet */}
              <div className="absolute inset-0 overflow-hidden"
                   style={{ borderRadius: '50% 50% 50% 0%', transform: 'rotate(45deg)' }}>
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-blue-400/50 transition-all duration-500"
                  style={{ height: `${percentComplete}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Percentage and Progress */}
          <div className="flex-1 space-y-2">
            <div className="text-5xl font-black" data-testid="text-water-percentage">
              {Math.round(percentComplete)}%
            </div>
            
            {/* Gradient Progress Bar */}
            <div className="relative h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-pink-400 rounded-full transition-all duration-500"
                style={{ width: `${percentComplete}%` }}
                data-testid="progress-water"
              ></div>
            </div>

            {/* Stats Row */}
            <div className="flex justify-between text-base">
              <div>
                <p className="font-bold" data-testid="text-water-consumed">{totalConsumed}ml</p>
                <p className="text-sm text-white/80">
                  of{" "}
                  {isEditingGoal ? (
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        value={editedGoal}
                        onChange={(e) => setEditedGoal(e.target.value)}
                        className="w-20 h-6 text-sm inline-block bg-white/20 rounded px-2 text-white"
                        placeholder={dailyGoal.toString()}
                        data-testid="input-water-goal"
                      />
                      <button
                        className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
                        onClick={handleSaveGoal}
                        data-testid="button-save-water-goal"
                      >
                        Save
                      </button>
                    </span>
                  ) : (
                    <span
                      className="cursor-pointer hover:text-white inline-flex items-center gap-1"
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
                <p className="font-bold" data-testid="text-water-remaining">{remaining}ml</p>
                <p className="text-sm text-white/80">remaining</p>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Text */}
        <div className="text-center text-white/90 text-xs">
          Let's get started! Your cells are waiting 💧
        </div>

        {/* Quick Add Buttons - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Water - Blue */}
          <button
            onClick={() => handleQuickAdd(250, "water", "Water")}
            disabled={addWaterMutation.isPending}
            className="bg-gradient-to-br from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 rounded-xl p-3 flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50"
            data-testid="button-add-water-250"
          >
            <GlassWater className="h-7 w-7" />
            <div className="text-left">
              <p className="font-bold text-base">Water</p>
              <p className="text-xs opacity-90">250ml</p>
            </div>
          </button>

          {/* Coffee - Orange */}
          <button
            onClick={() => handleQuickAdd(240, "coffee", "Coffee")}
            disabled={addWaterMutation.isPending}
            className="bg-gradient-to-br from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 rounded-xl p-3 flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50"
            data-testid="button-add-coffee-240"
          >
            <Coffee className="h-7 w-7" />
            <div className="text-left">
              <p className="font-bold text-base">Coffee</p>
              <p className="text-xs opacity-90">240ml</p>
            </div>
          </button>

          {/* Tea - Green */}
          <button
            onClick={() => handleQuickAdd(200, "tea", "Tea")}
            disabled={addWaterMutation.isPending}
            className="bg-gradient-to-br from-emerald-400 to-green-400 hover:from-emerald-500 hover:to-green-500 rounded-xl p-3 flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50"
            data-testid="button-add-tea-200"
          >
            <Coffee className="h-7 w-7" />
            <div className="text-left">
              <p className="font-bold text-base">Tea</p>
              <p className="text-xs opacity-90">200ml</p>
            </div>
          </button>

          {/* Wine - Pink/Red */}
          <button
            onClick={() => handleQuickAdd(150, "wine", "Wine")}
            disabled={addWaterMutation.isPending}
            className="bg-gradient-to-br from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 rounded-xl p-3 flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50"
            data-testid="button-add-wine-150"
          >
            <Wine className="h-7 w-7" />
            <div className="text-left">
              <p className="font-bold text-base">Wine</p>
              <p className="text-xs opacity-90">150ml</p>
            </div>
          </button>
        </div>

        {/* Custom Amount Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 flex items-center gap-2">
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1.5">Custom amount</p>
            <Select value={customDrinkType} onValueChange={(value: any) => setCustomDrinkType(value)}>
              <SelectTrigger className="bg-white/20 border-white/30 text-white text-sm h-8" data-testid="select-custom-drink-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="coffee">Coffee</SelectItem>
                <SelectItem value="tea">Tea</SelectItem>
                <SelectItem value="wine">Wine</SelectItem>
                <SelectItem value="beer">Beer</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1.5">
            <Input
              type="number"
              placeholder="ml"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCustomAdd();
                }
              }}
              className="w-20 h-8 text-sm bg-white/20 border-white/30 text-white placeholder:text-white/50"
              data-testid="input-custom-water"
            />
            <Button
              onClick={handleCustomAdd}
              disabled={addWaterMutation.isPending || !customAmount}
              className="bg-cyan-400 hover:bg-cyan-500 text-blue-900 font-bold text-sm h-8 px-4"
              data-testid="button-add-custom-water"
            >
              Enter
            </Button>
          </div>
        </div>

        {/* Today's Log */}
        {waterEntries.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/20">
            <p className="text-sm font-medium">Today's Log</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {waterEntries.map((entry, index) => {
                // Get icon and color based on drink type (with defensive fallback for legacy types)
                const getDrinkIcon = () => {
                  const drinkType = entry.drinkType || "water";
                  switch (drinkType) {
                    case "water": return <GlassWater className="h-4 w-4" />;
                    case "coffee": return <Coffee className="h-4 w-4" />;
                    case "tea": return <Coffee className="h-4 w-4" />;
                    case "wine": return <Wine className="h-4 w-4" />;
                    case "beer": return <Beer className="h-4 w-4" />;
                    case "custom": return <Droplets className="h-4 w-4" />;
                    default: return <Droplets className="h-4 w-4" />; // Fallback for legacy types
                  }
                };
                
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-2 text-sm"
                    data-testid={`water-entry-${index}`}
                  >
                    <div className="flex items-center gap-2">
                      {getDrinkIcon()}
                      <span className="text-xs text-white/80">
                        {entry.drinkName || "Drink"}
                      </span>
                      <span className="font-medium" data-testid={`text-water-amount-${index}`}>
                        {entry.amountMl}ml
                      </span>
                      <span className="text-xs text-white/70">
                        {format(new Date(entry.loggedAt), "HH:mm")}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleteWaterMutation.isPending}
                      className="h-7 w-7 p-0 text-white/60 hover:text-red-300 transition-colors"
                      data-testid={`button-delete-water-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && (
          <p className="text-center text-sm text-white/70">
            Loading fluid intake...
          </p>
        )}
      </div>
    </div>
  );
}
