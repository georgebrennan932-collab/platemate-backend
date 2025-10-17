import { ArrowLeft, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { NutritionGoals } from "@/components/nutrition-goals";
import { DropdownNavigation } from "@/components/dropdown-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";

export function GoalsPage() {
  return (
    <div className="min-h-screen text-foreground" style={{background: 'var(--bg-gradient)'}}>
      {/* Header */}
      <div className="bg-card border-b">
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
              <h1 className="text-xl font-bold">Nutrition Goals</h1>
            </div>
            <Link href="/help">
              <button 
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                data-testid="button-help-goals"
                title="Help & Support"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        <NutritionGoals />
      </div>
      
      {/* Bottom Navigation */}
      <DropdownNavigation />
      
      {/* Bottom Help Section */}
      <BottomHelpSection />
    </div>
  );
}

export default GoalsPage;