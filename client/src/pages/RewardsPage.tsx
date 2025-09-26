import { useState } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Trophy, Target } from "lucide-react";

export default function RewardsPage() {
  const [steps, setSteps] = useState<string>("");
  const [reward, setReward] = useState<{ calories: number; suggestions: string[] } | null>(null);

  const calculateReward = () => {
    const stepsNum = parseInt(steps) || 0;
    const calories = Math.round(stepsNum * 0.04); // approx kcal per step

    let suggestions: string[] = [];

    if (calories < 200) {
      suggestions = ["🍏 1 apple", "🥛 1 glass of milk"];
    } else if (calories < 400) {
      suggestions = ["🥪 1 sandwich", "🍌 2 bananas"];
    } else if (calories < 600) {
      suggestions = ["🍕 2 slices thin-crust pizza", "🍺 1 pint of lager"];
    } else {
      suggestions = ["🍫 1 chocolate bar + coffee", "🥑 Avocado toast with egg"];
    }

    setReward({ calories, suggestions });
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
                className="mt-4 p-4 rounded-xl border-2 border-orange-200 dark:border-orange-800 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #f2f2f2 0%, #fdf4ff 100%)',
                  fontSize: '16px'
                }}
                data-testid="reward-output"
              >
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    🎉 You earned <span className="text-orange-500">{reward.calories} kcal</span> today!
                  </div>
                  <div className="text-lg font-semibold text-gray-700 mb-4">
                    Here are some reward ideas:
                  </div>
                </div>
                
                <ul className="space-y-3">
                  {reward.suggestions.map((item, index) => (
                    <li 
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-white/80 rounded-lg shadow-sm border border-purple-100"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="text-lg font-medium text-gray-800">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}