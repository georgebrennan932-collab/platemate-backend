import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplets, Coffee, Wine, Plus, Check } from "lucide-react";
import type { InsertDrinkEntry } from "@shared/schema";

const drinkPresets = {
  water: { name: "Water", calories: 0, caffeine: 0, sugar: 0, alcoholContent: 0, icon: Droplets, defaultAmount: 250 },
  coffee: { name: "Coffee", calories: 5, caffeine: 95, sugar: 0, alcoholContent: 0, icon: Coffee, defaultAmount: 240 },
  tea: { name: "Tea", calories: 2, caffeine: 40, sugar: 0, alcoholContent: 0, icon: Coffee, defaultAmount: 240 },
  juice: { name: "Orange Juice", calories: 112, caffeine: 0, sugar: 21, alcoholContent: 0, icon: Wine, defaultAmount: 240 },
  soda: { name: "Soda", calories: 150, caffeine: 34, sugar: 39, alcoholContent: 0, icon: Wine, defaultAmount: 355 },
  sports_drink: { name: "Sports Drink", calories: 80, caffeine: 0, sugar: 21, alcoholContent: 0, icon: Droplets, defaultAmount: 355 },
  beer: { name: "Beer", calories: 150, caffeine: 0, sugar: 13, alcoholContent: 5, icon: Wine, defaultAmount: 355 },
  wine: { name: "Wine", calories: 125, caffeine: 0, sugar: 4, alcoholContent: 12, icon: Wine, defaultAmount: 150 },
  spirits: { name: "Spirits", calories: 97, caffeine: 0, sugar: 0, alcoholContent: 40, icon: Wine, defaultAmount: 44 },
  cocktail: { name: "Cocktail", calories: 200, caffeine: 0, sugar: 15, alcoholContent: 15, icon: Wine, defaultAmount: 150 },
  other: { name: "Custom Drink", calories: 0, caffeine: 0, sugar: 0, alcoholContent: 0, icon: Plus, defaultAmount: 250 }
};

