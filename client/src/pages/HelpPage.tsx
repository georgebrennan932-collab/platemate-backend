import React from "react";
import { ArrowLeft, Camera, Droplets, Target, TrendingUp, Book, Lightbulb, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

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
            <CardDescription>
              Get started with PlateMate in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium">Set Your Nutrition Goals</h4>
                  <p className="text-sm text-muted-foreground">Visit the Goals page to set your daily targets for calories, protein, carbs, fat, and water intake.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium">Scan Your First Meal</h4>
                  <p className="text-sm text-muted-foreground">Use the camera to take a photo of your food. Our AI will analyze it and estimate nutrition content.</p>
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

            {/* Drink Logging */}
            <Collapsible open={openSections.drinks} onOpenChange={() => toggleSection('drinks')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="help-drink-logging">
                <div className="flex items-center space-x-2">
                  <Droplets className="h-4 w-4" />
                  <span className="font-medium">Drink Logging</span>
                </div>
                {openSections.drinks ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 text-sm">
                  <p><strong>Track all your beverages:</strong> Log water, coffee, tea, juices, sodas, and alcoholic drinks to monitor hydration and calorie intake.</p>
                  
                  <div className="space-y-2">
                    <p><strong>What to log:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Water intake for hydration tracking</li>
                      <li>Caffeinated drinks (coffee, tea, energy drinks)</li>
                      <li>Caloric beverages (juices, sodas, smoothies)</li>
                      <li>Alcoholic drinks with alcohol content</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <p><strong>Information tracked:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Volume in milliliters</li>
                      <li>Calories per serving</li>
                      <li>Caffeine content (if applicable)</li>
                      <li>Sugar content</li>
                      <li>Alcohol units and content</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Nutrition Goals */}
            <Collapsible open={openSections.goals} onOpenChange={() => toggleSection('goals')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="help-nutrition-goals">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span className="font-medium">Nutrition Goals & Progress</span>
                </div>
                {openSections.goals ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 text-sm">
                  <p><strong>Set personalized targets:</strong> Define your daily nutrition goals based on your health objectives and dietary requirements.</p>
                  
                  <div className="space-y-2">
                    <p><strong>Daily goals you can set:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Daily calorie target</li>
                      <li>Protein intake in grams</li>
                      <li>Carbohydrate intake in grams</li>
                      <li>Fat intake in grams</li>
                      <li>Water consumption in milliliters</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <p><strong>Progress tracking:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Real-time progress bars in your diary</li>
                      <li>Daily achievement percentages</li>
                      <li>Visual indicators when goals are met</li>
                      <li>Weekly analytics and trends</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Analytics */}
            <Collapsible open={openSections.analytics} onOpenChange={() => toggleSection('analytics')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="help-analytics">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Analytics & Insights</span>
                </div>
                {openSections.analytics ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 text-sm">
                  <p><strong>Weekly insights:</strong> Access the analytics tab in your diary to see detailed trends and achievement patterns.</p>
                  
                  <div className="space-y-2">
                    <p><strong>What you'll see:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Days tracked this week</li>
                      <li>Total goals achieved</li>
                      <li>Achievement rates for each nutrient</li>
                      <li>Weekly averages vs. your targets</li>
                      <li>Daily overview with visual progress indicators</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <p><strong>Understanding the data:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>🟢 Green: Goal achieved (90%+ of target)</li>
                      <li>🟡 Yellow: Partial progress (70-89% of target)</li>
                      <li>🔵 Blue: Some progress (&lt;70% of target)</li>
                      <li>⚪ Gray: No data logged for that day</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Diet Advice */}
            <Collapsible open={openSections.advice} onOpenChange={() => toggleSection('advice')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="help-diet-advice">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-4 w-4" />
                  <span className="font-medium">AI Diet Advice</span>
                </div>
                {openSections.advice ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-3 text-sm">
                  <p><strong>Personalized recommendations:</strong> Get AI-powered diet advice based on your goals, preferences, and current nutrition patterns.</p>
                  
                  <div className="space-y-2">
                    <p><strong>Types of advice you can get:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Meal planning suggestions</li>
                      <li>Nutrient balance recommendations</li>
                      <li>Healthy substitution ideas</li>
                      <li>Goal achievement strategies</li>
                      <li>Dietary preference accommodations</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <p><strong>How to get better advice:</strong></p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Be specific about your goals and constraints</li>
                      <li>Mention any dietary restrictions or preferences</li>
                      <li>Ask about specific meals or food combinations</li>
                      <li>Include your activity level and lifestyle factors</li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <Collapsible open={openSections.faq1} onOpenChange={() => toggleSection('faq1')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="faq-accuracy">
                <span className="font-medium text-left">How accurate is the food analysis?</span>
                {openSections.faq1 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <p className="text-sm text-muted-foreground">
                  Our AI provides estimates based on visual analysis. Accuracy depends on image quality, lighting, and food visibility. 
                  For best results, ensure clear photos with good lighting and include reference objects for scale. 
                  The confidence score indicates how certain the AI is about its analysis.
                </p>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={openSections.faq2} onOpenChange={() => toggleSection('faq2')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="faq-privacy">
                <span className="font-medium text-left">Is my food data private?</span>
                {openSections.faq2 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <p className="text-sm text-muted-foreground">
                  Yes, your data is private and secure. Food photos are analyzed by AI and stored securely. 
                  Your nutrition data is tied to your account and only accessible by you. We do not share personal nutrition information.
                </p>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={openSections.faq3} onOpenChange={() => toggleSection('faq3')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="faq-goals">
                <span className="font-medium text-left">How do I set appropriate nutrition goals?</span>
                {openSections.faq3 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <p className="text-sm text-muted-foreground">
                  Default goals are provided as starting points (2000 calories, 150g protein, etc.). 
                  Consider your age, gender, activity level, and health objectives when setting targets. 
                  Consult with healthcare professionals for personalized recommendations, especially if you have specific health conditions.
                </p>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={openSections.faq4} onOpenChange={() => toggleSection('faq4')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="faq-missing">
                <span className="font-medium text-left">What if the AI doesn't recognize my food?</span>
                {openSections.faq4 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <p className="text-sm text-muted-foreground">
                  Try taking another photo with better lighting or from a different angle. 
                  The AI works best with common foods and clear images. For complex dishes or uncommon foods, 
                  the analysis might be less accurate. You can always log drinks manually to complement your food tracking.
                </p>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={openSections.faq5} onOpenChange={() => toggleSection('faq5')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors" data-testid="faq-multiple">
                <span className="font-medium text-left">Can I log multiple meals at once?</span>
                {openSections.faq5 ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <p className="text-sm text-muted-foreground">
                  Each scan analyzes one meal/plate at a time. For multiple meals, take separate photos. 
                  You can view all your meals organized by date in your food diary. 
                  Drinks can be logged individually as you consume them throughout the day.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Tips & Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle>Tips for Success</CardTitle>
            <CardDescription>Make the most of your nutrition tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</div>
                <div>
                  <h4 className="font-medium">Log consistently</h4>
                  <p className="text-sm text-muted-foreground">Track meals and drinks regularly for the most accurate insights and progress tracking.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</div>
                <div>
                  <h4 className="font-medium">Review your analytics</h4>
                  <p className="text-sm text-muted-foreground">Check your weekly trends to identify patterns and adjust your nutrition strategy.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</div>
                <div>
                  <h4 className="font-medium">Adjust goals as needed</h4>
                  <p className="text-sm text-muted-foreground">Update your nutrition targets as your lifestyle, activity level, or health goals change.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</div>
                <div>
                  <h4 className="font-medium">Use good lighting</h4>
                  <p className="text-sm text-muted-foreground">Natural light or bright indoor lighting helps the AI better identify and analyze your food.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">✓</div>
                <div>
                  <h4 className="font-medium">Stay hydrated</h4>
                  <p className="text-sm text-muted-foreground">Don't forget to log your water intake - hydration is a key part of overall nutrition.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>We're here to support your nutrition journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>If you have questions not covered in this help section, or if you encounter any issues:</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>Check our FAQ section above for common questions</li>
                <li>Try refreshing the app if you experience technical issues</li>
                <li>Ensure you have a stable internet connection for AI analysis</li>
                <li>Take clear, well-lit photos for better food recognition</li>
              </ul>
              <p className="text-muted-foreground">
                Remember: PlateMate is a tool to support your nutrition goals. 
                For medical advice or specific dietary requirements, always consult with healthcare professionals.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}