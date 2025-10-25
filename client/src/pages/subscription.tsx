import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Sparkles, Camera, BarChart3, Trophy, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SubscriptionPage() {
  const { launchSubscription, isLoading } = useSubscription();

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

          {/* CTA Button */}
          <Button
            onClick={launchSubscription}
            disabled={isLoading}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
            data-testid="button-start-trial"
          >
            {isLoading ? 'Loading...' : 'Start My Free Trial'}
          </Button>

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
