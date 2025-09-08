import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Coffee, Droplets, Wine, Apple, Clock, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface QuickActionsBarProps {
  onQuickLog?: (type: string, data: any) => void;
}

const QUICK_DRINKS = [
  { name: "Water", icon: "💧", type: "water", defaultAmount: 250, calories: 0 },
  { name: "Coffee", icon: "☕", type: "coffee", defaultAmount: 200, calories: 5, caffeine: 95 },
  { name: "Tea", icon: "🍵", type: "tea", defaultAmount: 200, calories: 2, caffeine: 30 },
  { name: "Juice", icon: "🥤", type: "juice", defaultAmount: 250, calories: 110, sugar: 26 },
];

const QUICK_SNACKS = [
  { name: "Apple", icon: "🍎", calories: 80, protein: 0, carbs: 21, fat: 0 },
  { name: "Banana", icon: "🍌", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "Greek Yogurt", icon: "🥛", calories: 100, protein: 17, carbs: 6, fat: 0 },
  { name: "Almonds (handful)", icon: "🥜", calories: 160, protein: 6, carbs: 6, fat: 14 },
];

export function QuickActionsBar({ onQuickLog }: QuickActionsBarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customDrink, setCustomDrink] = useState({
    name: "",
    type: "water" as const,
    amount: 250,
    calories: 0,
  });

  const logDrinkMutation = useMutation({
    mutationFn: async (drinkData: any) => {
      await apiRequest("POST", "/api/drinks", {
        ...drinkData,
        loggedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drinks"] });
    },
  });

  const logSnackMutation = useMutation({
    mutationFn: async (snackData: any) => {
      // Create a mock food analysis for quick snacks
      const mockAnalysis = {
        imageUrl: "", // No image for quick logs
        confidence: 100, // High confidence for known foods
        totalCalories: snackData.calories,
        totalProtein: snackData.protein,
        totalCarbs: snackData.carbs,
        totalFat: snackData.fat,
        detectedFoods: [{
          name: snackData.name,
          portion: "1 serving",
          calories: snackData.calories,
          protein: snackData.protein,
          carbs: snackData.carbs,
          fat: snackData.fat,
          icon: snackData.icon,
        }],
      };

      // For quick snacks, we'll skip creating a full analysis and just create a diary entry
      // In a real implementation, this would create a proper analysis entry
      // For now, just log it as a simple entry
      await apiRequest("POST", "/api/diary", {
        analysisId: "quick-snack-placeholder", // Would be a real analysis ID
        mealType: "snack",
        mealDate: new Date().toISOString(),
        notes: `Quick logged: ${snackData.name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
    },
  });

  const handleQuickDrink = (drink: typeof QUICK_DRINKS[0]) => {
    logDrinkMutation.mutate({
      drinkName: drink.name,
      drinkType: drink.type,
      amount: drink.defaultAmount,
      calories: drink.calories,
      caffeine: drink.caffeine || 0,
      sugar: drink.name === "Juice" ? 26 : 0,
    });

    toast({
      title: "Drink Logged",
      description: `${drink.name} (${drink.defaultAmount}ml) added to your diary.`,
    });

    onQuickLog?.("drink", drink);
  };

  const handleQuickSnack = (snack: typeof QUICK_SNACKS[0]) => {
    logSnackMutation.mutate(snack);

    toast({
      title: "Snack Logged",
      description: `${snack.name} added to your diary.`,
    });

    onQuickLog?.("snack", snack);
  };

  const handleCustomDrink = () => {
    if (!customDrink.name.trim()) return;

    logDrinkMutation.mutate({
      drinkName: customDrink.name,
      drinkType: customDrink.type,
      amount: customDrink.amount,
      calories: customDrink.calories,
      caffeine: 0,
      sugar: 0,
    });

    toast({
      title: "Custom Drink Logged",
      description: `${customDrink.name} added to your diary.`,
    });

    setCustomDrink({ name: "", type: "water", amount: 250, calories: 0 });
    onQuickLog?.("custom-drink", customDrink);
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Quick Actions</h3>
      </div>

      {/* Quick Drinks */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Droplets className="h-3 w-3" />
          Quick Drinks
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_DRINKS.map((drink) => (
            <Button
              key={drink.name}
              variant="outline"
              size="sm"
              onClick={() => handleQuickDrink(drink)}
              disabled={logDrinkMutation.isPending}
              className="justify-start h-auto p-2 hover:bg-blue-50 dark:hover:bg-blue-950"
              data-testid={`quick-drink-${drink.name.toLowerCase()}`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-lg">{drink.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-xs font-medium">{drink.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {drink.defaultAmount}ml
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* Custom Drink */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start hover:bg-blue-50 dark:hover:bg-blue-950"
              data-testid="button-custom-drink"
            >
              <Coffee className="h-4 w-4 mr-2" />
              Log Custom Drink
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-medium">Custom Drink</h4>
              
              <div className="space-y-2">
                <Label>Drink Name</Label>
                <Input
                  placeholder="e.g., Green Smoothie"
                  value={customDrink.name}
                  onChange={(e) => setCustomDrink({ ...customDrink, name: e.target.value })}
                  data-testid="input-custom-drink-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={customDrink.type}
                    onValueChange={(value: any) => setCustomDrink({ ...customDrink, type: value })}
                  >
                    <SelectTrigger data-testid="select-custom-drink-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">💧 Water</SelectItem>
                      <SelectItem value="coffee">☕ Coffee</SelectItem>
                      <SelectItem value="tea">🍵 Tea</SelectItem>
                      <SelectItem value="juice">🥤 Juice</SelectItem>
                      <SelectItem value="soda">🥤 Soda</SelectItem>
                      <SelectItem value="other">🥛 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount (ml)</Label>
                  <Input
                    type="number"
                    value={customDrink.amount}
                    onChange={(e) => setCustomDrink({ ...customDrink, amount: parseInt(e.target.value) || 0 })}
                    data-testid="input-custom-drink-amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Calories (optional)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={customDrink.calories}
                  onChange={(e) => setCustomDrink({ ...customDrink, calories: parseInt(e.target.value) || 0 })}
                  data-testid="input-custom-drink-calories"
                />
              </div>

              <Button
                onClick={handleCustomDrink}
                disabled={!customDrink.name.trim() || logDrinkMutation.isPending}
                className="w-full"
                data-testid="button-log-custom-drink"
              >
                {logDrinkMutation.isPending ? "Logging..." : "Log Drink"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick Snacks */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-1">
          <Apple className="h-3 w-3" />
          Quick Snacks
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SNACKS.map((snack) => (
            <Button
              key={snack.name}
              variant="outline"
              size="sm"
              onClick={() => handleQuickSnack(snack)}
              disabled={logSnackMutation.isPending}
              className="justify-start h-auto p-2 hover:bg-green-50 dark:hover:bg-green-950"
              data-testid={`quick-snack-${snack.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-lg">{snack.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-xs font-medium">{snack.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {snack.calories} cal
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Voice Notes Placeholder */}
      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          disabled
          data-testid="button-voice-notes"
        >
          <Utensils className="h-4 w-4 mr-2" />
          Voice Notes (Coming Soon)
        </Button>
      </div>
    </div>
  );
}