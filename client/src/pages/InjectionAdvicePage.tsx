import { ArrowLeft, Syringe, AlertTriangle, Heart, Apple, Clock, Users, CheckCircle, Info, Shield } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownNavigation } from "@/components/dropdown-navigation";

export default function InjectionAdvicePage() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <button 
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Weight Loss Injection Guide</h1>
          <p className="text-muted-foreground">Tips and advice for GLP-1 medications</p>
        </div>
      </div>

      {/* Important Disclaimer */}
      <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700 dark:text-red-300">
          <strong>Medical Disclaimer:</strong> This information is for educational purposes only. 
          Always consult your healthcare provider before starting, stopping, or changing any medication. 
          Never adjust dosages without medical supervision.
        </AlertDescription>
      </Alert>

      {/* Common Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            Common GLP-1 Medications
          </CardTitle>
          <CardDescription>
            Popular prescription weight loss injection medications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600">Ozempic® (Semaglutide)</h4>
              <p className="text-sm text-muted-foreground mt-1">Weekly injection for diabetes and weight management</p>
              <Badge variant="secondary" className="mt-2">0.25mg - 2mg</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600">Wegovy® (Semaglutide)</h4>
              <p className="text-sm text-muted-foreground mt-1">Higher dose specifically for weight management</p>
              <Badge variant="secondary" className="mt-2">0.25mg - 2.4mg</Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-purple-600">Mounjaro® (Tirzepatide)</h4>
              <p className="text-sm text-muted-foreground mt-1">Dual-action diabetes and weight medication</p>
              <Badge variant="secondary" className="mt-2">2.5mg - 15mg</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How They Work */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How GLP-1 Medications Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Appetite Suppression</h4>
                <p className="text-sm text-muted-foreground">Signals to your brain that you're full, reducing food cravings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Slower Gastric Emptying</h4>
                <p className="text-sm text-muted-foreground">Food stays in your stomach longer, keeping you satisfied</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Blood Sugar Control</h4>
                <p className="text-sm text-muted-foreground">Helps regulate insulin and glucose levels</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5" />
            Nutrition Tips While on GLP-1s
          </CardTitle>
          <CardDescription>
            Optimize your diet to work with your medication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-green-600 mb-3">✅ Foods to Emphasize</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span><strong>Lean proteins:</strong> Chicken, fish, tofu, legumes to maintain muscle mass</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span><strong>Fiber-rich foods:</strong> Vegetables, fruits, whole grains for digestive health</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span><strong>Hydrating foods:</strong> Soups, smoothies, water-rich fruits and vegetables</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span><strong>Small, frequent meals:</strong> 4-6 smaller portions throughout the day</span>
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-red-600 mb-3">❌ Foods to Limit or Avoid</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span><strong>High-fat foods:</strong> Can worsen nausea and slow digestion further</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span><strong>Sugary drinks:</strong> Can cause blood sugar spikes and GI upset</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span><strong>Large meals:</strong> May cause discomfort, nausea, or vomiting</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span><strong>Carbonated drinks:</strong> Can increase feelings of fullness and bloating</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Managing Side Effects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Managing Common Side Effects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Nausea & Vomiting</h4>
              <ul className="space-y-1 text-sm">
                <li>• Eat slowly and chew thoroughly</li>
                <li>• Try ginger tea or ginger supplements</li>
                <li>• Avoid lying down after eating</li>
                <li>• Eat bland foods (crackers, toast)</li>
                <li>• Stay hydrated with small sips</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Constipation</h4>
              <ul className="space-y-1 text-sm">
                <li>• Increase fiber gradually</li>
                <li>• Drink plenty of water</li>
                <li>• Take gentle walks after meals</li>
                <li>• Consider a fiber supplement</li>
                <li>• Eat prunes or prune juice</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Fatigue</h4>
              <ul className="space-y-1 text-sm">
                <li>• Ensure adequate protein intake</li>
                <li>• Monitor for dehydration</li>
                <li>• Maintain regular sleep schedule</li>
                <li>• Consider B-vitamin complex</li>
                <li>• Light exercise as tolerated</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Loss of Appetite</h4>
              <ul className="space-y-1 text-sm">
                <li>• Focus on nutrient-dense foods</li>
                <li>• Use liquid nutrition if needed</li>
                <li>• Set eating reminders</li>
                <li>• Make food more appealing</li>
                <li>• Track your intake</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Safety Guidelines & Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Injection Safety</h4>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li>• Rotate injection sites (thigh, stomach, upper arm)</li>
                <li>• Use a new needle for each injection</li>
                <li>• Store medication in refrigerator (not freezer)</li>
                <li>• Check expiration dates before use</li>
                <li>• Dispose of needles in a sharps container</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Monitoring & Check-ups</h4>
              <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                <li>• Regular blood work to monitor kidney function</li>
                <li>• Track weight loss progress</li>
                <li>• Monitor blood sugar if diabetic</li>
                <li>• Report severe side effects immediately</li>
                <li>• Keep follow-up appointments</li>
              </ul>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">When to Contact Your Doctor</h4>
              <ul className="space-y-1 text-sm text-orange-800 dark:text-orange-200">
                <li>• Severe nausea or vomiting that prevents eating/drinking</li>
                <li>• Signs of pancreatitis (severe stomach pain)</li>
                <li>• Unusual changes in vision</li>
                <li>• Signs of allergic reaction</li>
                <li>• Persistent constipation or diarrhea</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tips for Long-term Success
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Build Sustainable Habits</h4>
                  <p className="text-sm text-muted-foreground">Focus on lifestyle changes that you can maintain long-term</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Stay Active</h4>
                  <p className="text-sm text-muted-foreground">Regular exercise helps maintain muscle mass during weight loss</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Find Support</h4>
                  <p className="text-sm text-muted-foreground">Connect with others on similar journeys for motivation</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Apple className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Track Your Progress</h4>
                  <p className="text-sm text-muted-foreground">Use apps like this one to monitor nutrition and health metrics</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Navigation */}
      <DropdownNavigation />
      
      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  );
}