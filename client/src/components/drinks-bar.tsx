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
      <Card className="mx-4 mb-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-200 dark:border-blue-800 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-3 text-lg">
            <div className="p-2 bg-blue-500 rounded-full shadow-md">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-bold">Quick Drinks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Water */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleQuickAdd('water')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-2 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-300 hover:from-blue-200 hover:to-cyan-200 hover:shadow-md transition-all duration-200 text-blue-700 dark:text-blue-300"
              data-testid="button-quick-water"
            >
              <Droplets className="h-6 w-6" />
              <span className="text-sm font-medium">Water</span>
            </Button>
            
            {/* Coffee */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleQuickAdd('coffee')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-2 h-20 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-300 hover:from-amber-200 hover:to-orange-200 hover:shadow-md transition-all duration-200 text-amber-700 dark:text-amber-300"
              data-testid="button-quick-coffee"
            >
              <Coffee className="h-6 w-6" />
              <span className="text-sm font-medium">Coffee</span>
            </Button>
            
            {/* Beer */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleQuickAdd('beer')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-2 h-20 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-300 hover:from-yellow-200 hover:to-amber-200 hover:shadow-md transition-all duration-200 text-yellow-700 dark:text-yellow-300"
              data-testid="button-quick-beer"
            >
              <Wine className="h-6 w-6" />
              <span className="text-sm font-medium">Beer</span>
            </Button>
            
            {/* Wine */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleQuickAdd('wine')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-2 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-300 hover:from-purple-200 hover:to-pink-200 hover:shadow-md transition-all duration-200 text-purple-700 dark:text-purple-300"
              data-testid="button-quick-wine"
            >
              <Wine className="h-6 w-6" />
              <span className="text-sm font-medium">Wine</span>
            </Button>
          </div>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
            data-testid="button-more-drinks"
          >
            <Plus className="h-4 w-4 mr-2" />
            More Drinks & Custom Amounts
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-4 mb-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-200 dark:border-blue-800 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-full shadow-md">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-bold">Log a Drink</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 rounded-full h-8 w-8 p-0"
            data-testid="button-collapse-drinks"
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Non-Alcoholic Drinks */}
        <div>
          <h4 className="font-semibold text-sm mb-3 text-blue-700 dark:text-blue-300 flex items-center space-x-2">
            <Droplets className="h-4 w-4" />
            <span>Non-Alcoholic</span>
          </h4>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('water')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-300 hover:from-blue-200 hover:to-cyan-200 hover:shadow-md transition-all duration-200 text-blue-700 dark:text-blue-300"
              data-testid="button-quick-water-expanded"
            >
              <Droplets className="h-4 w-4" />
              <span className="text-xs font-medium">Water</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('coffee')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-16 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-300 hover:from-amber-200 hover:to-orange-200 hover:shadow-md transition-all duration-200 text-amber-700 dark:text-amber-300"
              data-testid="button-quick-coffee-expanded"
            >
              <Coffee className="h-4 w-4" />
              <span className="text-xs font-medium">Coffee</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('tea')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 hover:from-green-200 hover:to-emerald-200 hover:shadow-md transition-all duration-200 text-green-700 dark:text-green-300"
              data-testid="button-quick-tea"
            >
              <Coffee className="h-4 w-4" />
              <span className="text-xs font-medium">Tea</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('soda')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-16 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 border-red-300 hover:from-red-200 hover:to-pink-200 hover:shadow-md transition-all duration-200 text-red-700 dark:text-red-300"
              data-testid="button-quick-soda"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs font-medium">Soda</span>
            </Button>
          </div>
        </div>

        {/* Alcohol Section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <h4 className="font-semibold text-sm mb-3 text-amber-700 dark:text-amber-300 flex items-center space-x-2">
            <Wine className="h-4 w-4" />
            <span>Alcoholic Drinks</span>
          </h4>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('beer')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-16 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 border-yellow-300 hover:from-yellow-200 hover:to-amber-200 hover:shadow-md transition-all duration-200 text-yellow-700 dark:text-yellow-300"
              data-testid="button-quick-beer-expanded"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs font-medium">Beer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('wine')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-purple-300 hover:from-purple-200 hover:to-pink-200 hover:shadow-md transition-all duration-200 text-purple-700 dark:text-purple-300"
              data-testid="button-quick-wine-expanded"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs font-medium">Wine</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('spirits')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-16 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-red-300 hover:from-red-200 hover:to-rose-200 hover:shadow-md transition-all duration-200 text-red-700 dark:text-red-300"
              data-testid="button-quick-spirits"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs font-medium">Spirits</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdd('cocktail')}
              disabled={addDrinkMutation.isPending}
              className="flex flex-col items-center space-y-1 h-16 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 border-pink-300 hover:from-pink-200 hover:to-rose-200 hover:shadow-md transition-all duration-200 text-pink-700 dark:text-pink-300"
              data-testid="button-quick-cocktail"
            >
              <Wine className="h-4 w-4" />
              <span className="text-xs font-medium">Cocktail</span>
            </Button>
          </div>
        </div>

        {/* Custom drink form */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
          <h4 className="font-semibold text-sm mb-4 text-slate-700 dark:text-slate-300 flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Custom Amount & Type</span>
          </h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Select value={selectedDrink} onValueChange={setSelectedDrink}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm" data-testid="select-drink-type">
                <SelectValue placeholder="Select drink" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="water">💧 Water</SelectItem>
                <SelectItem value="coffee">☕ Coffee</SelectItem>
                <SelectItem value="tea">🍵 Tea</SelectItem>
                <SelectItem value="juice">🧃 Juice</SelectItem>
                <SelectItem value="soda">🥤 Soda</SelectItem>
                <SelectItem value="sports_drink">⚡ Sports Drink</SelectItem>
                <SelectItem value="beer">🍺 Beer</SelectItem>
                <SelectItem value="wine">🍷 Wine</SelectItem>
                <SelectItem value="spirits">🥃 Spirits</SelectItem>
                <SelectItem value="cocktail">🍸 Cocktail</SelectItem>
                <SelectItem value="other">🎯 Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Amount (ml)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm"
              data-testid="input-drink-amount"
            />
          </div>
          
          {selectedDrink === 'other' && (
            <div className="mb-3">
              <Input
                placeholder="Enter drink name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm"
                data-testid="input-custom-drink-name"
              />
            </div>
          )}

          <Button
            onClick={handleCustomAdd}
            disabled={!selectedDrink || !amount || addDrinkMutation.isPending || (selectedDrink === 'other' && !customName)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
            data-testid="button-log-custom-drink"
          >
            {addDrinkMutation.isPending ? (
              "Logging..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Log Custom Drink
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}