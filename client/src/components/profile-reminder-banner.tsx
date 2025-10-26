import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { X, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileReminderBannerProps {
  userProfile: any;
}

export function ProfileReminderBanner({ userProfile }: ProfileReminderBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if profile is incomplete
    const isIncomplete = !userProfile?.name || 
                        !userProfile?.nickname || 
                        (!userProfile?.dietaryRequirements || userProfile.dietaryRequirements.length === 0);

    // Check if user has already dismissed the reminder
    const dismissed = localStorage.getItem('profile-reminder-dismissed');
    
    // If profile becomes complete, clear the dismissal so it shows again if profile becomes incomplete later
    if (!isIncomplete) {
      localStorage.removeItem('profile-reminder-dismissed');
      setIsDismissed(false);
      setIsVisible(false);
      return;
    }

    // Show banner if profile is incomplete and not dismissed
    if (isIncomplete && dismissed !== 'true') {
      setIsVisible(true);
      setIsDismissed(false);
    } else if (dismissed === 'true') {
      setIsDismissed(true);
      setIsVisible(false);
    }
  }, [userProfile]);

  const handleDismiss = () => {
    localStorage.setItem('profile-reminder-dismissed', 'true');
    setIsDismissed(true);
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mx-4 mt-4"
        data-testid="banner-profile-reminder"
      >
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }} />
          </div>

          {/* Content */}
          <div className="relative flex items-start gap-3">
            <div className="flex-shrink-0 bg-white/20 rounded-full p-2">
              <User className="h-5 w-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Complete Your Profile
              </h3>
              <p className="text-white/90 text-sm mb-3">
                Help your AI Coach give you personalized nutrition advice by completing your profile with dietary preferences and allergies.
              </p>
              <Link href="/profile">
                <button
                  className="bg-white text-purple-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-purple-50 transition-colors shadow-md"
                  data-testid="button-complete-profile"
                >
                  Complete Profile
                </button>
              </Link>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-white/80 hover:text-white transition-colors p-1"
              data-testid="button-dismiss-profile-reminder"
              aria-label="Dismiss reminder"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
