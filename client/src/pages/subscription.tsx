import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Sparkles, Camera, BarChart3, Trophy, Brain, Smartphone, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';

export default function SubscriptionPage() {
  const { launchSubscription, isLoading, isSubscribed } = useSubscription();
  const [showMobileOnlyMessage, setShowMobileOnlyMessage] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  
  // Check if we're on a native platform
  const isNativePlatform = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  // Additional check: Android user agent detection for dev mode
  const isLikelyAndroid = /android/i.test(navigator.userAgent);
  const shouldShowNativeButton = isNativePlatform || isLikelyAndroid;

  const features = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: 'AI Food Recognition',
      description: 'Instantly identify foods and get nutritional breakdowns from photos'
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'Smart Coaching',
      description: 'Personalized AI coach with multiple personalities to keep you motivated'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Progress Tracking',
      description: 'Track calories, macros, and see your daily nutrition at a glance'
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Challenges & Rewards',
      description: 'Complete daily challenges and unlock achievements'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-2" data-testid="text-subscription-title">
              Unlock PlateMate Pro
            </h1>
            <p className="text-purple-200 text-lg" data-testid="text-subscription-subtitle">
              Start your 7-day free trial today
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-lg bg-white/5 backdrop-blur-sm"
                data-testid={`feature-card-${index}`}
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                  <p className="text-purple-200 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pricing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 mb-6 text-center"
            data-testid="pricing-card"
          >
            <div className="text-white mb-2">
              <span className="text-5xl font-bold">£4.99</span>
              <span className="text-purple-200 text-lg">/month</span>
            </div>
            <p className="text-purple-100 text-sm">After 7-day free trial</p>
          </motion.div>

          {/* Benefits List */}
          <div className="space-y-2 mb-6">
            {[
              'Full access to all features',
              'AI-powered nutritional coaching',
              'Unlimited food scanning',
              'Advanced progress tracking',
              'Cancel anytime'
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 text-white" data-testid={`benefit-${index}`}>
                <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Already Subscribed Message */}
          {isSubscribed && (
            <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg" data-testid="info-already-subscribed">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-100 font-semibold text-sm mb-1">You're Already Subscribed!</p>
                  <p className="text-green-200 text-xs">
                    You have full access to all PlateMate Pro features. Manage your subscription in Google Play Store.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Purchase Error Message */}
          {purchaseError && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg" data-testid="error-purchase">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-100 font-semibold text-sm mb-1">Purchase Failed</p>
                  <p className="text-red-200 text-xs">{purchaseError}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile-Only Warning (Web Desktop) */}
          {!shouldShowNativeButton && (
            <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg" data-testid="warning-mobile-only">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-100 font-semibold text-sm mb-1">Mobile App Required</p>
                  <p className="text-yellow-200 text-xs">
                    Subscriptions can only be purchased through the PlateMate mobile app on Google Play. 
                    Download the app to subscribe and access all premium features.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Dev Mode Warning (Android in development) */}
          {shouldShowNativeButton && !isNativePlatform && (
            <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg" data-testid="warning-dev-mode">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-100 font-semibold text-sm mb-1">Development Mode Detected</p>
                  <p className="text-blue-200 text-xs">
                    You're running in development mode. For billing to work, build a production APK using 
                    "npm run build" and "npx cap sync android", then install via Android Studio without live reload.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CTA Button */}
          <Button
            onClick={async () => {
              if (isSubscribed) {
                // Already subscribed, nothing to do
                return;
              }
              
              if (!shouldShowNativeButton) {
                setShowMobileOnlyMessage(true);
                return;
              }
              
              try {
                setPurchaseError(null);
                await launchSubscription();
              } catch (error: any) {
                console.error('Purchase error:', error);
                
                // Don't show error if user cancelled
                if (error?.message?.includes('cancel')) {
                  return;
                }
                
                // Show helpful error message
                if (error?.code === 'UNIMPLEMENTED') {
                  setPurchaseError('Native billing plugin not available. Make sure you\'re running a production build installed from Google Play.');
                } else {
                  setPurchaseError(error?.message || 'An error occurred. Please try again.');
                }
              }
            }}
            disabled={isLoading || isSubscribed || (!shouldShowNativeButton)}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-start-trial"
          >
            {isLoading ? 'Loading...' : 
             isSubscribed ? 'Already Subscribed ✓' :
             shouldShowNativeButton ? 'Start My Free Trial' : 
             'Download Mobile App to Subscribe'}
          </Button>

          {showMobileOnlyMessage && !isNativePlatform && (
            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg" data-testid="info-download-app">
              <div className="flex items-center gap-2 text-blue-200 text-sm">
                <Smartphone className="w-4 h-4" />
                <p>Please download PlateMate from Google Play Store to subscribe</p>
              </div>
            </div>
          )}

          {/* Fine Print */}
          <p className="text-purple-300 text-xs text-center mt-4" data-testid="text-terms">
            Your subscription will automatically renew unless canceled at least 24 hours before the end of the current period. 
            Manage your subscription in Google Play Store.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
