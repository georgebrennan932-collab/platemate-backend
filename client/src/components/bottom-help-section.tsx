import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChefHat, Filter, ArrowRight, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DIETARY_REQUIREMENTS = [
  { value: "", label: "All Recipes" },
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

export function BottomHelpSection() {
  const [selectedDiet, setSelectedDiet] = useState("");
  const [, navigate] = useLocation();

  const handleViewRecipes = () => {
    const url = selectedDiet ? `/recipes?diet=${selectedDiet}` : '/recipes';
    navigate(url);
  };

  return (
    <div className="mt-8 mb-24 px-4">
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <ChefHat className="h-5 w-5" />
            Tailored Recipes for You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Discover healthy recipes perfectly matched to your dietary needs and preferences.
          </p>
          
          {/* Dietary Requirements Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Choose Your Dietary Preference:
            </label>
            <Select value={selectedDiet} onValueChange={setSelectedDiet}>
              <SelectTrigger className="w-full" data-testid="select-bottom-dietary-filter">
                <SelectValue placeholder="Select dietary requirements" />
              </SelectTrigger>
              <SelectContent>
                {DIETARY_REQUIREMENTS.map((diet) => (
                  <SelectItem key={diet.value} value={diet.value} data-testid={`option-bottom-diet-${diet.value || 'all'}`}>
                    {diet.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleViewRecipes}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium"
              data-testid="button-view-tailored-recipes"
            >
              <ChefHat className="h-4 w-4 mr-2" />
              {selectedDiet ? `View ${DIETARY_REQUIREMENTS.find(d => d.value === selectedDiet)?.label} Recipes` : 'Browse All Recipes'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <Link href="/help">
              <Button 
                variant="outline" 
                size="sm" 
                className="px-4"
                data-testid="button-quick-help"
                title="Get help and support"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {selectedDiet && (
            <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2">
              <strong>Perfect match!</strong> We'll show you {DIETARY_REQUIREMENTS.find(d => d.value === selectedDiet)?.label.toLowerCase()} recipes tailored to your dietary needs.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}