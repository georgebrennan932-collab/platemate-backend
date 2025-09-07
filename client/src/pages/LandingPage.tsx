import { Link } from "wouter";
import { Camera, BookOpen, Brain, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold">PlateMate</h1>
          </div>
          <p className="text-xl opacity-90 mb-6">
            Your AI-powered nutrition companion
          </p>
          <p className="text-lg opacity-80 max-w-2xl mx-auto">
            Instantly analyze your meals with advanced AI technology. Get detailed nutritional breakdowns, 
            track your eating habits, and receive personalized diet advice.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Get Started Button */}
        <div className="text-center mb-16">
          <Link href="/scan">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              data-testid="button-get-started"
            >
              <Camera className="h-6 w-6 mr-2" />
              Start Scanning Food
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-3">
            Take a photo of your meal to get instant nutrition analysis
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-fit mx-auto mb-4">
                <Camera className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">Smart Food Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Our advanced AI instantly identifies food items and estimates portion sizes from your photos with remarkable accuracy.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-pink-200 dark:border-pink-800 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="bg-pink-100 dark:bg-pink-900 p-3 rounded-full w-fit mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              </div>
              <CardTitle className="text-xl">Food Diary</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Keep track of all your meals with our intuitive food diary. Monitor your eating patterns and nutritional trends over time.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-fit mx-auto mb-4">
                <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Personalized Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Receive AI-powered diet recommendations based on your eating habits, goals, and nutritional needs.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Snap a Photo</h3>
              <p className="text-muted-foreground">
                Simply take a picture of your meal using your camera or upload an existing photo.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI instantly identifies food items and calculates detailed nutritional information.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Track & Improve</h3>
              <p className="text-muted-foreground">
                Save to your diary, track your progress, and get personalized nutrition advice.
              </p>
            </div>
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
              <BookOpen className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Comprehensive Tracking</h3>
                <p className="text-muted-foreground">Monitor calories, macronutrients, and eating patterns with detailed insights.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Brain className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Smart Recommendations</h3>
                <p className="text-muted-foreground">Get personalized diet advice based on your unique eating patterns and goals.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Nutrition?</h2>
          <p className="text-xl opacity-90 mb-6">
            Join thousands of users who are already making healthier choices with PlateMate.
          </p>
          <Link href="/scan">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              data-testid="button-start-now"
            >
              <Camera className="h-6 w-6 mr-2" />
              Start Your Journey Now
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span className="font-semibold">PlateMate</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your AI-powered nutrition companion for a healthier lifestyle.
          </p>
        </div>
      </footer>
    </div>
  );
}