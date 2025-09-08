import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LandingPage from "@/pages/LandingPage";
import Home from "@/pages/home";
import { DiaryPage } from "@/pages/DiaryPage";
import { DietAdvicePage } from "@/pages/DietAdvicePage";
import { GoalsPage } from "@/pages/GoalsPage";
import { HelpPage } from "@/pages/HelpPage";
import CalculatorPage from "@/pages/calculator";
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
          <Route path="/goals" component={GoalsPage} />
          <Route path="/help" component={HelpPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
