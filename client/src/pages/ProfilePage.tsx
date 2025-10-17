import { useState, useEffect } from "react";
import { ArrowLeft, User, Save, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DropdownNavigation } from "@/components/dropdown-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

const profileFormSchema = z.object({
  name: z.string().optional(),
  nickname: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  allergies: z.string().optional(),
  foodDislikes: z.string().optional(),
  healthConditions: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export function ProfilePage() {
  const { toast } = useToast();
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [allergyTags, setAllergyTags] = useState<string[]>([]);

  // Fetch user profile
  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/user-profile"],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      nickname: "",
      dietaryRequirements: "",
      allergies: "",
      foodDislikes: "",
      healthConditions: "",
    },
  });

  // Initialize tags and form fields when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.dietaryRequirements && Array.isArray(profile.dietaryRequirements)) {
        setDietaryTags(profile.dietaryRequirements);
      }
      if (profile.allergies && Array.isArray(profile.allergies)) {
        setAllergyTags(profile.allergies);
      }
      // Reset form with profile data
      form.reset({
        name: profile.name || "",
        nickname: profile.nickname || "",
        dietaryRequirements: "",
        allergies: "",
        foodDislikes: profile.foodDislikes || "",
        healthConditions: profile.healthConditions || "",
      });
    }
  }, [profile, form]);

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/user-profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profile"] });
      toast({
        title: "Profile saved!",
        description: "Your dietary preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    saveMutation.mutate({
      name: data.name || null,
      nickname: data.nickname || null,
      dietaryRequirements: dietaryTags,
      allergies: allergyTags,
      foodDislikes: data.foodDislikes || null,
      healthConditions: data.healthConditions || null,
    });
  };

  const commonDietaryOptions = [
    "Vegetarian",
    "Vegan",
    "Pescatarian",
    "Keto",
    "Paleo",
    "Low Carb",
    "Gluten-Free",
    "Dairy-Free",
    "Halal",
    "Kosher",
  ];

  const commonAllergies = [
    "Peanuts",
    "Tree Nuts",
    "Milk/Dairy",
    "Eggs",
    "Fish",
    "Shellfish",
    "Soy",
    "Wheat/Gluten",
    "Sesame",
  ];

  const toggleTag = (tag: string, currentTags: string[], setTags: (tags: string[]) => void) => {
    if (currentTags.includes(tag)) {
      setTags(currentTags.filter((t) => t !== tag));
    } else {
      setTags([...currentTags, tag]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-gradient)'}}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground pb-32" style={{background: 'var(--bg-gradient)'}}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <button 
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6" />
              <h1 className="text-2xl font-bold">My Profile</h1>
            </div>
          </div>
          <p className="mt-2 text-white/90 text-sm ml-14">
            Help your AI Coach give you personalized advice
          </p>
        </div>
      </div>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto p-4 space-y-6"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Help your AI Coach address you personally
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="block mb-2">
                  Your Name
                </Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="e.g., Sarah Johnson"
                  className="w-full"
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label htmlFor="nickname" className="block mb-2">
                  Preferred Name / Nickname
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  What should your AI Coach call you?
                </p>
                <Input
                  id="nickname"
                  {...form.register("nickname")}
                  placeholder="e.g., Sarah, SJ, Coach..."
                  className="w-full"
                  data-testid="input-nickname"
                />
              </div>
            </div>
          </div>

          {/* Dietary Requirements Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Dietary Requirements</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select any dietary preferences or restrictions you follow
            </p>
            <div className="flex flex-wrap gap-2">
              {commonDietaryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleTag(option, dietaryTags, setDietaryTags)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    dietaryTags.includes(option)
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  data-testid={`tag-dietary-${option.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Allergies Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Allergies & Intolerances</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select any foods you're allergic to or intolerant of
            </p>
            <div className="flex flex-wrap gap-2">
              {commonAllergies.map((allergy) => (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => toggleTag(allergy, allergyTags, setAllergyTags)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    allergyTags.includes(allergy)
                      ? "bg-red-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  data-testid={`tag-allergy-${allergy.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}`}
                >
                  {allergy}
                </button>
              ))}
            </div>
          </div>

          {/* Food Dislikes Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <Label htmlFor="foodDislikes" className="text-lg font-semibold block mb-2">
              Foods You Dislike
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Let us know what foods you don't enjoy eating
            </p>
            <Textarea
              id="foodDislikes"
              {...form.register("foodDislikes")}
              placeholder="e.g., Brussels sprouts, cilantro, liver..."
              className="min-h-[100px]"
              data-testid="input-food-dislikes"
            />
          </div>

          {/* Health Conditions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <Label htmlFor="healthConditions" className="text-lg font-semibold block mb-2">
              Health Conditions
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Optional: Share any health conditions that might affect your diet
            </p>
            <Textarea
              id="healthConditions"
              {...form.register("healthConditions")}
              placeholder="e.g., Type 2 diabetes, hypertension, PCOS..."
              className="min-h-[100px]"
              data-testid="input-health-conditions"
            />
          </div>

          {/* Save Button */}
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 rounded-xl text-lg font-semibold shadow-lg"
            data-testid="button-save-profile"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Save Profile
              </>
            )}
          </Button>
        </form>
      </motion.div>

      {/* Dropdown Navigation */}
      <DropdownNavigation />
    </div>
  );
}

export default ProfilePage;
