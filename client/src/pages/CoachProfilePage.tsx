import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, User, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AiCoachMemory } from "@shared/schema";
import { motion } from "framer-motion";

export function CoachProfilePage() {
  const { toast } = useToast();
  
  // Form state
  const [age, setAge] = useState<number | null>(null);
  const [occupation, setOccupation] = useState("");
  const [lifestyleDetails, setLifestyleDetails] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [fitnessGoals, setFitnessGoals] = useState("");
  const [stressGoals, setStressGoals] = useState("");
  const [sleepGoals, setSleepGoals] = useState("");
  const [mentalHealthGoals, setMentalHealthGoals] = useState("");
  const [workSchedule, setWorkSchedule] = useState("");
  const [exerciseFrequency, setExerciseFrequency] = useState("");

  // Fetch user's coach memory
  const { data: memory, isLoading } = useQuery<AiCoachMemory>({
    queryKey: ['/api/coach-memory'],
  });

  // Populate form when data loads
  useEffect(() => {
    if (memory) {
      setAge(memory.age || null);
      setOccupation(memory.occupation || "");
      setLifestyleDetails(memory.lifestyleDetails || "");
      setInterests(memory.interests || []);
      setFitnessGoals(memory.fitnessGoals || "");
      setStressGoals(memory.stressGoals || "");
      setSleepGoals(memory.sleepGoals || "");
      setMentalHealthGoals(memory.mentalHealthGoals || "");
      setWorkSchedule(memory.workSchedule || "");
      setExerciseFrequency(memory.exerciseFrequency || "");
    }
  }, [memory]);

  // Update memory mutation
  const updateMemory = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/coach-memory', {
        method: 'PATCH',
        body: JSON.stringify({
          age: age || undefined,
          occupation: occupation || undefined,
          lifestyleDetails: lifestyleDetails || undefined,
          interests: interests.length > 0 ? interests : undefined,
          fitnessGoals: fitnessGoals || undefined,
          stressGoals: stressGoals || undefined,
          sleepGoals: sleepGoals || undefined,
          mentalHealthGoals: mentalHealthGoals || undefined,
          workSchedule: workSchedule || undefined,
          exerciseFrequency: exerciseFrequency || undefined,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coach-memory'] });
      toast({
        title: "Profile Updated!",
        description: "Your coach will use this information to personalize conversations.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleSave = () => {
    // Validate that at least one field has meaningful content
    const hasContent = 
      (age && age > 0) ||
      (occupation && occupation.trim().length > 0) ||
      (lifestyleDetails && lifestyleDetails.trim().length > 0) ||
      (interests && interests.length > 0) ||
      (fitnessGoals && fitnessGoals.trim().length > 0) ||
      (stressGoals && stressGoals.trim().length > 0) ||
      (sleepGoals && sleepGoals.trim().length > 0) ||
      (mentalHealthGoals && mentalHealthGoals.trim().length > 0) ||
      (workSchedule && workSchedule.trim().length > 0) ||
      (exerciseFrequency && exerciseFrequency.trim().length > 0);
    
    if (!hasContent) {
      toast({
        title: "No Changes",
        description: "Please add at least one piece of information to save.",
        variant: "destructive",
      });
      return;
    }
    
    updateMemory.mutate();
  };

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
            <User className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">
              Your Coach Profile
            </h1>
          </div>
          <p className="text-white/90">
            Help your AI coach get to know you better
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

        {/* Form */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Personal Details */}
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Personal Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="age">Age (optional)</Label>
                  <Input
                    id="age"
                    type="number"
                    value={age || ""}
                    onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Your age"
                    data-testid="input-age"
                  />
                </div>

                <div>
                  <Label htmlFor="occupation">Occupation (optional)</Label>
                  <Input
                    id="occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g., Nurse, Teacher, Engineer"
                    data-testid="input-occupation"
                  />
                </div>

                <div>
                  <Label htmlFor="lifestyle">Lifestyle Details (optional)</Label>
                  <Input
                    id="lifestyle"
                    value={lifestyleDetails}
                    onChange={(e) => setLifestyleDetails(e.target.value)}
                    placeholder="e.g., Night shifts, Ex-military, Parent of young kids"
                    data-testid="input-lifestyle"
                  />
                </div>

                <div>
                  <Label htmlFor="workSchedule">Work Schedule (optional)</Label>
                  <Input
                    id="workSchedule"
                    value={workSchedule}
                    onChange={(e) => setWorkSchedule(e.target.value)}
                    placeholder="e.g., Day shifts, Night shifts, Rotating schedule"
                    data-testid="input-work-schedule"
                  />
                </div>
              </div>
            </Card>

            {/* Interests & Hobbies */}
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Interests & Hobbies
              </h2>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                    placeholder="Add an interest (gym, music, gaming, etc.)"
                    data-testid="input-new-interest"
                  />
                  <Button
                    onClick={handleAddInterest}
                    variant="outline"
                    size="icon"
                    data-testid="button-add-interest"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full flex items-center gap-2"
                        data-testid={`tag-interest-${interest}`}
                      >
                        {interest}
                        <button
                          onClick={() => handleRemoveInterest(interest)}
                          className="hover:text-purple-900 dark:hover:text-purple-100"
                          data-testid={`button-remove-${interest}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Goals Beyond Nutrition */}
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Personal Goals
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fitnessGoals">Fitness Goals (optional)</Label>
                  <Textarea
                    id="fitnessGoals"
                    value={fitnessGoals}
                    onChange={(e) => setFitnessGoals(e.target.value)}
                    placeholder="e.g., Build strength, Run 5K, Improve flexibility"
                    rows={2}
                    data-testid="input-fitness-goals"
                  />
                </div>

                <div>
                  <Label htmlFor="stressGoals">Stress Management Goals (optional)</Label>
                  <Textarea
                    id="stressGoals"
                    value={stressGoals}
                    onChange={(e) => setStressGoals(e.target.value)}
                    placeholder="e.g., Better work-life balance, Learn to say no"
                    rows={2}
                    data-testid="input-stress-goals"
                  />
                </div>

                <div>
                  <Label htmlFor="sleepGoals">Sleep Goals (optional)</Label>
                  <Textarea
                    id="sleepGoals"
                    value={sleepGoals}
                    onChange={(e) => setSleepGoals(e.target.value)}
                    placeholder="e.g., Consistent sleep schedule, 8 hours per night"
                    rows={2}
                    data-testid="input-sleep-goals"
                  />
                </div>

                <div>
                  <Label htmlFor="mentalHealthGoals">Mental Health Goals (optional)</Label>
                  <Textarea
                    id="mentalHealthGoals"
                    value={mentalHealthGoals}
                    onChange={(e) => setMentalHealthGoals(e.target.value)}
                    placeholder="e.g., Build confidence, Reduce anxiety"
                    rows={2}
                    data-testid="input-mental-health-goals"
                  />
                </div>

                <div>
                  <Label htmlFor="exerciseFrequency">Exercise Frequency (optional)</Label>
                  <Input
                    id="exerciseFrequency"
                    value={exerciseFrequency}
                    onChange={(e) => setExerciseFrequency(e.target.value)}
                    placeholder="e.g., Daily, 3x per week, Weekend warrior"
                    data-testid="input-exercise-frequency"
                  />
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={updateMemory.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white py-6 text-lg"
              data-testid="button-save-profile"
            >
              {updateMemory.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
