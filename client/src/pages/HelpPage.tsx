import React from "react";
import { ArrowLeft, Camera, Droplets, Target, TrendingUp, Book, Lightbulb, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";

export function HelpPage() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <button 
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                data-testid="button-back-to-home"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <h1 className="text-xl font-bold">Help & Support</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Book className="h-5 w-5 text-primary" />
              <span>Quick Start Guide</span>
            </CardTitle>
            <CardDescription>Get started with PlateMate in 4 easy steps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium">Take a Photo</h4>
                  <p className="text-sm text-muted-foreground">Snap a picture of your food using your camera or upload an existing image.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium">AI Analysis</h4>
                  <p className="text-sm text-muted-foreground">Our AI identifies food items and calculates nutritional information automatically.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium">Log Your Drinks</h4>
                  <p className="text-sm text-muted-foreground">Track your hydration and beverage calories using the drinks logging feature.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h4 className="font-medium">Monitor Your Progress</h4>
                  <p className="text-sm text-muted-foreground">Check your diary to see daily progress and analytics for weekly trends.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Explanations */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use PlateMate Features</CardTitle>
            <CardDescription>Detailed guides for each feature</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Food Scanning */}
            <Collapsible open={openSections.scanning} onOpenChange={() => toggleSection('scanning')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="help-food-scanning">
                <div className="flex items-center space-x-2">
                  <Camera className="h-4 w-4" />
                  <span className="font-medium">Food Scanning & Analysis</span>
                </div>
                {openSections.scanning ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 text-sm">
                  <p><strong>How it works:</strong> Take a photo of your meal and our AI analyzes the food items, estimating portions and nutrition content.</p>
                  
                  <div className="space-y-2">
                    <p><strong>Tips for better results:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Ensure good lighting when taking photos</li>
                      <li>Include a reference object (like a coin) for size estimation</li>
                      <li>Capture the entire meal in one photo</li>
                      <li>Avoid blurry or distant shots</li>
                      <li>Try to separate different food items visually</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <p><strong>What you get:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Identified food items with portion estimates</li>
                      <li>Total calories for the meal</li>
                      <li>Breakdown of protein, carbs, and fat</li>
                      <li>Confidence score for the analysis</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Drinks Logging */}
            <Collapsible open={openSections.drinks} onOpenChange={() => toggleSection('drinks')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="help-drinks-logging">
                <div className="flex items-center space-x-2">
                  <Droplets className="h-4 w-4" />
                  <span className="font-medium">Drinks & Hydration Tracking</span>
                </div>
                {openSections.drinks ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 text-sm">
                  <p><strong>Track all beverages:</strong> Log water, coffee, tea, juices, and alcoholic drinks to monitor hydration and calorie intake.</p>
                  
                  <div className="space-y-2">
                    <p><strong>Features:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Quick logging with preset amounts (250ml, 500ml, etc.)</li>
                      <li>Custom drink types and volumes</li>
                      <li>Automatic calorie and caffeine tracking</li>
                      <li>Daily hydration goals and progress</li>
                      <li>Alcohol units calculation for alcoholic beverages</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Goals Setting */}
            <Collapsible open={openSections.goals} onOpenChange={() => toggleSection('goals')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="help-goals-setting">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span className="font-medium">Setting Nutrition Goals</span>
                </div>
                {openSections.goals ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 text-sm">
                  <p><strong>Personalized targets:</strong> Set daily calorie and macronutrient goals based on your lifestyle and objectives.</p>
                  
                  <div className="space-y-2">
                    <p><strong>Goal types:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Daily calorie targets</li>
                      <li>Protein intake goals (great for fitness)</li>
                      <li>Carbohydrate limits</li>
                      <li>Fat intake monitoring</li>
                      <li>Hydration targets</li>
                    </ul>
                  </div>
                  
                  <p><strong>Progress tracking:</strong> See how close you are to meeting your daily goals with visual progress bars and weekly summaries.</p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Progress Tracking */}
            <Collapsible open={openSections.progress} onOpenChange={() => toggleSection('progress')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="help-progress-tracking">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Progress Tracking & Analytics</span>
                </div>
                {openSections.progress ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 text-sm">
                  <p><strong>Comprehensive insights:</strong> View your nutrition patterns and progress over time with detailed analytics.</p>
                  
                  <div className="space-y-2">
                    <p><strong>Available analytics:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Daily nutrition summaries</li>
                      <li>Weekly trend analysis</li>
                      <li>Food frequency tracking</li>
                      <li>Goal achievement rates</li>
                      <li>Calorie intake patterns</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

          </CardContent>
        </Card>

        {/* Tips & Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <span>Tips & Best Practices</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">For accurate tracking:</h4>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>Log your meals as soon as possible after eating</li>
                <li>Include snacks and small bites in your tracking</li>
                <li>Use consistent portion sizes when possible</li>
                <li>Don't forget to log beverages, especially those with calories</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">For better results:</h4>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>Review your weekly patterns to identify trends</li>
                <li>Adjust your goals based on your progress and how you feel</li>
                <li>Use the coaching feature for personalized advice</li>
                <li>Take photos from multiple angles for complex meals</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Support */}
        <Card>
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>If you're experiencing issues or have questions not covered here:</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Check that your device camera permissions are enabled</li>
              <li>Ensure you have a stable internet connection for AI analysis</li>
              <li>Try restarting the app if features aren't working properly</li>
              <li>Clear your browser cache if using the web version</li>
            </ul>
            
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="font-medium text-center">PlateMate - Your AI-Powered Nutrition Companion</p>
              <p className="text-center text-muted-foreground text-xs mt-1">Making healthy eating easier with intelligent food recognition</p>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions and Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Suggestions and Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>We value your feedback and suggestions to help improve PlateMate!</p>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="font-medium text-blue-900 dark:text-blue-100">Send us your thoughts:</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">georgebrennan0811.suggestions@outlook.com</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}