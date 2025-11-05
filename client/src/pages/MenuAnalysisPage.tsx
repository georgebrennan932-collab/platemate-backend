import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, PlusCircle, Flame, Activity, FileText, Camera, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { soundService } from "@/lib/sound-service";
import { buildApiUrl } from "@/lib/api-config";

interface MenuRecommendation {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matchScore: number;
  matchReason: string;
}

interface MenuPhoto {
  id: string;
  file: File;
  preview: string;
}

export function MenuAnalysisPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [menuUrl, setMenuUrl] = useState<string>("");
  const [manualMenuText, setManualMenuText] = useState<string>("");
  const [useManualInput, setUseManualInput] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Extract URL from query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const url = params.get('url');
    if (url) {
      setMenuUrl(decodeURIComponent(url));
    } else {
      // No URL provided, go straight to manual input mode
      setUseManualInput(true);
    }
  }, [location]);

  // Fetch webpage content
  const { data: webpageData, isLoading: isFetchingPage, error: fetchError } = useQuery({
    queryKey: ['/api/fetch-webpage', menuUrl],
    enabled: !!menuUrl && !useManualInput,
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/fetch-webpage', { url: menuUrl });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch webpage' }));
        
        // If fetching fails, switch to manual input mode
        setUseManualInput(true);
        toast({
          title: "Couldn't fetch menu automatically",
          description: errorData.suggestion || "Please paste the menu text manually",
          variant: "default"
        });
        
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch webpage`);
      }
      
      const data = await response.json();
      return data;
    }
  });

  // Auto-analyze when webpage data is fetched from allowlisted domains
  useEffect(() => {
    if (webpageData?.content && !analyzeMenuMutation.data && !analyzeMenuMutation.isPending) {
      console.log('📄 Auto-analyzing fetched menu content');
      analyzeMenuMutation.mutate(webpageData.content);
    }
  }, [webpageData]);

  // Analyze menu mutation (triggered by button click, not automatic)
  const analyzeMenuMutation = useMutation({
    mutationFn: async (menuText: string) => {
      const response = await apiRequest('POST', '/api/analyze-menu', {
        menuText,
        url: menuUrl || 'manual-input'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to analyze menu' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to analyze menu`);
      }
      
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      soundService.playSuccess();
    },
    onError: (error: Error) => {
      soundService.playError();
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze menu",
        variant: "destructive",
      });
    }
  });

  const menuAnalysis = analyzeMenuMutation.data;
  const isAnalyzing = analyzeMenuMutation.isPending;
  const analysisError = analyzeMenuMutation.error;

  // Add meal to diary mutation
  const addToDiaryMutation = useMutation({
    mutationFn: async (meal: MenuRecommendation) => {
      // Create a food analysis entry for this meal
      const analysisResponse = await apiRequest('POST', '/api/analyze-text', {
        foodDescription: `${meal.name}: ${meal.description}`
      });
      
      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({ error: 'Failed to analyze meal' }));
        throw new Error(errorData.error || 'Failed to analyze meal');
      }
      
      const analysis = await analysisResponse.json();
      
      if (!analysis?.id) {
        throw new Error('Analysis failed: No ID returned');
      }

      // Add to diary
      const now = new Date();
      const diaryResponse = await apiRequest('POST', '/api/diary', {
        analysisId: analysis.id,
        mealType: selectedMealType,
        mealDate: now.toISOString(),
        notes: `From menu: ${menuUrl}`
      });
      
      if (!diaryResponse.ok) {
        const errorData = await diaryResponse.json().catch(() => ({ error: 'Failed to add to diary' }));
        throw new Error(errorData.error || 'Failed to add to diary');
      }
      
      return await diaryResponse.json();
    },
    onSuccess: () => {
      soundService.playSuccess();
      toast({
        title: "Added to Diary!",
        description: "Your meal has been saved to your food diary.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/diary'] });
    },
    onError: (error: Error) => {
      soundService.playError();
      toast({
        title: "Error",
        description: error.message || "Failed to add meal to diary",
        variant: "destructive",
      });
    }
  });

  // Extract text from menu photos mutation
  const extractTextMutation = useMutation({
    mutationFn: async (photos: MenuPhoto[]) => {
      console.log(`📸 Extracting text from ${photos.length} photos`);
      const formData = new FormData();
      photos.forEach((photo, index) => {
        console.log(`📸 Adding photo ${index + 1}:`, photo.file.name, photo.file.type, photo.file.size);
        formData.append('images', photo.file);
      });
      
      console.log('📸 Sending request to /api/extract-menu-text');
      const response = await fetch(buildApiUrl('/api/extract-menu-text'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData
      });
      
      console.log('📸 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to extract text' }));
        console.error('📸 Extraction failed:', errorData);
        throw new Error(errorData.error || 'Failed to extract menu text from photos');
      }
      
      const result = await response.json();
      console.log('📸 Extraction successful:', result);
      return result;
    },
    onSuccess: (data) => {
      soundService.playSuccess();
      setManualMenuText(data.combinedText || '');
      toast({
        title: "Text Extracted!",
        description: `Successfully extracted text from ${menuPhotos.length} photo(s)`,
      });
    },
    onError: (error: Error) => {
      soundService.playError();
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract text from photos",
        variant: "destructive",
      });
    }
  });

  // Handle photo capture
  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const newPhotos: MenuPhoto[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setMenuPhotos(prev => [...prev, ...newPhotos]);
    
    toast({
      title: "Photo Added",
      description: `Added ${newPhotos.length} photo(s). Total: ${menuPhotos.length + newPhotos.length}`,
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete a photo
  const handleDeletePhoto = (photoId: string) => {
    setMenuPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  // Cleanup photo previews on unmount
  useEffect(() => {
    return () => {
      menuPhotos.forEach(photo => URL.revokeObjectURL(photo.preview));
    };
  }, [menuPhotos]);

  const isLoading = isFetchingPage || isAnalyzing;
  // Only show fetch error if we're not in manual input mode
  const error = useManualInput ? analysisError : (fetchError || analysisError);
  const recommendations = menuAnalysis?.recommendations || [];

  return (
    <div className="min-h-screen bg-purple-500 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-6 shadow-lg">
        <div className="flex items-center space-x-4 mb-2">
          <Link to="/" data-testid="button-back">
            <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <ArrowLeft className="h-6 w-6" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold">📸 Menu Scanner</h1>
        </div>
        <p className="text-purple-100 text-sm ml-14">
          Photograph menus for AI-powered meal recommendations
        </p>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Camera and Manual Input - Always visible for photo scanning and manual text entry */}
        {!isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Camera className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                📸 Scan Menu with Camera
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Take photos of restaurant menus and we'll use AI to extract the text and recommend meals that match your nutrition goals.
            </p>
            
            {/* Photo Scanner Section - TEMPORARILY DISABLED */}
            <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-lg border-2 border-gray-300 dark:border-gray-700 opacity-60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                    Photo Scanner (Coming Soon)
                  </h3>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-3">
                AI photo text extraction is being optimized. For now, please use the manual text paste option below.
              </p>
              
              {/* Disabled - buttons hidden for now */}
            </div>
            
            {/* Manual Text Input Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                  Or Paste Menu Text Manually
                </h3>
              </div>
              
              {menuUrl && (
                <div className="mb-4 space-y-3">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                    <p className="text-purple-900 dark:text-purple-100 text-sm font-semibold mb-2">
                      📱 QR Code Detected
                    </p>
                    <p className="text-purple-700 dark:text-purple-300 text-xs break-all">
                      {menuUrl}
                    </p>
                  </div>
                  <a 
                    href={menuUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 text-center"
                    data-testid="link-open-menu-url"
                  >
                    📄 Open Menu in New Tab
                  </a>
                  <p className="text-gray-500 dark:text-gray-400 text-xs text-center">
                    After opening, copy the menu text and paste it below
                  </p>
                </div>
              )}
              
              <textarea
                value={manualMenuText}
                onChange={(e) => setManualMenuText(e.target.value)}
                placeholder="Paste the restaurant menu here..."
                className="w-full h-48 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:border-purple-500 focus:outline-none resize-none"
                data-testid="input-manual-menu"
              />
              <button
                onClick={() => {
                  if (manualMenuText.trim().length > 10) {
                    analyzeMenuMutation.mutate(manualMenuText.trim());
                  } else {
                    toast({
                      title: "Menu text too short",
                      description: "Please paste more menu content to analyze",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={manualMenuText.trim().length < 10 || analyzeMenuMutation.isPending}
                className="mt-4 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-bold transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                data-testid="button-analyze-menu"
              >
                {analyzeMenuMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze Menu</span>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Loader2 className="h-16 w-16 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {isFetchingPage ? "Fetching menu..." : "Analyzing menu with AI..."}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              This may take a few moments
            </p>
          </motion.div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center"
          >
            <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
              Unable to Analyze Menu
            </p>
            <p className="text-red-500 dark:text-red-300 text-sm">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <Link to="/">
              <button
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                data-testid="button-back-home"
              >
                Back to Home
              </button>
            </Link>
          </motion.div>
        )}

        {/* Meal Type Selector */}
        {!isLoading && !error && recommendations.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meal Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`py-2 px-4 rounded-lg font-medium capitalize transition-all ${
                    selectedMealType === type
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  data-testid={`button-meal-type-${type}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations List */}
        {!isLoading && !error && recommendations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Recommended for You
            </h2>
            {recommendations.map((meal: MenuRecommendation, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-2 border-gray-100 dark:border-gray-700"
              >
                {/* Match Score Badge */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {meal.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      meal.matchScore >= 80
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : meal.matchScore >= 60
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {meal.matchScore}% Match
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  {meal.description}
                </p>

                {/* Match Reason */}
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-purple-700 dark:text-purple-300 text-sm">
                    <strong>Why this matches:</strong> {meal.matchReason}
                  </p>
                </div>

                {/* Nutrition Info */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
                    <Flame className="h-4 w-4 mx-auto mb-1 text-orange-600 dark:text-orange-400" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Calories</p>
                    <p className="font-bold text-gray-800 dark:text-white">{meal.calories}</p>
                  </div>
                  <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                    <Activity className="h-4 w-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Protein</p>
                    <p className="font-bold text-gray-800 dark:text-white">{meal.protein}g</p>
                  </div>
                  <div className="text-center p-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Carbs</p>
                    <p className="font-bold text-gray-800 dark:text-white">{meal.carbs}g</p>
                  </div>
                  <div className="text-center p-2 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Fat</p>
                    <p className="font-bold text-gray-800 dark:text-white">{meal.fat}g</p>
                  </div>
                </div>

                {/* Add to Diary Button */}
                <button
                  onClick={() => addToDiaryMutation.mutate(meal)}
                  disabled={addToDiaryMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-2"
                  data-testid={`button-add-meal-${index}`}
                >
                  {addToDiaryMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-5 w-5" />
                      <span>Add to Diary</span>
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* No Recommendations - only show after an analysis has been attempted */}
        {!isLoading && !error && recommendations.length === 0 && menuAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center"
          >
            <p className="text-yellow-700 dark:text-yellow-400 font-semibold mb-2">
              No Recommendations Available
            </p>
            <p className="text-yellow-600 dark:text-yellow-300 text-sm">
              We couldn't find any menu items to recommend. Please try pasting different menu content.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
