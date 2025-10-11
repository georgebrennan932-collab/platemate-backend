import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { BottomNavigation } from "@/components/bottom-navigation";
import { BottomHelpSection } from "@/components/bottom-help-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lightbulb, RefreshCw, Calendar, TrendingUp, Check, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Reflection } from "@shared/schema";
import { motion } from "framer-motion";
import { soundService } from "@/lib/sound-service";
import { ShareToFacebook } from "@/components/share-to-facebook";
import { InsightShareCard } from "@/components/insight-share-card";
import { generateAndShareCard } from "@/lib/share-image-generator";
import { Link } from "wouter";

export function InsightsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Fetch latest reflection
  const { data: reflection, isLoading, error } = useQuery<Reflection>({
    queryKey: [`/api/reflections/latest?period=${period}`],
    enabled: isAuthenticated,
  });

  // Generate new reflection
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/reflections/generate?period=${period}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to generate reflection');
      return response.json();
    },
    onSuccess: () => {
      soundService.playSuccess();
      toast({
        title: "Reflection Generated!",
        description: `Your new ${period} reflection is ready.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/reflections/latest?period=${period}`] });
    },
    onError: () => {
      soundService.playError();
      toast({
        title: "Generation Failed",
        description: "Could not generate reflection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleShare = async () => {
    if (!reflection || !shareCardRef.current) return;

    try {
      // Generate and share the image
      const shared = await generateAndShareCard(
        shareCardRef.current,
        `My ${period === 'daily' ? 'Daily' : 'Weekly'} Nutrition Reflection - PlateMate`,
        reflection.wentWell
      );

      // Only update share status if user actually shared
      if (shared) {
        await fetch(`/api/reflections/${reflection.id}/share`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ shareChannel: 'facebook' }),
        });

        soundService.playSuccess();
        toast({
          title: "Reflection Shared!",
          description: "Your reflection card has been shared successfully.",
        });
      }
      // If false: either user cancelled or browser doesn't support file sharing (will auto-download)
      // No message needed - browser's download notification will show if downloaded
    } catch (error) {
      soundService.playError();
      toast({
        title: "Share Failed",
        description: "Could not generate reflection card. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Login Required</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to view your insights
            </p>
          </Card>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white p-6 pb-8">
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
            <Lightbulb className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Insights</h1>
          </div>
          <p className="text-green-100">AI-powered reflections on your nutrition journey</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 -mt-4">
        {/* Period Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex gap-2 mb-6"
        >
          <Button
            variant={period === 'daily' ? 'default' : 'outline'}
            onClick={() => setPeriod('daily')}
            className="flex-1"
            data-testid="button-period-daily"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Daily
          </Button>
          <Button
            variant={period === 'weekly' ? 'default' : 'outline'}
            onClick={() => setPeriod('weekly')}
            className="flex-1"
            data-testid="button-period-weekly"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Weekly
          </Button>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your insights...</p>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Could not load reflection</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please try generating a new one
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-reflection"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              Generate Reflection
            </Button>
          </Card>
        )}

        {/* Reflection Display */}
        {reflection && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6 mb-6 shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {period === 'daily' ? 'Daily' : 'Weekly'} Reflection
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(reflection.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    data-testid="button-regenerate"
                  >
                    <RefreshCw className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                  <ShareToFacebook
                    title={`My ${period === 'daily' ? 'Daily' : 'Weekly'} Nutrition Reflection - PlateMate`}
                    description={reflection.wentWell}
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                  />
                </div>
              </div>

              {/* What Went Well */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">What Went Well</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 ml-12" data-testid="text-went-well">
                  {reflection.wentWell}
                </p>
              </div>

              {/* Could Improve */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Could Improve</h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 ml-12" data-testid="text-could-improve">
                  {reflection.couldImprove}
                </p>
              </div>

              {/* Action Steps */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Action Steps</h3>
                </div>
                <ul className="space-y-2 ml-12">
                  {reflection.actionSteps?.map((step, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                      className="flex items-start gap-2"
                      data-testid={`text-action-step-${index}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{step}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Sentiment Score */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Positivity Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                        style={{ width: `${reflection.sentimentScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {reflection.sentimentScore}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Hidden Share Card for Image Generation */}
      {reflection && (
        <div className="fixed -left-[9999px] -top-[9999px]">
          <InsightShareCard
            ref={shareCardRef}
            period={period}
            wentWell={reflection.wentWell}
            couldImprove={reflection.couldImprove}
            sentimentScore={reflection.sentimentScore}
            date={new Date(reflection.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          />
        </div>
      )}

      <BottomNavigation />
      <BottomHelpSection />
    </div>
  );
}
