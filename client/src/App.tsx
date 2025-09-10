import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/lib/notification-service";
import { soundService } from "@/lib/sound-service";
import { SpeechNavigation } from "@/components/speech-navigation";
import { SpeechIndicator } from "@/components/speech-indicator";
import { useEffect } from "react";
import LandingPage from "@/pages/LandingPage";
import Home from "@/pages/home";
import { DiaryPage } from "@/pages/DiaryPage";
import { DietAdvicePage } from "@/pages/DietAdvicePage";
import { RecipesPage } from "@/pages/RecipesPage";
import { CoachingPage } from "@/pages/CoachingPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { HelpPage } from "@/pages/HelpPage";
import CalculatorPage from "@/pages/calculator";
import InjectionAdvicePage from "@/pages/InjectionAdvicePage";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={LandingPage} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/scan" component={Home} />
          <Route path="/diary" component={DiaryPage} />
          <Route path="/calculator" component={CalculatorPage} />
          <Route path="/advice" component={DietAdvicePage} />
          <Route path="/ai-advice" component={DietAdvicePage} />
          <Route path="/diet-advice" component={DietAdvicePage} />
          <Route path="/recipes" component={RecipesPage} />
          <Route path="/coaching" component={CoachingPage} />
          <Route path="/goals" component={GoalsPage} />
          <Route path="/injection-advice" component={InjectionAdvicePage} />
          <Route path="/help" component={HelpPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize services when app loads
  useEffect(() => {
    // Initialize sound service
    soundService.initialize();
    
    // Initialize notification service
    notificationService.initialize().then((hasPermission) => {
      if (hasPermission) {
        notificationService.resumeWebNotifications();
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SpeechNavigation />
        <SpeechIndicator />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
