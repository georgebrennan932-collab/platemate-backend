import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Lightbulb, TrendingUp, Heart, Brain, Zap, RefreshCw, Utensils, Clock, Users, Send, Bot, ChefHat, ExternalLink, Mic, MicOff } from "lucide-react";
import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MealIdea {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  benefits: string;
  recipeLink?: string;
  cookingInstructions?: string[];
}

interface DietAdvice {
  personalizedAdvice: string[];
  nutritionGoals: string[];
  improvements: string[];
  generalTips: string[];
  mealIdeas?: MealIdea[];
}

interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
}

export function DietAdvicePage() {
  const { toast } = useToast();
  const [adviceType, setAdviceType] = useState<"personalized" | "general">("personalized");
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechService, setSpeechService] = useState<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    const initSpeech = async () => {
      try {
        const { speechService: service } = await import('@/lib/speech-service');
        setSpeechService(service);
        setSpeechSupported(service.isSupported());
        
        // Register a temporary command for capturing questions
        service.registerCommand('capture-question', {
          command: 'capture-question',
          phrases: [], // We'll use this differently
          action: () => {}, // Won't be used
          description: 'Capture nutrition question',
          category: 'action' as any
        });

        // Set up speech event handler
        const handleSpeechEvent = (event: any) => {
          if (event.type === 'listening-start') {
            setIsListening(true);
          } else if (event.type === 'listening-end') {
            setIsListening(false);
          }
        };

        service.on(handleSpeechEvent);

        return () => {
          service.off(handleSpeechEvent);
        };
      } catch (error) {
        console.log('Speech recognition not available');
        setSpeechSupported(false);
      }
    };

    initSpeech();
  }, []);

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

  const askAIMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest('POST', '/api/ai/ask', { question });
      return await response.json();
    },
    onSuccess: (data) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        question: data.question,
        answer: data.answer,
        timestamp: data.timestamp
      };
      setChatHistory(prev => [newMessage, ...prev]);
      setQuestion("");
      toast({
        title: "AI Response Received!",
        description: "Your nutrition question has been answered.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      console.error("Error asking AI:", error);
    },
  });

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    askAIMutation.mutate(question.trim());
  };

  const handleVoiceInput = async () => {
    if (!speechService || !speechSupported) return;

    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      return;
    }

    try {
      // Create a custom recognition instance for question capture
      const recognition = new (window.SpeechRecognition || (window as any).webkitSpeechRecognition)();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Ask your nutrition question now",
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        toast({
          title: "Question captured!",
          description: "Your voice question has been converted to text",
        });
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Speech Error",
          description: "Could not recognize speech. Please try again.",
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (error) {
      toast({
        title: "Speech Not Available",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive",
      });
    }
  };

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
              <Link href="/scan">
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
        {/* Ask AI Section */}
        <Card className="health-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Ask AI Nutrition Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAskAI} className="flex gap-2">
              <Input
                placeholder={isListening ? "Listening..." : "Ask me anything about nutrition..."}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={askAIMutation.isPending || isListening}
                data-testid="input-ai-question"
                className="flex-1"
              />
              
              {speechSupported && (
                <Button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={askAIMutation.isPending}
                  variant={isListening ? "destructive" : "outline"}
                  className={isListening ? "animate-pulse" : ""}
                  data-testid="button-voice-input"
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={askAIMutation.isPending || !question.trim()}
                className="vibrant-button"
                data-testid="button-ask-ai"
              >
                {askAIMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>

            {/* Chat History */}
            {chatHistory.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {chatHistory.map((message) => (
                  <div key={message.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-medium text-primary">
                          Q: {message.question}
                        </div>
                        <div className="text-sm text-muted-foreground leading-relaxed">
                          {message.answer}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

                {advice.mealIdeas && advice.mealIdeas.length > 0 && (
                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-primary flex items-center">
                        <Utensils className="h-4 w-4 mr-2" />
                        Personalized Meal Ideas
                      </h3>
                      <Link href="/recipes">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-2"
                          data-testid="button-view-recipes"
                        >
                          <ChefHat className="h-4 w-4" />
                          Browse Recipes
                        </Button>
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {advice.mealIdeas.map((meal, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-muted/30" data-testid={`card-meal-${index}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  meal.mealType === 'breakfast' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  meal.mealType === 'lunch' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                  meal.mealType === 'dinner' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                }`}>
                                  {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                                </span>
                              </div>
                              <h4 className="font-semibold" data-testid={`text-meal-name-${index}`}>
                                {meal.name}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {meal.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {meal.calories} cal
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mb-3 text-xs text-muted-foreground">
                            <span>Protein: {meal.protein}g</span>
                            <span>Carbs: {meal.carbs}g</span>
                            <span>Fat: {meal.fat}g</span>
                          </div>

                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-1">Ingredients:</h5>
                            <div className="flex flex-wrap gap-1">
                              {meal.ingredients.map((ingredient, idx) => (
                                <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                                  {ingredient}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="bg-primary/10 rounded p-3 mb-3">
                            <h5 className="text-sm font-medium mb-1">Why this meal?</h5>
                            <p className="text-sm text-muted-foreground">
                              {meal.benefits}
                            </p>
                          </div>


                          {meal.cookingInstructions && meal.cookingInstructions.length > 0 && (
                            <div className="bg-muted/50 rounded p-3 mb-3">
                              <h5 className="text-sm font-medium mb-2 flex items-center">
                                <ChefHat className="h-4 w-4 mr-1" />
                                How to Make It:
                              </h5>
                              <ol className="text-sm text-muted-foreground space-y-1">
                                {meal.cookingInstructions.map((instruction, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-primary font-medium mr-2 flex-shrink-0">{idx + 1}.</span>
                                    <span>{instruction}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {meal.recipeLink && (
                            <div className="flex justify-center">
                              <a 
                                href={meal.recipeLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                data-testid={`button-recipe-link-${index}`}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Full Recipe
                              </a>
                            </div>
                          )}
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
      
      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  );
}