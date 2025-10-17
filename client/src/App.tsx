import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { queryClient } from "./lib/queryClient";
import { soundService } from "./lib/sound-service";

// ✅ Pages in your /pages folder
import CameraPage from "./pages/CameraPage";
import CameraTestPage from "./pages/CameraTestPage";
import VoicePage from "./pages/VoicePage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import Home from "./pages/home";
import DiaryPage from "./pages/DiaryPage";
import DietAdvicePage from "./pages/DietAdvicePage";
import CalculatorPage from "./pages/calculator";
import CalculatorTestPage from "./pages/CalculatorTestPage";
import RecipesPage from "./pages/RecipesPage";
import CoachingPage from "./pages/CoachingPage";
import GoalsPage from "./pages/GoalsPage";
import RewardsPage from "./pages/RewardsPage";
import InjectionAdvicePage from "./pages/InjectionAdvicePage";
import HelpPage from "./pages/HelpPage";
import { InsightsPage } from "./pages/InsightsPage";
import { ChallengesPage } from "./pages/ChallengesPage";
import { MenuAnalysisPage } from "./pages/MenuAnalysisPage";
import AICoachPage from "./pages/AICoachPage";
import ProfilePage from "./pages/ProfilePage";
import { ProgressPhotosPage } from "./pages/ProgressPhotosPage";
import { CoachPersonalityPage } from "./pages/CoachPersonalityPage";
import { CoachProfilePage } from "./pages/CoachProfilePage";
import NotFound from "./pages/not-found";

// Root route component that checks authentication
function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-gradient)'}}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show appropriate page based on authentication
  return isAuthenticated ? <Home /> : <LandingPage />;
}

function App() {
  useEffect(() => {
    // Initialize sound service
    soundService.initialize().catch(err => 
      console.error('Sound service initialization failed:', err)
    );
    
    // Set up deep-link handler for mobile OAuth return
    let listenerHandle: any;
    
    // Wrap the whole setup in try-catch to prevent any crashes
    try {
      CapacitorApp.addListener('appUrlOpen', async (event) => {
        try {
          const url = event.url;
          
          // Check if this is an auth-complete callback
          if (url.startsWith('platemate://auth-complete')) {
            try {
              // Parse the URL to get the token
              const urlObj = new URL(url);
              const token = urlObj.searchParams.get('token');
              
              if (!token) {
                console.error('No token found in deep-link URL');
                return;
              }
              
              // Exchange the token for a session cookie (use absolute URL for mobile)
              const baseUrl = window.location.origin;
              const consumeUrl = `${baseUrl}/api/session/consume`;
              
              const response = await fetch(consumeUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ token }),
              });
              
              if (!response.ok) {
                console.error('Failed to consume session token:', response.statusText);
                return;
              }
              
              const result = await response.json();
              
              // Close the browser window
              try {
                await Browser.close();
              } catch (closeError) {
                // Browser may already be closed
              }
              
              // Invalidate auth queries to refresh the UI
              await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
              
            } catch (error) {
              console.error('Error handling auth callback:', error);
            }
          }
        } catch (error) {
          console.error('Error in deep-link handler:', error);
        }
      }).then(handle => {
        listenerHandle = handle;
      }).catch(error => {
        console.error('Error setting up deep-link listener:', error);
      });
    } catch (error) {
      console.error('Error in deep-link setup:', error);
    }
    
    // Clean up listener on unmount
    return () => {
      try {
        if (listenerHandle) {
          listenerHandle.remove();
        }
      } catch (error) {
        console.error('Error removing deep-link listener:', error);
      }
    };
  }, []);

  return (
    <Switch>
      <Route path="/" component={RootRoute} />
      <Route path="/landing" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/scan" component={CameraPage} />
      <Route path="/home" component={Home} />
      <Route path="/diary" component={DiaryPage} />
      <Route path="/calculator" component={CalculatorPage} />
      <Route path="/calculator-test" component={CalculatorTestPage} />
      <Route path="/advice" component={DietAdvicePage} />
      <Route path="/ai-advice" component={DietAdvicePage} />
      <Route path="/diet-advice" component={DietAdvicePage} />
      <Route path="/recipes" component={RecipesPage} />
      <Route path="/coaching" component={CoachingPage} />
      <Route path="/ai-coach" component={AICoachPage} />
      <Route path="/goals" component={GoalsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/rewards" component={RewardsPage} />
      <Route path="/injection-advice" component={InjectionAdvicePage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/insights" component={InsightsPage} />
      <Route path="/challenges" component={ChallengesPage} />
      <Route path="/menu-analysis" component={MenuAnalysisPage} />
      <Route path="/progress-photos" component={ProgressPhotosPage} />
      <Route path="/coach-personality" component={CoachPersonalityPage} />
      <Route path="/coach-profile" component={CoachProfilePage} />
      <Route path="/camera" component={CameraTestPage} />
      <Route path="/food-camera" component={CameraPage} />
      <Route path="/voice" component={VoicePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;