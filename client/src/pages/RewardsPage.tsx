import { useState } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Trophy, Target, Apple, Drumstick, Cookie, Salad } from "lucide-react";

interface SuggestionCategory {
  name: string;
  icon: any;
  items: string[];
}

export default function RewardsPage() {
  const [steps, setSteps] = useState<string>("");
  const [reward, setReward] = useState<{ calories: number; categories: SuggestionCategory[] } | null>(null);

  const calculateReward = () => {
    const stepsNum = parseInt(steps) || 0;
    const calories = Math.round(stepsNum * 0.04); // approx kcal per step

    let categories: SuggestionCategory[] = [];

    if (calories < 100) {
      categories = [
        {
          name: "Light Snacks",
          icon: Apple,
          items: [
            "🍎 Small apple (52 kcal)",
            "🥕 Baby carrots with hummus (70 kcal)",
            "🫐 Cup of blueberries (84 kcal)",
            "🍊 Small orange (62 kcal)",
            "🥒 Cucumber slices (16 kcal)",
          ]
        },
        {
          name: "Beverages",
          icon: Cookie,
          items: [
            "☕ Coffee with milk (38 kcal)",
            "🍵 Green tea (2 kcal)",
            "🥤 Diet soda (0 kcal)",
          ]
        }
      ];
    } else if (calories < 200) {
      categories = [
        {
          name: "Healthy Choices",
          icon: Salad,
          items: [
            "🍏 Large apple (95 kcal)",
            "🥛 Glass of milk (122 kcal)",
            "🍌 Banana (105 kcal)",
            "🥚 Hard-boiled egg (78 kcal)",
            "🥗 Small side salad (100 kcal)",
            "🍓 Cup of strawberries (49 kcal)",
          ]
        },
        {
          name: "Quick Energy",
          icon: Cookie,
          items: [
            "🍪 2 small cookies (120 kcal)",
            "🍫 Small chocolate bar (150 kcal)",
            "🥜 Handful of almonds (160 kcal)",
            "🧃 Fruit juice box (110 kcal)",
          ]
        }
      ];
    } else if (calories < 350) {
      categories = [
        {
          name: "Protein-Packed",
          icon: Drumstick,
          items: [
            "🍗 Chicken breast 3oz (140 kcal)",
            "🥚 2 eggs scrambled (200 kcal)",
            "🧀 String cheese + apple (180 kcal)",
            "🥛 Protein shake (220 kcal)",
            "🐟 Tuna can (120 kcal)",
          ]
        },
        {
          name: "Balanced Meals",
          icon: Salad,
          items: [
            "🥗 Greek salad (300 kcal)",
            "🥪 Turkey sandwich half (250 kcal)",
            "🍌 2 bananas + peanut butter (300 kcal)",
            "🥑 Avocado toast (250 kcal)",
            "🥙 Small veggie wrap (280 kcal)",
          ]
        },
        {
          name: "Sweet Treats",
          icon: Cookie,
          items: [
            "🍦 Ice cream scoop (200 kcal)",
            "🍩 Glazed donut (260 kcal)",
            "🧁 Muffin (300 kcal)",
          ]
        }
      ];
    } else if (calories < 500) {
      categories = [
        {
          name: "Full Meals",
          icon: Drumstick,
          items: [
            "🥪 Full sandwich (400 kcal)",
            "🍝 Pasta bowl (450 kcal)",
            "🍜 Ramen bowl (380 kcal)",
            "🌯 Burrito bowl (420 kcal)",
            "🥙 Large wrap (450 kcal)",
          ]
        },
        {
          name: "Restaurant Options",
          icon: Cookie,
          items: [
            "🍕 2 slices pizza (500 kcal)",
            "🍔 Small burger (480 kcal)",
            "🌮 3 tacos (450 kcal)",
            "🍱 Sushi rolls 8pc (400 kcal)",
          ]
        },
        {
          name: "Healthy Plates",
          icon: Salad,
          items: [
            "🥗 Large Caesar salad (400 kcal)",
            "🍗 Grilled chicken + veggies (380 kcal)",
            "🐟 Salmon + quinoa (450 kcal)",
          ]
        }
      ];
    } else if (calories < 700) {
      categories = [
        {
          name: "Hearty Meals",
          icon: Drumstick,
          items: [
            "🍝 Spaghetti & meatballs (650 kcal)",
            "🍔 Burger + small fries (650 kcal)",
            "🍗 Fried chicken 2pc (600 kcal)",
            "🍕 3 slices pizza (700 kcal)",
            "🌯 Large burrito (680 kcal)",
          ]
        },
        {
          name: "Indulgent Options",
          icon: Cookie,
          items: [
            "🍺 Beer + wings (650 kcal)",
            "🍰 Cake slice + coffee (550 kcal)",
            "🧇 Waffles with syrup (600 kcal)",
            "🥞 Pancake stack (620 kcal)",
          ]
        },
        {
          name: "Balanced Options",
          icon: Salad,
          items: [
            "🥑 Avocado toast + eggs (500 kcal)",
            "🍱 Poke bowl (550 kcal)",
            "🥗 Cobb salad (600 kcal)",
          ]
        }
      ];
    } else {
      categories = [
        {
          name: "Full Restaurant Meals",
          icon: Drumstick,
          items: [
            "🍔 Burger + fries + drink (950 kcal)",
            "🍕 Personal pizza (800 kcal)",
            "🍝 Pasta + garlic bread (850 kcal)",
            "🌮 Taco platter (900 kcal)",
            "🍗 Fried chicken meal (1000 kcal)",
          ]
        },
        {
          name: "Special Treats",
          icon: Cookie,
          items: [
            "🍰 Cheesecake slice (700 kcal)",
            "🍨 Milkshake (800 kcal)",
            "🧁 2 cupcakes + coffee (750 kcal)",
            "🍩 3 donuts (780 kcal)",
          ]
        },
        {
          name: "Healthy Feasts",
          icon: Salad,
          items: [
            "🥗 Large protein bowl (700 kcal)",
            "🍱 Sushi platter (750 kcal)",
            "🐟 Fish + 2 sides (800 kcal)",
            "🥙 2 wraps (900 kcal)",
          ]
        }
      ];
    }

    setReward({ calories, categories });
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
      <div className="max-w-md mx-auto px-4">
        <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
              Steps Reward Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Steps Input */}
            <div className="space-y-3">
              <label htmlFor="stepsInput" className="block text-lg font-semibold text-foreground">
                Enter steps today:
              </label>
              <Input
                id="stepsInput"
                type="number"
                placeholder="e.g. 8000"
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

            {/* Results */}
            {reward && (
              <div 
                id="rewardOutput"
                className="mt-4 space-y-4"
                data-testid="reward-output"
              >
                <div className="text-center p-4 rounded-xl bg-gradient-to-r from-purple-50 to-orange-50 dark:from-purple-900/20 dark:to-orange-900/20 border-2 border-purple-200 dark:border-purple-800">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    🎉 You earned <span className="text-orange-500">{reward.calories} kcal</span>!
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Here are some reward ideas organized by category
                  </div>
                </div>
                
                {/* Categories */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {reward.categories.map((category, catIndex) => {
                    const IconComponent = category.icon;
                    return (
                      <div key={catIndex} className="space-y-2">
                        <div className="flex items-center space-x-2 text-lg font-bold text-gray-800 dark:text-gray-200">
                          <IconComponent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <span>{category.name}</span>
                        </div>
                        <div className="space-y-2 pl-7">
                          {category.items.map((item, itemIndex) => (
                            <div 
                              key={itemIndex}
                              className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm border border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
