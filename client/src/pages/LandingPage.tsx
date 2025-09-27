import { Link } from "wouter";
import { Camera, BookOpen, Brain, Sparkles, Zap, Shield, LogIn, Calculator, Syringe, Target, Mic, Volume2, ChefHat, Scale, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useMobileAuth } from "@/hooks/useMobileAuth";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { signInWithMobile, isLoading: isMobileLoading, isMobile } = useMobileAuth();

  return (
    <div className="text-foreground min-h-screen relative overflow-hidden" style={{background: 'var(--bg-gradient)'}}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-purple-200/30 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-1/4 right-20 w-32 h-32 bg-pink-200/20 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-blue-200/25 rounded-full blur-xl animate-ping"></div>
        <div className="absolute bottom-10 right-10 w-16 h-16 bg-yellow-200/30 rounded-full blur-lg animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 text-white relative overflow-hidden">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/50 via-pink-400/50 to-purple-600/50 animate-pulse"></div>
        
        <div className="max-w-4xl mx-auto px-4 py-8 text-center relative z-10">
          <div className="flex items-center justify-center space-x-3 mb-4 animate-fade-in-up">
            <div className="bg-white/20 p-3 rounded-full animate-float shadow-lg">
              <Sparkles className="h-8 w-8 animate-spin-slow" />
            </div>
            <h1 className="text-4xl font-bold animate-fade-in-right">PlateMate</h1>
          </div>
          <p className="text-xl opacity-90 mb-6 animate-fade-in-up animation-delay-300">
            Your voice-powered AI nutrition companion
          </p>
          <p className="text-lg opacity-80 max-w-2xl mx-auto animate-fade-in-up animation-delay-600">
            Just speak your meals aloud and watch them automatically appear in your food diary! 
            Or snap photos for instant AI analysis. Get personalized nutrition guidance with the power of your voice.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Get Started Button */}
        <div className="text-center mb-16 animate-fade-in-up animation-delay-900">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                <Shield className="h-4 w-4 mr-2" />
                ✅ Signed in and ready!
              </div>
              <Link href="/scan">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-110 hover:rotate-1 transition-all duration-300 animate-pulse-glow relative overflow-hidden group"
                  data-testid="button-get-started"
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <Camera className="h-6 w-6 mr-2 animate-bounce" />
                  Start Using PlateMate
                </Button>
              </Link>
            </div>
          ) : (
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-110 hover:rotate-1 transition-all duration-300 animate-pulse-glow relative overflow-hidden group disabled:opacity-50"
              data-testid="button-login"
              onClick={isMobile ? signInWithMobile : () => window.location.href = '/api/login'}
              disabled={isMobileLoading}
            >
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <LogIn className="h-6 w-6 mr-2 animate-bounce" />
              {isMobileLoading ? 'Signing In...' : 'Sign In to Start'}
            </Button>
          )}
          <p className="text-sm text-muted-foreground mt-3 animate-fade-in animation-delay-1200">
            Say "100g salmon" or "one apple" - your voice becomes your food diary
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="border-blue-200 dark:border-blue-800 hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-105 animate-fade-in-left animation-delay-1200 group">
            <CardHeader className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float group-hover:animate-bounce">
                <Mic className="h-8 w-8 text-blue-600 dark:text-blue-400 group-hover:animate-pulse" />
              </div>
              <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">Enhanced Voice Input</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Beautiful voice capture with large, bold text display. Simply speak your meals and see them highlighted prominently before adding to your diary.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-purple-200 dark:border-purple-800 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-105 hover:-rotate-1 animate-fade-in-left animation-delay-1500 group">
            <CardHeader className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float group-hover:animate-bounce">
                <Camera className="h-8 w-8 text-purple-600 dark:text-purple-400 group-hover:animate-pulse" />
              </div>
              <CardTitle className="text-xl group-hover:text-purple-600 transition-colors">Smart Food Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Our advanced AI instantly identifies food items and estimates portion sizes from your photos with remarkable accuracy.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-pink-200 dark:border-pink-800 hover:shadow-2xl hover:shadow-pink-500/25 transition-all duration-500 hover:scale-105 animate-fade-in-up animation-delay-1800 group">
            <CardHeader className="text-center">
              <div className="bg-pink-100 dark:bg-pink-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float animation-delay-500 group-hover:animate-bounce">
                <BookOpen className="h-8 w-8 text-pink-600 dark:text-pink-400 group-hover:animate-pulse" />
              </div>
              <CardTitle className="text-xl group-hover:text-pink-600 transition-colors">Food Diary</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Keep track of all your meals with our intuitive food diary. Monitor your eating patterns and nutritional trends over time.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-500 hover:scale-105 animate-fade-in-right animation-delay-2100 group">
            <CardHeader className="text-center">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float animation-delay-1000 group-hover:animate-bounce">
                <Calculator className="h-8 w-8 text-green-600 dark:text-green-400 group-hover:animate-pulse" />
              </div>
              <CardTitle className="text-xl group-hover:text-green-600 transition-colors">Smart Calculator & Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Calculate personalized daily calories and set nutrition goals based on your profile, age, and activity level.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800 hover:shadow-2xl hover:shadow-orange-500/25 transition-all duration-500 hover:scale-105 hover:rotate-1 animate-fade-in-up animation-delay-2400 group">
            <CardHeader className="text-center">
              <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float animation-delay-1500 group-hover:animate-bounce">
                <Scale className="h-8 w-8 text-orange-600 dark:text-orange-400 group-hover:animate-pulse" />
              </div>
              <CardTitle className="text-xl group-hover:text-orange-600 transition-colors">Weight Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Track your weight progress with visual charts and analytics. Monitor trends over time and celebrate your achievements.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-800 hover:shadow-2xl hover:shadow-yellow-500/25 transition-all duration-500 hover:scale-105 hover:rotate-1 animate-fade-in-up animation-delay-2700 group">
            <CardHeader className="text-center">
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float animation-delay-2000 group-hover:animate-bounce">
                <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-400 group-hover:animate-pulse" />
              </div>
              <CardTitle className="text-xl group-hover:text-yellow-600 transition-colors">Steps Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Turn your daily steps into earned calories! Our smart calculator converts your physical activity into food rewards with personalized suggestions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800 hover:shadow-2xl hover:shadow-red-500/25 transition-all duration-500 hover:scale-105 hover:rotate-1 animate-fade-in-up animation-delay-3000 group">
            <CardHeader className="text-center">
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float animation-delay-2300 group-hover:animate-bounce">
                <ChefHat className="h-8 w-8 text-red-600 dark:text-red-400 group-hover:animate-pulse" />
              </div>
              <CardTitle className="text-xl group-hover:text-red-600 transition-colors">Tailored Recipes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                AI-generated healthy recipes filtered by your dietary requirements - Keto, Vegan, High Protein, Gluten Free, and more.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 dark:border-indigo-800 hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-500 hover:scale-105 hover:rotate-1 animate-fade-in-up animation-delay-3000 group">
            <CardHeader className="text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float animation-delay-2300 group-hover:animate-bounce">
                <Syringe className="h-8 w-8 text-indigo-600 dark:text-indigo-400 group-hover:animate-pulse" />
              </div>
              <CardTitle className="text-xl group-hover:text-indigo-600 transition-colors">Injection Support</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Specialized guidance for people using weight loss medications like Ozempic, Wegovy, and Mounjaro.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <section className="mb-16 animate-fade-in-up animation-delay-2400">
          <h2 className="text-3xl font-bold text-center mb-8 animate-fade-in-up animation-delay-2700">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center animate-fade-in-left animation-delay-3000 hover:scale-105 transition-transform duration-300 group">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-bounce hover:animate-spin group-hover:shadow-lg">
                <Mic className="h-8 w-8 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">Speak Your Meal</h3>
              <p className="text-muted-foreground">
                Just say what you ate! "Two slices of pizza" or "100g salmon" - your voice becomes your food diary.
              </p>
            </div>
            
            <div className="text-center animate-fade-in-up animation-delay-3300 hover:scale-105 transition-transform duration-300 group">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-bounce animation-delay-500 hover:animate-spin group-hover:shadow-lg">
                <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-600 transition-colors">Smart AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI understands your voice and instantly calculates calories, protein, carbs, and fat from what you said.
              </p>
            </div>
            
            <div className="text-center animate-fade-in-right animation-delay-3600 hover:scale-105 transition-transform duration-300 group">
              <div className="bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-bounce animation-delay-1000 hover:animate-spin group-hover:shadow-lg">
                <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-green-600 transition-colors">Auto-Track & Improve</h3>
              <p className="text-muted-foreground">
                Meals are automatically saved to your diary with beautiful voice thumbnails. Track progress effortlessly.
              </p>
            </div>
          </div>
        </section>

        {/* Advanced Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8 animate-fade-in-up">Advanced Nutrition Tools</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-orange-200 dark:border-orange-800 hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full w-fit mx-auto mb-4 group-hover:animate-bounce">
                  <Target className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-lg group-hover:text-orange-600 transition-colors">Smart Goals & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  Set personalized nutrition goals and track your progress with detailed analytics based on your age, activity level, and health goals.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-fit mx-auto mb-4 group-hover:animate-bounce">
                  <Target className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">Medication-Aware</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  Specialized calorie calculations that account for appetite suppression from GLP-1 medications.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-800 hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full w-fit mx-auto mb-4 group-hover:animate-bounce">
                  <ChefHat className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-lg group-hover:text-red-600 transition-colors">Smart Recipe Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  AI-powered recipe recommendations with dietary filters. Get personalized meal ideas that match your nutrition goals.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-fit mx-auto mb-4 group-hover:animate-bounce">
                  <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">AI Advice</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  Personalized diet recommendations based on your eating patterns, health goals, and preferences.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Features */}
        <section className="bg-muted/50 rounded-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose PlateMate?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <Volume2 className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Voice-Powered Logging</h3>
                <p className="text-muted-foreground">Speak your meals naturally - "100g salmon" or "one apple" - and watch them appear instantly in your diary.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Shield className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Reliable & Accurate</h3>
                <p className="text-muted-foreground">Enterprise-grade AI with multiple backup systems ensures consistent results.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Calculator className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Personalized Calculations</h3>
                <p className="text-muted-foreground">Get precise BMR and TDEE calculations with medication-aware adjustments for safe weight management.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Scale className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Weight Progress Tracking</h3>
                <p className="text-muted-foreground">Monitor your weight journey with beautiful charts and progress analytics. Celebrate milestones and stay motivated.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <ChefHat className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">AI Recipe Generator</h3>
                <p className="text-muted-foreground">Get personalized healthy recipes filtered by dietary requirements like Keto, Vegan, High Protein, and Gluten Free.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Award className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Steps Rewards System</h3>
                <p className="text-muted-foreground">Convert your daily steps into earned calories with our smart calculator. Get personalized food reward suggestions based on your activity level.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Syringe className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Injection Medicine Support</h3>
                <p className="text-muted-foreground">Specialized guidance and safety tips for users of GLP-1 weight loss medications like Ozempic and Wegovy.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white rounded-lg p-8 animate-fade-in-up animation-delay-4500 relative overflow-hidden group">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-400/50 via-purple-400/50 to-pink-600/50 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          
          <h2 className="text-3xl font-bold mb-4 animate-fade-in-up animation-delay-4800 relative z-10">Ready to Speak Your Way to Better Nutrition?</h2>
          <p className="text-xl opacity-90 mb-6 animate-fade-in-up animation-delay-5100 relative z-10">
            Join users who are effortlessly tracking meals with voice input and achieving their weight goals with hands-free food logging.
          </p>
          {isAuthenticated ? (
            <Link href="/scan">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-110 hover:rotate-2 transition-all duration-300 animate-bounce relative z-10 group/button overflow-hidden"
                data-testid="button-start-now"
              >
                {/* Button shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/button:translate-x-full transition-transform duration-1000"></div>
                <Mic className="h-6 w-6 mr-2 animate-pulse" />
                Start Voice Logging Now
              </Button>
            </Link>
          ) : (
            <a href="/api/login">
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-110 hover:rotate-2 transition-all duration-300 animate-bounce relative z-10 group/button overflow-hidden"
                data-testid="button-start-now"
              >
                {/* Button shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/button:translate-x-full transition-transform duration-1000"></div>
                <Mic className="h-6 w-6 mr-2 animate-pulse" />
                Start Voice Logging Now
              </Button>
            </a>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 py-8 mt-16 animate-fade-in animation-delay-5700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4 animate-fade-in-up animation-delay-6000">
            <Sparkles className="h-5 w-5 text-purple-600 animate-spin-slow" />
            <span className="font-semibold hover:text-purple-600 transition-colors cursor-default">PlateMate</span>
          </div>
          <p className="text-sm text-muted-foreground animate-fade-in animation-delay-6300">
            Your voice-powered AI nutrition companion for effortless meal tracking.
          </p>
        </div>
      </footer>
    </div>
  );
}