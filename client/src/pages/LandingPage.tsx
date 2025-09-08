import { Link } from "wouter";
import { Camera, BookOpen, Brain, Sparkles, Zap, Shield, LogIn, Calculator, Syringe, Target, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="bg-background text-foreground min-h-screen relative overflow-hidden">
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
            Your AI-powered nutrition companion
          </p>
          <p className="text-lg opacity-80 max-w-2xl mx-auto animate-fade-in-up animation-delay-600">
            Instantly analyze your meals with advanced AI technology. Get personalized calorie calculations, 
            track your eating habits, and receive specialized guidance for weight loss medications.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Get Started Button */}
        <div className="text-center mb-16 animate-fade-in-up animation-delay-900">
          {isAuthenticated ? (
            <Link href="/scan">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-110 hover:rotate-1 transition-all duration-300 animate-pulse-glow relative overflow-hidden group"
                data-testid="button-get-started"
              >
                {/* Animated shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <Camera className="h-6 w-6 mr-2 animate-bounce" />
                Start Scanning Food
              </Button>
            </Link>
          ) : (
            <a href="/api/login">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-110 hover:rotate-1 transition-all duration-300 animate-pulse-glow relative overflow-hidden group"
                data-testid="button-login"
              >
                {/* Animated shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <LogIn className="h-6 w-6 mr-2 animate-bounce" />
                Login to Start
              </Button>
            </a>
          )}
          <p className="text-sm text-muted-foreground mt-3 animate-fade-in animation-delay-1200">
            Take a photo of your meal to get instant nutrition analysis
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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
              <CardTitle className="text-xl group-hover:text-green-600 transition-colors">Personal Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Calculate your personalized daily calorie needs based on your BMR, activity level, and weight goals.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 dark:border-indigo-800 hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-500 hover:scale-105 hover:rotate-1 animate-fade-in-up animation-delay-2400 group">
            <CardHeader className="text-center">
              <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full w-fit mx-auto mb-4 animate-float animation-delay-1500 group-hover:animate-bounce">
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
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-bounce hover:animate-spin group-hover:shadow-lg">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-600 transition-colors">Snap a Photo</h3>
              <p className="text-muted-foreground">
                Simply take a picture of your meal using your camera or upload an existing photo.
              </p>
            </div>
            
            <div className="text-center animate-fade-in-up animation-delay-3300 hover:scale-105 transition-transform duration-300 group">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-bounce animation-delay-500 hover:animate-spin group-hover:shadow-lg">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-600 transition-colors">AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI instantly identifies food items and calculates detailed nutritional information.
              </p>
            </div>
            
            <div className="text-center animate-fade-in-right animation-delay-3600 hover:scale-105 transition-transform duration-300 group">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center animate-bounce animation-delay-1000 hover:animate-spin group-hover:shadow-lg">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">Track & Improve</h3>
              <p className="text-muted-foreground">
                Save to your diary, track your progress, and get personalized nutrition advice.
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
                <CardTitle className="text-lg group-hover:text-orange-600 transition-colors">Smart Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  Set and track personalized nutrition goals with automatic updates from your calorie calculations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="text-center">
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-fit mx-auto mb-4 group-hover:animate-bounce">
                  <Activity className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">Medication-Aware</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  Specialized calorie calculations that account for appetite suppression from GLP-1 medications.
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
              <Zap className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Lightning Fast</h3>
                <p className="text-muted-foreground">Get instant nutrition analysis in seconds with our optimized AI system.</p>
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
          
          <h2 className="text-3xl font-bold mb-4 animate-fade-in-up animation-delay-4800 relative z-10">Ready to Transform Your Nutrition?</h2>
          <p className="text-xl opacity-90 mb-6 animate-fade-in-up animation-delay-5100 relative z-10">
            Join users who are achieving their weight goals with personalized calorie calculations and medication-aware guidance.
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
                <Camera className="h-6 w-6 mr-2 animate-pulse" />
                Start Your Journey Now
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
                <Camera className="h-6 w-6 mr-2 animate-pulse" />
                Start Your Journey Now
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
            Your AI-powered nutrition companion for a healthier lifestyle.
          </p>
        </div>
      </footer>
    </div>
  );
}