import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";
import { ChefHat, Clock, Users, ExternalLink, Filter, Utensils, ArrowLeft } from "lucide-react";

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
      const dietParam = selectedDiet === 'all' ? '' : selectedDiet;
      const url = `/api/recipes/${dietParam}/${searchQuery || ''}`;
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
    staleTime: 30000 // Cache for 30 seconds
  });

  const filteredRecipes = recipes || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary/5 border-b border-primary/10 p-4 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-primary/10"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <ChefHat className="h-6 w-6" />
                Recipe Collection
              </h1>
              <p className="text-sm text-muted-foreground">
                Discover healthy recipes tailored to your dietary needs
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
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
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {isLoading ? (
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
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
                    
                    <div className="text-right ml-4">
                      <div className="text-lg font-semibold text-primary">
                        {recipe.calories}
                      </div>
                      <div className="text-xs text-muted-foreground">calories</div>
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

                  {/* Ingredients Preview */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ingredients:</h4>
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients.slice(0, 6).map((ingredient, idx) => (
                        <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {ingredient}
                        </span>
                      ))}
                      {recipe.ingredients.length > 6 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{recipe.ingredients.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Instructions Preview */}
                  {recipe.instructions && recipe.instructions.length > 0 && (
                    <div className="bg-muted/50 rounded p-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <ChefHat className="h-4 w-4 mr-1" />
                        How to Make It:
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        {recipe.instructions.slice(0, 3).map((instruction, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-primary font-medium mr-2 flex-shrink-0">{idx + 1}.</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                        {recipe.instructions.length > 3 && (
                          <li className="text-xs text-muted-foreground italic">
                            ...and {recipe.instructions.length - 3} more steps
                          </li>
                        )}
                      </ol>
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
    </div>
  );
}

export default RecipesPage;