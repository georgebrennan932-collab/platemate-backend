import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AiCoachMemory } from "@shared/schema";
import { motion } from "framer-motion";

interface Personality {
  id: string;
  name: string;
  description: string;
  responseStyle: {
    tone: string;
    formality: string;
    emoji: boolean;
    directness: string;
  };
}

export function CoachPersonalityPage() {
  const { toast } = useToast();
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);

  // Fetch user's current personality
  const { data: memory, isLoading: memoryLoading } = useQuery<AiCoachMemory>({
    queryKey: ['/api/coach-memory'],
  });

  // Fetch available personalities
  const { data: personalities = [], isLoading: personalitiesLoading } = useQuery<Personality[]>({
    queryKey: ['/api/coach-personalities'],
  });

  // Update personality mutation
  const updatePersonality = useMutation({
    mutationFn: async (personalityId: string) => {
      return apiRequest('/api/coach-memory', {
        method: 'PATCH',
        body: JSON.stringify({ selectedPersonality: personalityId }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coach-memory'] });
      toast({
        title: "Personality Updated!",
        description: "Your AI coach has adopted a new personality.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update personality. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentPersonality = memory?.selectedPersonality || "zen";

  // Initialize selected personality when data loads
  if (selectedPersonality === null && memory?.selectedPersonality) {
    setSelectedPersonality(memory.selectedPersonality);
  }

  const handleSelectPersonality = (personalityId: string) => {
    setSelectedPersonality(personalityId);
  };

  const handleSave = () => {
    if (selectedPersonality) {
      updatePersonality.mutate(selectedPersonality);
    }
  };

  const isLoading = memoryLoading || personalitiesLoading;

  return (
    <div className="min-h-screen bg-purple-500 dark:bg-gray-900 pb-24">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/coaching">
            <button
              className="flex items-center space-x-2 text-white hover:text-purple-200 transition-colors mb-4"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Coach</span>
            </button>
          </Link>

          <div className="flex items-center space-x-3 mb-2">
            <Sparkles className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">
              Choose Your Coach Personality
            </h1>
          </div>
          <p className="text-white/90">
            Select the coaching style that motivates you best
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white/20 dark:bg-gray-800 rounded-xl h-32" />
            ))}
          </div>
        )}

        {/* Personality Cards */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 mb-6"
          >
            {personalities.map((personality, index) => {
              const isSelected = selectedPersonality === personality.id;
              const isCurrent = currentPersonality === personality.id;

              return (
                <motion.div
                  key={personality.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                      isSelected
                        ? 'ring-4 ring-purple-600 dark:ring-purple-400 bg-purple-50 dark:bg-purple-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleSelectPersonality(personality.id)}
                    data-testid={`card-personality-${personality.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {personality.name}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {personality.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                            {personality.responseStyle.tone}
                          </span>
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                            {personality.responseStyle.formality}
                          </span>
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                            {personality.responseStyle.directness}
                          </span>
                          {personality.responseStyle.emoji && (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                              uses emojis
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-4">
                          <div className="h-8 w-8 bg-purple-600 dark:bg-purple-400 rounded-full flex items-center justify-center">
                            <Check className="h-5 w-5 text-white dark:text-gray-900" />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Save Button */}
        {!isLoading && selectedPersonality && selectedPersonality !== currentPersonality && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={handleSave}
              disabled={updatePersonality.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white py-6 text-lg"
              data-testid="button-save-personality"
            >
              {updatePersonality.isPending ? "Saving..." : "Save Personality"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
