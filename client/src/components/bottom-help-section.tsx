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
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-[2.5rem] p-6 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8)] border border-slate-600/30 backdrop-blur-xl">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5"></div>
        
        {/* Header */}
        <div className="text-center mb-6 relative z-10">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-2xl shadow-orange-500/25 border border-white/10">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-white text-xl font-bold">Tailored Recipes for You</h3>
          </div>
          <p className="text-gray-300 text-sm">
            Discover healthy recipes perfectly matched to your dietary needs and preferences
          </p>
        </div>

        {/* Dietary Requirements Dropdown */}
        <div className="space-y-4 relative z-10">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Filter className="h-4 w-4 text-orange-400" />
              Choose Your Dietary Preference:
            </label>
            <Select value={selectedDiet} onValueChange={setSelectedDiet}>
              <SelectTrigger 
                className="bg-slate-800/80 border-slate-600/50 text-white backdrop-blur-xl hover:bg-slate-700/80 transition-all duration-300"
                data-testid="select-bottom-dietary-filter"
              >
                <SelectValue placeholder="Select dietary requirements" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 text-white">
                {DIETARY_REQUIREMENTS.map((diet) => (
                  <SelectItem 
                    key={diet.value} 
                    value={diet.value}
                    className="hover:bg-slate-700 focus:bg-slate-700"
                    data-testid={`option-bottom-diet-${diet.value || 'all'}`}
                  >
                    {diet.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <button
            onClick={handleViewRecipes}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 px-6 rounded-2xl font-semibold transition-all duration-300 shadow-2xl hover:scale-[1.02] hover:shadow-orange-500/40 border border-white/10 backdrop-blur-xl flex items-center justify-center space-x-3"
            data-testid="button-view-tailored-recipes"
            type="button"
          >
            <ChefHat className="h-5 w-5" />
            <span>{selectedDiet && selectedDiet !== 'all' ? `View ${DIETARY_REQUIREMENTS.find(d => d.value === selectedDiet)?.label} Recipes` : 'Browse All Recipes'}</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          
          {selectedDiet && selectedDiet !== 'all' && (
            <div className="text-xs text-orange-200 bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-2xl p-3 border border-orange-500/30 backdrop-blur-xl">
              <strong>Perfect match!</strong> We'll show you {selectedDiet.replace('-', ' ')} recipes tailored to your dietary needs.
            </div>
          )}
        </div>
      </div>

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
                className="w-full h-auto p-3 flex flex-col items-center gap-2 bg-slate-800/80 hover:bg-slate-700/90 border border-slate-600/50 backdrop-blur-xl rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                data-testid="button-medication-help"
              >
                <ExternalLink className="h-5 w-5 text-blue-400" />
                <div className="text-center">
                  <div className="font-medium text-xs text-white">Medication Guide</div>
                  <div className="text-xs text-blue-200">Weight loss injections</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}