import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";
import { ChefHat, Clock, Users, ExternalLink, Filter, Utensils, ArrowLeft, RefreshCw, Heart, Bookmark, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { soundService } from "@/lib/sound-service";

const DIETARY_REQUIREMENTS = [
  { value: "all", label: "All Recipes" },
  { value: "keto", label: "Keto" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "high-protein", label: "High Protein" },
  { value: "high-fiber", label: "High Fiber" },
  { value: "low-residue", label: "Low Residue" },
  { value: "gluten-free", label: "Gluten Free" },
  { value: "dairy-free", label: "Dairy Free" },
  { value: "low-carb", label: "Low Carb" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" }
];

interface Recipe {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  prepTime: number;
  cookTime: number;
  difficulty: "Easy" | "Medium" | "Hard";
  ingredients: string[];
  instructions: string[];
  tags: string[];
  dietaryInfo: string[];
  recipeLink?: string;
}

export function RecipesPage() {
  const [selectedDiet, setSelectedDiet] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());
  const [expandedInstructions, setExpandedInstructions] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"all" | "saved">("all");
  const { toast } = useToast();

  // Get diet filter from URL parameters if provided
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dietParam = urlParams.get('diet');
    if (dietParam) {
      setSelectedDiet(dietParam);
    } else {
      setSelectedDiet('all');
    }
  }, []);

  // Update URL when diet filter changes
  const handleDietChange = (newDiet: string) => {
    setSelectedDiet(newDiet);
    const newUrl = newDiet && newDiet !== 'all' ? `/recipes?diet=${newDiet}` : '/recipes';
    navigate(newUrl);
  };

  const { data: recipes, isLoading, error } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes", selectedDiet === 'all' ? '' : selectedDiet, searchQuery],
    queryFn: async () => {
      // Build URL properly to avoid double slashes
      let url = '/api/recipes';
      const dietParam = selectedDiet === 'all' ? '' : selectedDiet;
      
      if (dietParam && searchQuery) {
        url = `/api/recipes/${dietParam}/${searchQuery}`;
      } else if (dietParam) {
        url = `/api/recipes/${dietParam}`;
      } else if (searchQuery) {
        url = `/api/recipes/_/${searchQuery}`;
      }
      
      console.log('Fetching recipes from:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch recipes: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Received recipes:', data);
      return data;
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000, // Cache for 30 seconds
    enabled: viewMode === "all"
  });

  // Fetch saved recipes (always enabled to check save status)
  const { data: savedRecipes, isLoading: savedLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes/saved"],
    queryFn: async () => {
      // Add timestamp to bust HTTP cache
      const response = await fetch(`/api/recipes/saved?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch saved recipes: ${response.status}`);
      }
      return response.json();
    }
  });

  // Refresh recipes mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/recipes/refresh",
        { dietary: selectedDiet === 'all' ? '' : selectedDiet }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      soundService.playSuccess();
      toast({
        title: "Recipes refreshed!",
        description: "New recipes have been generated for you.",
      });
    },
    onError: () => {
      soundService.playError();
      toast({
        title: "Refresh failed",
        description: "Unable to refresh recipes. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Save recipe mutation
  const saveMutation = useMutation({
    mutationFn: async (recipe: Recipe) => {
      return apiRequest(
        "POST",
        "/api/recipes/save",
        {
          recipeId: recipe.id,
          recipeName: recipe.name,
          recipeData: recipe
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/saved"] });
      soundService.playSuccess();
      toast({
        title: "Recipe saved!",
        description: "Added to your saved recipes.",
      });
    },
    onError: (error: any) => {
      soundService.playError();
      toast({
        title: "Save failed",
        description: error.message || "Unable to save recipe.",
        variant: "destructive"
      });
    }
  });

  // Unsave recipe mutation
  const unsaveMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      return apiRequest("DELETE", `/api/recipes/save/${recipeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/saved"], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ["/api/recipes/saved"] });
      soundService.playClick();
      toast({
        title: "Recipe removed",
        description: "Removed from your saved recipes.",
      });
    },
    onError: () => {
      soundService.playError();
      toast({
        title: "Remove failed",
        description: "Unable to remove recipe.",
        variant: "destructive"
      });
    }
  });

  const filteredRecipes = viewMode === "all" ? (recipes || []) : (savedRecipes || []);
  const currentLoading = viewMode === "all" ? isLoading : savedLoading;

  // Check if a recipe is saved
  const isSaved = (recipeId: string) => {
    return savedRecipes?.some(r => r.id === recipeId) || false;
  };

  const handleSaveToggle = (recipe: Recipe) => {
    if (isSaved(recipe.id)) {
      unsaveMutation.mutate(recipe.id);
    } else {
      saveMutation.mutate(recipe);
    }
  };

  const toggleIngredients = (recipeId: string) => {
    setExpandedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
      }
      return newSet;
    });
  };

  const toggleInstructions = (recipeId: string) => {
    setExpandedInstructions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
      }
      return newSet;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen text-foreground" 
      style={{background: 'var(--bg-gradient)'}}
    >
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Link to="/">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <h1 className="text-xl font-bold">Recipe Collection</h1>
            </div>
            {viewMode === "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                data-testid="button-refresh-recipes"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("all")}
              className="flex-1"
              data-testid="button-view-all"
            >
              <Utensils className="h-4 w-4 mr-2" />
              All Recipes
            </Button>
            <Button
              variant={viewMode === "saved" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("saved")}
              className="flex-1"
              data-testid="button-view-saved"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Saved
            </Button>
          </div>
          
          {/* Filters - only show for All Recipes view */}
          {viewMode === "all" && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Select value={selectedDiet} onValueChange={handleDietChange}>
                    <SelectTrigger className="pl-10" data-testid="select-dietary-filter">
                      <SelectValue placeholder="Filter by dietary requirements" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIETARY_REQUIREMENTS.map((diet) => (
                        <SelectItem key={diet.value} value={diet.value} data-testid={`option-diet-${diet.value || 'all'}`}>
                          {diet.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Filter Display */}
              {selectedDiet && selectedDiet !== 'all' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filtering by:</span>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {DIETARY_REQUIREMENTS.find(d => d.value === selectedDiet)?.label}
                    <button 
                      onClick={() => setSelectedDiet("all")}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                      data-testid="button-clear-filter"
                    >
                      ×
                    </button>
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {currentLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Unable to Load Recipes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              There was an error loading recipes. Please try again later.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              data-testid="button-retry-recipes"
            >
              Try Again
            </Button>
          </div>
        ) : !Array.isArray(filteredRecipes) || filteredRecipes.length === 0 ? (
          <div className="text-center py-12">
            <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {selectedDiet && selectedDiet !== 'all' ? "No Recipes Found" : "Loading Delicious Recipes..."}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedDiet && selectedDiet !== 'all'
                ? `No recipes match your ${DIETARY_REQUIREMENTS.find(d => d.value === selectedDiet)?.label} dietary requirements yet.`
                : "Our AI is preparing some amazing recipes for you!"
              }
            </p>
            {selectedDiet && selectedDiet !== 'all' && (
              <Button 
                onClick={() => setSelectedDiet("all")}
                variant="outline"
                data-testid="button-clear-filter-empty"
              >
                View All Recipes
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecipes.map((recipe: Recipe, index: number) => (
              <Card key={recipe.id || index} className="overflow-hidden" data-testid={`card-recipe-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1" data-testid={`text-recipe-name-${index}`}>
                        {recipe.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mb-2">
                        {recipe.description}
                      </p>
                      
                      {/* Recipe Meta */}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recipe.prepTime + recipe.cookTime} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {recipe.servings} servings
                        </div>
                        <div className="px-2 py-1 bg-primary/10 text-primary rounded">
                          {recipe.difficulty}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {viewMode === "saved" ? (
                        <button
                          onClick={() => unsaveMutation.mutate(recipe.id)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                          disabled={unsaveMutation.isPending}
                          data-testid={`button-remove-recipe-${index}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveToggle(recipe)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          disabled={saveMutation.isPending || unsaveMutation.isPending}
                          data-testid={`button-save-recipe-${index}`}
                        >
                          {isSaved(recipe.id) ? (
                            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                          ) : (
                            <Heart className="h-5 w-5 text-muted-foreground hover:text-red-500" />
                          )}
                        </button>
                      )}
                      <div className="text-right">
                        <div className="text-lg font-semibold text-primary">
                          {recipe.calories}
                        </div>
                        <div className="text-xs text-muted-foreground">calories</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Nutrition Info */}
                  <div className="flex justify-between items-center text-xs text-muted-foreground bg-muted/30 rounded p-2">
                    <span>Protein: {recipe.protein}g</span>
                    <span>Carbs: {recipe.carbs}g</span>
                    <span>Fat: {recipe.fat}g</span>
                  </div>

                  {/* Dietary Tags */}
                  {recipe.dietaryInfo && recipe.dietaryInfo.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.dietaryInfo.map((diet, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {diet}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Ingredients */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ingredients:</h4>
                    <div className="flex flex-wrap gap-1">
                      {(expandedIngredients.has(recipe.id) ? recipe.ingredients : recipe.ingredients.slice(0, 6)).map((ingredient, idx) => (
                        <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {ingredient}
                        </span>
                      ))}
                      {recipe.ingredients.length > 6 && !expandedIngredients.has(recipe.id) && (
                        <button
                          onClick={() => toggleIngredients(recipe.id)}
                          className="text-xs text-primary hover:underline px-2 py-1 font-medium"
                          data-testid={`button-show-all-ingredients-${index}`}
                        >
                          +{recipe.ingredients.length - 6} more
                        </button>
                      )}
                      {expandedIngredients.has(recipe.id) && recipe.ingredients.length > 6 && (
                        <button
                          onClick={() => toggleIngredients(recipe.id)}
                          className="text-xs text-primary hover:underline px-2 py-1 font-medium"
                          data-testid={`button-show-less-ingredients-${index}`}
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  {recipe.instructions && recipe.instructions.length > 0 && (
                    <div className="bg-muted/50 rounded p-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <ChefHat className="h-4 w-4 mr-1" />
                        How to Make It:
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        {(expandedInstructions.has(recipe.id) ? recipe.instructions : recipe.instructions.slice(0, 3)).map((instruction, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-primary font-medium mr-2 flex-shrink-0">{idx + 1}.</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ol>
                      {recipe.instructions.length > 3 && (
                        <button
                          onClick={() => toggleInstructions(recipe.id)}
                          className="text-xs text-primary hover:underline mt-2 font-medium"
                          data-testid={`button-toggle-instructions-${index}`}
                        >
                          {expandedInstructions.has(recipe.id) 
                            ? 'Show less' 
                            : `Show all ${recipe.instructions.length} steps`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Recipe Link */}
                  {recipe.recipeLink && (
                    <div className="flex justify-center pt-2">
                      <a 
                        href={recipe.recipeLink} 
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Bottom Help Section */}
      <BottomHelpSection />
    </motion.div>
  );
}

export default RecipesPage;