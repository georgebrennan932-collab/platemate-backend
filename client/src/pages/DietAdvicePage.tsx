import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Lightbulb, TrendingUp, Heart, Brain, Zap, RefreshCw } from "lucide-react";
import { useState } from "react";

interface DietAdvice {
  personalizedAdvice: string[];
  nutritionGoals: string[];
  improvements: string[];
  generalTips: string[];
}

export function DietAdvicePage() {
  const { toast } = useToast();
  const [adviceType, setAdviceType] = useState<"personalized" | "general">("personalized");

  const { data: advice, isLoading, refetch } = useQuery<DietAdvice>({
    queryKey: ['/api/diet-advice'],
    enabled: adviceType === "personalized",
  });

  const generateAdviceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/diet-advice/generate');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "New Advice Generated!",
        description: "Your personalized diet recommendations have been updated.",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to generate new advice. Please try again.",
        variant: "destructive",
      });
      console.error("Error generating advice:", error);
    },
  });

  const generalTips = [
    {
      icon: <Heart className="h-5 w-5 text-red-500" />,
      title: "Stay Hydrated",
      tip: "Drink at least 8 glasses of water daily. Proper hydration supports metabolism and helps control appetite."
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      title: "Balanced Meals",
      tip: "Include protein, healthy fats, and complex carbs in each meal for sustained energy and satiety."
    },
    {
      icon: <Brain className="h-5 w-5 text-purple-500" />,
      title: "Mindful Eating",
      tip: "Eat slowly and pay attention to hunger cues. This helps prevent overeating and improves digestion."
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      title: "Portion Control",
      tip: "Use smaller plates and fill half with vegetables, quarter with protein, and quarter with whole grains."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-back-to-home"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <h1 className="text-xl font-bold">Diet Advice</h1>
            </div>
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setAdviceType("personalized")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              adviceType === "personalized"
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
            data-testid="button-personalized-advice"
          >
            Personalized
          </button>
          <button
            onClick={() => setAdviceType("general")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              adviceType === "general"
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
            data-testid="button-general-tips"
          >
            General Tips
          </button>
        </div>

        {adviceType === "personalized" ? (
          <>
            {/* Generate New Advice Button */}
            <div className="mb-6">
              <button
                onClick={() => generateAdviceMutation.mutate()}
                disabled={generateAdviceMutation.isPending || isLoading}
                className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                data-testid="button-generate-advice"
              >
                <RefreshCw className={`h-4 w-4 ${generateAdviceMutation.isPending ? 'animate-spin' : ''}`} />
                <span>{generateAdviceMutation.isPending ? 'Generating...' : 'Get New Advice'}</span>
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-20 bg-muted rounded mb-4"></div>
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </div>
            ) : advice ? (
              <div className="space-y-6">
                {advice.personalizedAdvice && advice.personalizedAdvice.length > 0 && (
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-3 flex items-center">
                      <Brain className="h-4 w-4 mr-2" />
                      Personalized Recommendations
                    </h3>
                    <div className="space-y-2">
                      {advice.personalizedAdvice.map((tip, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          • {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {advice.nutritionGoals && advice.nutritionGoals.length > 0 && (
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Nutrition Goals
                    </h3>
                    <div className="space-y-2">
                      {advice.nutritionGoals.map((goal, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          • {goal}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {advice.improvements && advice.improvements.length > 0 && (
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-3 flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      Areas to Improve
                    </h3>
                    <div className="space-y-2">
                      {advice.improvements.map((improvement, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          • {improvement}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Advice Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add some meals to your diary to get personalized recommendations
                </p>
                <Link href="/diary">
                  <button 
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    data-testid="button-view-diary"
                  >
                    View Diary
                  </button>
                </Link>
              </div>
            )}
          </>
        ) : (
          /* General Tips */
          <div className="space-y-4">
            {generalTips.map((tip, index) => (
              <div key={index} className="bg-card border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {tip.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">{tip.tip}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-primary mb-2">💡 Pro Tip</h3>
              <p className="text-sm text-primary/80">
                Track your meals consistently with PlateMate to get personalized advice based on your eating patterns and nutrition goals!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}