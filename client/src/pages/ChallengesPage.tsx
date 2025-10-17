import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DropdownNavigation } from "@/components/dropdown-navigation";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Flame, Target, CheckCircle2, Lock, ArrowLeft, Share2 } from "lucide-react";
import type { ChallengeWithProgress } from "@shared/schema";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { soundService } from "@/lib/sound-service";
import { ChallengeShareCard } from "@/components/challenge-share-card";
import { generateAndShareCard } from "@/lib/share-image-generator";
import { Link } from "wouter";

export function ChallengesPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const shareCardRef = useRef<HTMLDivElement>(null);

  const { data: challenges = [], isLoading: challengesLoading } = useQuery<ChallengeWithProgress[]>({
    queryKey: ['/api/challenges'],
    enabled: isAuthenticated,
  });

  const { data: pointsData, isLoading: pointsLoading } = useQuery<{ points: number }>({
    queryKey: ['/api/challenges/points'],
    enabled: isAuthenticated,
  });

  const { data: streakData, isLoading: streakLoading } = useQuery<{ streak: number }>({
    queryKey: ['/api/challenges/streak'],
    enabled: isAuthenticated,
  });

  const totalPoints = pointsData?.points || 0;
  const currentStreak = streakData?.streak || 0;

  const inProgressChallenges = challenges.filter(c => !c.progress || c.progress.isCompleted === 0);
  const completedChallenges = challenges.filter(c => c.progress?.isCompleted === 1);

  const handleShare = async () => {
    if (!shareCardRef.current) return;

    try {
      // Create text fallback for when image sharing fails
      const textFallback = `🏆 My PlateMate Achievements

📊 Total Points: ${totalPoints}
🔥 Current Streak: ${currentStreak} days
✅ Challenges Completed: ${completedChallenges.length}

Track your nutrition goals and earn rewards on PlateMate!`;

      const shared = await generateAndShareCard(
        shareCardRef.current,
        `I've earned ${totalPoints} points and have a ${currentStreak} day streak on PlateMate! 🏆`,
        `Check out my progress: ${completedChallenges.length} challenges completed!`,
        textFallback,
        `platemate-achievements-${new Date().toISOString().split('T')[0]}.png`
      );
      
      if (shared) {
        soundService.playSuccess();
        toast({
          title: "Achievement Shared!",
          description: "Your achievement card has been shared successfully.",
        });
      }
      // If false: either user cancelled or browser doesn't support file sharing (will auto-download)
      // No message needed - browser's download notification will show if downloaded
    } catch (error) {
      soundService.playError();
      toast({
        title: "Share Failed",
        description: "Could not generate achievement card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = (challenge: ChallengeWithProgress) => {
    if (!challenge.progress) return 0;
    return Math.min((challenge.progress.currentCount / challenge.targetCount) * 100, 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="p-8 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Login Required</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to view your challenges
            </p>
          </Card>
        </div>
        <DropdownNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 dark:from-purple-700 dark:to-violet-700 text-white p-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/">
              <button
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <Trophy className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Challenges</h1>
          </div>
          <p className="text-blue-100">Complete challenges to earn rewards and track your progress</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 -mt-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{totalPoints}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{currentStreak} days</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Share Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mb-6"
        >
          <Button
            onClick={handleShare}
            className="w-full"
            data-testid="button-share-achievements"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share My Achievements
          </Button>
        </motion.div>

        {/* In Progress Challenges */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Active Challenges
          </h2>
          
          {challengesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </Card>
              ))}
            </div>
          ) : inProgressChallenges.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">
              <p>All challenges completed! Great job! 🎉</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {inProgressChallenges.map((challenge, index) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="p-4 hover:shadow-lg transition-shadow" data-testid={`card-challenge-${challenge.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{challenge.rewardBadge}</div>
                        <div>
                          <h3 className="font-bold text-lg">{challenge.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{challenge.description}</p>
                        </div>
                      </div>
                      <div className={`text-xs font-semibold uppercase ${getDifficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty}
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-semibold">
                          {challenge.progress?.currentCount || 0} / {challenge.targetCount}
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(challenge)} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                        <Star className="w-4 h-4" />
                        <span className="font-semibold">{challenge.rewardPoints} points</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {challenge.challengeType === 'streak' && '🔥 Streak Challenge'}
                        {challenge.challengeType === 'count' && '📊 Count Challenge'}
                        {challenge.challengeType === 'goal' && '🎯 Goal Challenge'}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Completed Challenges
            </h2>
            
            <div className="space-y-3">
              {completedChallenges.map((challenge, index) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="p-3 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" data-testid={`card-completed-${challenge.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl opacity-75">{challenge.rewardBadge}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{challenge.name}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Completed {challenge.progress?.completedAt ? new Date(challenge.progress.completedAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-semibold">
                        <Star className="w-4 h-4" />
                        <span>+{challenge.rewardPoints}</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hidden Share Card for Image Generation */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <ChallengeShareCard
          ref={shareCardRef}
          points={totalPoints}
          streak={currentStreak}
          completedChallenges={completedChallenges.length}
        />
      </div>

      <DropdownNavigation />
    </div>
  );
}
