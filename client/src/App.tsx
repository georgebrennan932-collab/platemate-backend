import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";

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

// Protected route component that checks authentication
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-gradient)'}}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <LandingPage />;
  }
  
  return <Component />;
}

function App() {
  useEffect(() => {
    console.log("App loaded");
  }, []);

  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/landing" component={LandingPage} />
      <Route path="/scan" component={() => <ProtectedRoute component={CameraPage} />} />
      <Route path="/home" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/diary" component={() => <ProtectedRoute component={DiaryPage} />} />
      <Route path="/calculator" component={() => <ProtectedRoute component={CalculatorPage} />} />
      <Route path="/calculator-test" component={() => <ProtectedRoute component={CalculatorTestPage} />} />
      <Route path="/advice" component={() => <ProtectedRoute component={DietAdvicePage} />} />
      <Route path="/ai-advice" component={() => <ProtectedRoute component={DietAdvicePage} />} />
      <Route path="/diet-advice" component={() => <ProtectedRoute component={DietAdvicePage} />} />
      <Route path="/recipes" component={() => <ProtectedRoute component={RecipesPage} />} />
      <Route path="/coaching" component={() => <ProtectedRoute component={CoachingPage} />} />
      <Route path="/goals" component={() => <ProtectedRoute component={GoalsPage} />} />
      <Route path="/rewards" component={() => <ProtectedRoute component={RewardsPage} />} />
      <Route path="/injection-advice" component={() => <ProtectedRoute component={InjectionAdvicePage} />} />
      <Route path="/help" component={() => <ProtectedRoute component={HelpPage} />} />
      <Route path="/camera" component={() => <ProtectedRoute component={CameraTestPage} />} />
      <Route path="/food-camera" component={() => <ProtectedRoute component={CameraPage} />} />
      <Route path="/voice" component={() => <ProtectedRoute component={VoicePage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;