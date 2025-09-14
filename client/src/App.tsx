import { Switch, Route } from "wouter";
import { useEffect } from "react";

// ✅ Pages in your /pages folder
import CameraPage from "./pages/CameraPage";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/home";
import DiaryPage from "./pages/DiaryPage";
import DietAdvicePage from "./pages/DietAdvicePage";
import CalculatorPage from "./pages/calculator";
import RecipesPage from "./pages/RecipesPage";
import CoachingPage from "./pages/CoachingPage";
import GoalsPage from "./pages/GoalsPage";
import InjectionAdvicePage from "./pages/InjectionAdvicePage";
import HelpPage from "./pages/HelpPage";
import NotFound from "./pages/not-found";

function App() {
  useEffect(() => {
    console.log("App loaded");
  }, []);

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/scan" component={CameraPage} />
      <Route path="/home" component={Home} />
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
      <Route path="/camera" component={CameraPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;