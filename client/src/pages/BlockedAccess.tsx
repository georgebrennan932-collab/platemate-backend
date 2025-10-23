import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Smartphone, ExternalLink } from "lucide-react";

export default function BlockedAccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-purple-200 dark:border-purple-900" data-testid="card-blocked-access">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-purple-600 dark:text-purple-400" data-testid="icon-shield-alert" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-blocked-title">
            Access Restricted
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-300" data-testid="text-blocked-description">
            This web version is only accessible through the official PlateMate Android app
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800" data-testid="container-app-info">
            <div className="flex items-start space-x-4">
              <Smartphone className="w-8 h-8 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" data-testid="icon-smartphone" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2" data-testid="text-download-title">
                  Get the Official App
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4" data-testid="text-download-description">
                  PlateMate is designed as a premium mobile experience with AI-powered food scanning, 
                  personalized nutrition coaching, and comprehensive meal tracking.
                </p>
                <Button
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                  onClick={() => window.open('https://play.google.com/store', '_blank')}
                  data-testid="button-download-app"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Download from Google Play
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6" data-testid="container-features">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3" data-testid="text-features-title">
              What you'll get with PlateMate:
            </h4>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300" data-testid="list-features">
              <li className="flex items-center" data-testid="feature-ai-scanning">
                <span className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full mr-3"></span>
                AI-powered food image recognition and nutrition analysis
              </li>
              <li className="flex items-center" data-testid="feature-ai-coach">
                <span className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full mr-3"></span>
                Personal AI nutrition coach with multiple personalities
              </li>
              <li className="flex items-center" data-testid="feature-shift-planner">
                <span className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full mr-3"></span>
                Weekly shift planner for NHS/frontline workers
              </li>
              <li className="flex items-center" data-testid="feature-challenges">
                <span className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full mr-3"></span>
                Gamified challenges and rewards system
              </li>
              <li className="flex items-center" data-testid="feature-tracking">
                <span className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full mr-3"></span>
                Comprehensive meal, water, and weight tracking
              </li>
            </ul>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400" data-testid="text-footer">
            <p>Already have the app? Open PlateMate on your Android device to continue.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
