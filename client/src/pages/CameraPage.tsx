import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { CameraInterface } from "@/components/camera-interface";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FoodAnalysis } from "@shared/schema";

export function CameraPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalysisStart = () => {
    console.log("📸 Analysis starting...");
    setIsAnalyzing(true);
  };

  const handleAnalysisSuccess = (data: FoodAnalysis) => {
    console.log("✅ Analysis successful:", data);
    setIsAnalyzing(false);
    toast({
      title: "Food Analysis Complete!",
      description: "Your meal has been analyzed. Check your diary to see the entry.",
    });
    
    // Redirect to the diary page to see the analyzed meal
    setLocation(`/diary`);
  };

  const handleAnalysisError = (error: string) => {
    console.error("❌ Analysis failed:", error);
    setIsAnalyzing(false);
    toast({
      title: "Analysis Failed",
      description: error || "Failed to analyze the image. Please try again.",
      variant: "destructive",
    });
  };

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
              <h1 className="text-xl font-bold">Scan Your Food</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-primary" />
              <Link href="/help">
                <button 
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-help-camera"
                  title="Help & Support"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Instructions Card */}
        <Card className="health-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-primary" />
              Food Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Take a photo of your meal or upload an image to get instant nutritional analysis powered by AI.
            </p>
            <div className="bg-primary/10 rounded-lg p-3">
              <h4 className="text-sm font-medium text-primary mb-2">Tips for best results:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Ensure good lighting</li>
                <li>• Include the entire meal in frame</li>
                <li>• Try to separate different foods visually</li>
                <li>• Add a reference object (like a coin) for size estimation</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Camera Interface */}
        <Card className="health-card">
          <CardContent className="p-6">
            {isAnalyzing && (
              <div className="mb-4 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Analyzing your food...
                </div>
              </div>
            )}
            <CameraInterface
              onAnalysisStart={handleAnalysisStart}
              onAnalysisSuccess={handleAnalysisSuccess}
              onAnalysisError={handleAnalysisError}
            />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="health-card">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/diary">
              <Button variant="outline" className="w-full justify-start" data-testid="button-view-diary">
                View Food Diary
              </Button>
            </Link>
            <Link href="/goals">
              <Button variant="outline" className="w-full justify-start" data-testid="button-nutrition-goals">
                Set Nutrition Goals
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
      
      {/* Bottom Help Section */}
      <BottomHelpSection />
    </div>
  );
}

export default CameraPage;