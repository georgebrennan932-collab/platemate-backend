import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChefHat, Filter, ArrowRight, HelpCircle, MessageCircle, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export function BottomHelpSection() {
  const [selectedDiet, setSelectedDiet] = useState("all");
  const [, navigate] = useLocation();

  const handleViewRecipes = () => {
    const url = selectedDiet && selectedDiet !== 'all' ? `/recipes?diet=${selectedDiet}` : '/recipes';
    console.log('Navigating to:', url);
    // Use window.location for more reliable navigation
    window.location.href = url;
  };

  return (
    <div className="mt-8 mb-24 px-4 space-y-6">
      {/* Tailored Recipes Section */}
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

          {/* Action Button */}
          <Button 
            onClick={handleViewRecipes}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium"
            data-testid="button-view-tailored-recipes"
            type="button"
          >
            <ChefHat className="h-4 w-4 mr-2" />
            {selectedDiet && selectedDiet !== 'all' ? `View ${DIETARY_REQUIREMENTS.find(d => d.value === selectedDiet)?.label} Recipes` : 'Browse All Recipes'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          {selectedDiet && selectedDiet !== 'all' && (
            <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2">
              <strong>Perfect match!</strong> We'll show you {selectedDiet.replace('-', ' ')} recipes tailored to your dietary needs.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/help">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-auto p-3 flex flex-col items-center gap-2 hover:bg-background"
                data-testid="button-help-guide"
              >
                <FileText className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-xs">User Guide</div>
                  <div className="text-xs text-muted-foreground">How to use PlateMate</div>
                </div>
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-auto p-3 flex flex-col items-center gap-2 hover:bg-background"
              onClick={() => window.open('mailto:support@platemate.app', '_blank')}
              data-testid="button-contact-support"
            >
              <MessageCircle className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium text-xs">Contact Support</div>
                <div className="text-xs text-muted-foreground">Get personalized help</div>
              </div>
            </Button>
            
            <Link href="/injection-advice">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-auto p-3 flex flex-col items-center gap-2 hover:bg-background"
                data-testid="button-medication-help"
              >
                <ExternalLink className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-xs">Medication Guide</div>
                  <div className="text-xs text-muted-foreground">Weight loss injections</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}