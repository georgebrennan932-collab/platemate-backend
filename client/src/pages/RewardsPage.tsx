import { useState } from "react";
import { DropdownNavigation } from "@/components/dropdown-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Trophy, Target, Utensils, Pizza, Salad, Cake, Coffee, Cookie } from "lucide-react";

interface FoodItem {
  name: string;
  emoji: string;
  calories: number;
}

interface Category {
  name: string;
  icon: string;
  items: FoodItem[];
}

// Comprehensive food database organized by category
const FOOD_DATABASE: Category[] = [
  {
    name: "Full Meals",
    icon: "🍽️",
    items: [
      { name: "Full sandwich", emoji: "🥪", calories: 400 },
      { name: "Pasta bowl", emoji: "🍝", calories: 450 },
      { name: "Ramen bowl", emoji: "🍜", calories: 380 },
      { name: "Burrito bowl", emoji: "🌯", calories: 420 },
      { name: "Large wrap", emoji: "🌮", calories: 450 },
      { name: "Chicken rice bowl", emoji: "🍚", calories: 480 },
      { name: "Stir fry noodles", emoji: "🍲", calories: 520 },
      { name: "Fried rice plate", emoji: "🍛", calories: 550 },
      { name: "Beef bowl", emoji: "🥩", calories: 600 },
      { name: "Fried chicken meal", emoji: "🍗", calories: 1000 },
    ]
  },
  {
    name: "Restaurant Options",
    icon: "🍕",
    items: [
      { name: "2 slices pizza", emoji: "🍕", calories: 500 },
      { name: "Small burger", emoji: "🍔", calories: 480 },
      { name: "3 tacos", emoji: "🌮", calories: 450 },
      { name: "Sushi rolls 8pc", emoji: "🍱", calories: 400 },
      { name: "Poke bowl", emoji: "🥙", calories: 420 },
      { name: "Pad Thai", emoji: "🍜", calories: 550 },
      { name: "Falafel wrap", emoji: "🥙", calories: 380 },
      { name: "Chicken wings 6pc", emoji: "🍗", calories: 540 },
      { name: "Fish & chips", emoji: "🐟", calories: 650 },
      { name: "BBQ ribs", emoji: "🍖", calories: 700 },
    ]
  },
  {
    name: "Healthy Plates",
    icon: "🥗",
    items: [
      { name: "Large Caesar salad", emoji: "🥗", calories: 400 },
      { name: "Grilled chicken + veggies", emoji: "🍗", calories: 380 },
      { name: "Salmon + quinoa", emoji: "🐟", calories: 450 },
      { name: "Greek salad bowl", emoji: "🥗", calories: 320 },
      { name: "Turkey sandwich", emoji: "🥪", calories: 350 },
      { name: "Veggie stir fry", emoji: "🥘", calories: 300 },
      { name: "Egg white omelette", emoji: "🍳", calories: 280 },
      { name: "Tuna poke bowl", emoji: "🥙", calories: 390 },
      { name: "Chicken breast + rice", emoji: "🍚", calories: 420 },
      { name: "Shrimp salad", emoji: "🦐", calories: 310 },
    ]
  },
  {
    name: "Special Treats",
    icon: "🍰",
    items: [
      { name: "Ice cream sundae", emoji: "🍨", calories: 350 },
      { name: "Cheesecake slice", emoji: "🍰", calories: 700 },
      { name: "Milkshake", emoji: "🥤", calories: 800 },
      { name: "2 cupcakes + coffee", emoji: "🧁", calories: 750 },
      { name: "3 donuts", emoji: "🍩", calories: 780 },
      { name: "Chocolate brownie", emoji: "🍫", calories: 450 },
      { name: "Cookie platter", emoji: "🍪", calories: 600 },
      { name: "Cinnamon roll", emoji: "🥐", calories: 420 },
      { name: "Fruit smoothie bowl", emoji: "🥤", calories: 380 },
      { name: "Pancake stack", emoji: "🥞", calories: 520 },
    ]
  },
  {
    name: "Healthy Feasts",
    icon: "🥙",
    items: [
      { name: "Large protein bowl", emoji: "🥗", calories: 700 },
      { name: "Sushi platter", emoji: "🍱", calories: 750 },
      { name: "Grilled salmon meal", emoji: "🐟", calories: 650 },
      { name: "Mediterranean plate", emoji: "🥙", calories: 680 },
      { name: "Buddha bowl", emoji: "🥗", calories: 620 },
      { name: "Chicken shawarma plate", emoji: "🍗", calories: 720 },
      { name: "Veggie curry + rice", emoji: "🍛", calories: 600 },
      { name: "Steak + veggies", emoji: "🥩", calories: 800 },
      { name: "Teriyaki bowl", emoji: "🍚", calories: 640 },
      { name: "Fish tacos meal", emoji: "🐟", calories: 580 },
    ]
  },
  {
    name: "Snacks & Drinks",
    icon: "🍫",
    items: [
      { name: "Apple", emoji: "🍏", calories: 95 },
      { name: "Banana", emoji: "🍌", calories: 105 },
      { name: "Protein bar", emoji: "🍫", calories: 200 },
      { name: "Greek yogurt", emoji: "🥛", calories: 150 },
      { name: "Trail mix handful", emoji: "🥜", calories: 180 },
      { name: "Granola bar", emoji: "🍪", calories: 140 },
      { name: "Coffee + muffin", emoji: "☕", calories: 320 },
      { name: "Latte + cookie", emoji: "☕", calories: 280 },
      { name: "Fruit smoothie", emoji: "🥤", calories: 250 },
      { name: "Avocado toast", emoji: "🥑", calories: 300 },
      { name: "Hummus + pita", emoji: "🥙", calories: 220 },
      { name: "Cheese + crackers", emoji: "🧀", calories: 240 },
    ]
  }
];