export function DrinksBar() {
  const [selectedDrink, setSelectedDrink] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addDrinkMutation = useMutation({
    mutationFn: async (drink: InsertDrinkEntry) => {
      await apiRequest('POST', '/api/drinks', drink);
    },
    onSuccess: () => {
      toast({
        title: "Drink Logged!",
        description: "Your drink has been added to your records.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/drinks'] });
      // Reset form
      setSelectedDrink("");
      setCustomName("");
      setAmount("");
      setIsExpanded(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to log drink. Please try again.",
        variant: "destructive",
      });
      console.error("Error logging drink:", error);
    },
  });

  const calculateAlcoholUnits = (amount: number, alcoholContent: number): number => {
    // Formula: (amount in ml × alcohol content %) / 1000 = units of alcohol
    return Math.round((amount * alcoholContent) / 1000);
  };

  const handleQuickAdd = (drinkType: keyof typeof drinkPresets) => {
    const preset = drinkPresets[drinkType];
    const alcoholUnits = calculateAlcoholUnits(preset.defaultAmount, preset.alcoholContent);
    
    const drink: InsertDrinkEntry = {
      drinkName: preset.name,
      drinkType,
      amount: preset.defaultAmount,
      calories: preset.calories,
      caffeine: preset.caffeine,
      sugar: preset.sugar,
      alcoholContent: preset.alcoholContent,
      alcoholUnits,
      loggedAt: new Date().toISOString(),
    };
    addDrinkMutation.mutate(drink);
  };

  const handleCustomAdd = () => {
    if (!selectedDrink || !amount) return;
    
    const preset = drinkPresets[selectedDrink as keyof typeof drinkPresets];
    const amountNum = parseInt(amount);
    
    // Calculate nutrition values based on amount ratio
    const ratio = amountNum / preset.defaultAmount;
    const alcoholUnits = calculateAlcoholUnits(amountNum, preset.alcoholContent);
    
    const drink: InsertDrinkEntry = {
      drinkName: selectedDrink === 'other' ? customName : preset.name,
      drinkType: selectedDrink as any,
      amount: amountNum,
      calories: Math.round(preset.calories * ratio),
      caffeine: Math.round(preset.caffeine * ratio),
      sugar: Math.round(preset.sugar * ratio),
      alcoholContent: preset.alcoholContent,
      alcoholUnits,
      loggedAt: new Date().toISOString(),
    };
    
    addDrinkMutation.mutate(drink);
  };

  if (!isExpanded) {
    return (
      <Card className="mx-4 mb-4 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Droplets className="h-5 w-5 text-blue-500" />
            <span>Quick Drinks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Quick add buttons for common drinks */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('water')}
              disabled={addDrinkMutation.isPending}
              className="flex items-center space-x-2"
              data-testid="button-quick-water"
            >
              <Droplets className="h-4 w-4" />
              <span>Water</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('coffee')}
              disabled={addDrinkMutation.isPending}
              className="flex items-center space-x-2"
              data-testid="button-quick-coffee"
            >
              <Coffee className="h-4 w-4" />
              <span>Coffee</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('beer')}
              disabled={addDrinkMutation.isPending}
              className="flex items-center space-x-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              data-testid="button-quick-beer"
            >
              <Wine className="h-4 w-4" />
              <span>Beer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('wine')}
              disabled={addDrinkMutation.isPending}
              className="flex items-center space-x-2 text-purple-600 border-purple-300 hover:bg-purple-50"
              data-testid="button-quick-wine"
            >
              <Wine className="h-4 w-4" />
              <span>Wine</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="w-full text-blue-600 hover:text-blue-700"
            data-testid="button-more-drinks"
          >
            <Plus className="h-4 w-4 mr-2" />
            More Drinks
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-4 mb-4 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            <span>Log a Drink</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            data-testid="button-collapse-drinks"
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdd('water')}
            disabled={addDrinkMutation.isPending}
            className="flex flex-col items-center space-y-1 h-auto py-2"
            data-testid="button-quick-water-expanded"
          >
            <Droplets className="h-4 w-4" />
            <span className="text-xs">Water</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdd('coffee')}
            disabled={addDrinkMutation.isPending}
            className="flex flex-col items-center space-y-1 h-auto py-2"
            data-testid="button-quick-coffee-expanded"
          >
            <Coffee className="h-4 w-4" />
            <span className="text-xs">Coffee</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdd('tea')}
            disabled={addDrinkMutation.isPending}
            className="flex flex-col items-center space-y-1 h-auto py-2"
            data-testid="button-quick-tea"
          >
            <Coffee className="h-4 w-4" />
            <span className="text-xs">Tea</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdd('soda')}
            disabled={addDrinkMutation.isPending}
            className="flex flex-col items-center space-y-1 h-auto py-2"
            data-testid="button-quick-soda"
          >
            <Wine className="h-4 w-4" />
            <span className="text-xs">Soda</span>
          </Button>
        </div>

        {/* Alcohol Section */}
        <div className="border-t pt-3 mb-3">
          <h4 className="font-medium text-sm mb-2 text-amber-700 dark:text-amber-300">Alcohol</h4>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('beer')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-auto py-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              data-testid="button-quick-beer-expanded"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs">Beer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('wine')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-auto py-2 text-purple-600 border-purple-300 hover:bg-purple-50"
              data-testid="button-quick-wine-expanded"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs">Wine</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('spirits')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-auto py-2 text-red-600 border-red-300 hover:bg-red-50"
              data-testid="button-quick-spirits"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs">Spirits</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('cocktail')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-auto py-2 text-pink-600 border-pink-300 hover:bg-pink-50"
              data-testid="button-quick-cocktail"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs">Cocktail</span>
            </Button>
          </div>
        </div>

        {/* Custom drink form */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium text-sm">Custom Amount</h4>
          <div className="grid grid-cols-2 gap-3">
            <Select value={selectedDrink} onValueChange={setSelectedDrink}>
              <SelectTrigger data-testid="select-drink-type">
                <SelectValue placeholder="Select drink" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="coffee">Coffee</SelectItem>
                <SelectItem value="tea">Tea</SelectItem>
                <SelectItem value="juice">Juice</SelectItem>
                <SelectItem value="soda">Soda</SelectItem>
                <SelectItem value="sports_drink">Sports Drink</SelectItem>
                <SelectItem value="beer">Beer</SelectItem>
                <SelectItem value="wine">Wine</SelectItem>
                <SelectItem value="spirits">Spirits</SelectItem>
                <SelectItem value="cocktail">Cocktail</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Amount (ml)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-drink-amount"
            />
          </div>
          
          {selectedDrink === 'other' && (
            <Input
              placeholder="Drink name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              data-testid="input-custom-drink-name"
            />
          )}

          <Button
            onClick={handleCustomAdd}
            disabled={!selectedDrink || !amount || addDrinkMutation.isPending || (selectedDrink === 'other' && !customName)}
            className="w-full"
            data-testid="button-log-custom-drink"
          >
            {addDrinkMutation.isPending ? (
              "Logging..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Log Drink
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}