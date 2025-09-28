import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

// ✅ Pages in your /pages folder
import CameraPage from "./pages/CameraPage";
import CameraTestPage from "./pages/CameraTestPage";
import VoicePage from "./pages/VoicePage";
import LandingPage from "./pages/LandingPage";
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
import NotFound from "./pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={LandingPage} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/home" component={Home} />
          <Route path="/scan" component={CameraPage} />
          <Route path="/diary" component={DiaryPage} />
          <Route path="/calculator" component={CalculatorPage} />
          <Route path="/calculator-test" component={CalculatorTestPage} />
          <Route path="/advice" component={DietAdvicePage} />
          <Route path="/ai-advice" component={DietAdvicePage} />
          <Route path="/diet-advice" component={DietAdvicePage} />
          <Route path="/recipes" component={RecipesPage} />
          <Route path="/coaching" component={CoachingPage} />
          <Route path="/goals" component={GoalsPage} />
          <Route path="/rewards" component={RewardsPage} />
          <Route path="/injection-advice" component={InjectionAdvicePage} />
          <Route path="/help" component={HelpPage} />
          <Route path="/camera" component={CameraTestPage} />
          <Route path="/food-camera" component={CameraPage} />
          <Route path="/voice" component={VoicePage} />
        </>
      )}
      <Route path="/landing" component={LandingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    console.log("App loaded");
  }, []);

  return <Router />;
}

export default App;