interface RewardResult {
  calories: number;
  categories: {
    name: string;
    icon: string;
    items: Array<{ name: string; emoji: string; calories: number }>;
  }[];
}

export default function RewardsPage() {
  const [steps, setSteps] = useState<string>("");
  const [reward, setReward] = useState<RewardResult | null>(null);

  const calculateReward = () => {
    const stepsNum = parseInt(steps) || 0;
    const earnedCalories = Math.round(stepsNum * 0.04); // approx kcal per step

    // Filter items that are at or below earned calories and organize by category
    const categorizedRewards = FOOD_DATABASE.map(category => ({
      name: category.name,
      icon: category.icon,
      items: category.items.filter(item => item.calories <= earnedCalories)
    })).filter(category => category.items.length > 0); // Only show categories with available items

    setReward({
      calories: earnedCalories,
      categories: categorizedRewards
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      calculateReward();
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{background: 'var(--bg-gradient)'}}>
      {/* Header */}
      <div className="px-4 pt-8 pb-6 text-center">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <Award className="h-8 w-8 text-white" />
          <h1 className="text-4xl font-bold text-white">Rewards</h1>
          <Trophy className="h-8 w-8 text-white" />
        </div>
        <p className="text-lg text-white/90">Convert your steps into earned calories!</p>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 space-y-4">
        <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
              Steps Reward Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Steps Input */}
            <div className="space-y-3">
              <label htmlFor="stepsInput" className="block text-lg font-semibold text-foreground">
                Enter steps today:
              </label>
              <Input
                id="stepsInput"
                type="number"
                placeholder="e.g. 12000"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-lg py-3 px-4 border-2 focus:border-purple-500 focus:ring-purple-500"
                data-testid="input-steps"
              />
            </div>

            {/* Calculate Button */}
            <Button
              onClick={calculateReward}
              className="w-full py-3 text-lg font-bold bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white border-0 shadow-lg"
              data-testid="button-calculate"
            >
              <Target className="h-5 w-5 mr-2" />
              Calculate Reward
            </Button>
          </CardContent>
        </Card>

        {/* Results - Categorized Display */}
        {reward && (
          <div className="space-y-4">
            {/* Celebration Header */}
            <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-white/20 shadow-2xl">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    <span className="text-purple-600">🎉 You earned</span>
                    <div className="text-4xl text-orange-500 my-1">{reward.calories} kcal!</div>
                  </div>
                  <p className="text-base text-muted-foreground">
                    Here are some reward ideas organized by category
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Category Sections - Scrollable */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1" data-testid="reward-categories">
              {reward.categories.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-2">
                  {/* Category Header */}
                  <div className="flex items-center space-x-2 sticky top-0 bg-gradient-to-r from-purple-600/90 to-orange-500/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md z-10">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className="text-lg font-bold text-white">{category.name}</h3>
                  </div>

                  {/* Category Items */}
                  <div className="space-y-2">
                    {category.items.map((item, itemIndex) => (
                      <Card 
                        key={itemIndex}
                        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-purple-100 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow"
                        data-testid={`reward-item-${categoryIndex}-${itemIndex}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{item.emoji}</span>
                              <span className="text-base font-medium text-foreground">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                              ({item.calories} kcal)
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {reward.categories.length === 0 && (
              <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-white/20 shadow-xl">
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg">Take more steps to unlock rewards! 🚶‍♂️</p>
                    <p className="text-sm mt-2">Aim for at least 2,500 steps to see your first rewards.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <DropdownNavigation />
    </div>
  );
}