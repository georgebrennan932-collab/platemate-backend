import { forwardRef } from "react";
import { Trophy, Star, Flame } from "lucide-react";

interface ChallengeShareCardProps {
  points: number;
  streak: number;
  completedChallenges: number;
}

export const ChallengeShareCard = forwardRef<HTMLDivElement, ChallengeShareCardProps>(
  ({ points, streak, completedChallenges }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-gradient-to-br from-purple-600 to-pink-600 p-8 rounded-2xl w-[600px] text-white"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold">My PlateMate Journey</h1>
            <p className="text-purple-100 text-sm">Nutrition Tracking Achievements</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Total Points */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 text-yellow-900" />
            </div>
            <div className="text-3xl font-bold mb-1">{points}</div>
            <div className="text-sm text-purple-100">Points Earned</div>
          </div>

          {/* Current Streak */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <Flame className="w-6 h-6 text-orange-900" />
            </div>
            <div className="text-3xl font-bold mb-1">{streak}</div>
            <div className="text-sm text-purple-100">Day Streak</div>
          </div>

          {/* Completed Challenges */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-6 h-6 text-green-900" />
            </div>
            <div className="text-3xl font-bold mb-1">{completedChallenges}</div>
            <div className="text-sm text-purple-100">Completed</div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/30 pt-4 text-center">
          <p className="text-lg font-semibold mb-1">Track Your Nutrition Journey</p>
          <p className="text-purple-100 text-sm">Join me on PlateMate - AI-Powered Food Tracking</p>
        </div>
      </div>
    );
  }
);

ChallengeShareCard.displayName = 'ChallengeShareCard';
