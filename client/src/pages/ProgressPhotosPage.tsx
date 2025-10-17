import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Camera, ArrowLeft, TrendingDown, TrendingUp, Minus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { WeightEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export function ProgressPhotosPage() {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [displayUnit, setDisplayUnit] = useState<"kg" | "lb">("kg");

  // Fetch weight entries with photos
  const { data: weightEntries = [], isLoading } = useQuery<WeightEntry[]>({
    queryKey: ['/api/weights'],
    select: (data) => {
      // Filter only entries with photos and sort by date (oldest first for timeline)
      return (data || [])
        .filter(entry => entry.imageUrl)
        .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
    },
  });

  const formatWeight = (weightGrams: number): string => {
    if (displayUnit === "kg") {
      return `${(weightGrams / 1000).toFixed(1)} kg`;
    } else {
      return `${(weightGrams / 453.592).toFixed(1)} lb`;
    }
  };

  const formatDate = (dateInput: string | Date): string => {
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateInput.toString();
    }
  };

  const getWeightChange = (index: number): { change: number; trend: 'up' | 'down' | 'same' } | null => {
    if (index === 0) return null;
    const current = weightEntries[index].weightGrams;
    const previous = weightEntries[index - 1].weightGrams;
    const change = current - previous;
    
    if (Math.abs(change) < 100) return { change: 0, trend: 'same' }; // Less than 0.1kg difference
    
    return {
      change: displayUnit === "kg" ? change / 1000 : change / 453.592,
      trend: change > 0 ? 'up' : 'down'
    };
  };

  const handlePreviousPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < weightEntries.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-purple-500 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Timeline Skeleton */}
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-500 dark:bg-gray-900 pb-24">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/diary?tab=weight">
              <button
                className="flex items-center space-x-2 text-white hover:text-purple-200 transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayUnit(displayUnit === "kg" ? "lb" : "kg")}
              data-testid="button-toggle-unit"
            >
              {displayUnit === "kg" ? "kg" : "lb"}
            </Button>
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <Camera className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">
              Progress Photos
            </h1>
          </div>
          <p className="text-white/90">
            Your visual transformation journey
          </p>
        </div>

        {/* Timeline */}
        {weightEntries.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Progress Photos Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start tracking your progress by adding photos when you log your weight
            </p>
            <Link href="/diary?tab=weight">
              <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white" data-testid="button-log-weight">
                Log Weight with Photo
              </Button>
            </Link>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 via-violet-400 to-purple-500"></div>

            {/* Timeline entries */}
            <div className="space-y-8" data-testid="timeline-entries">
              {weightEntries.map((entry, index) => {
                const weightChange = getWeightChange(index);
                const isFirst = index === 0;
                const isLast = index === weightEntries.length - 1;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-12 md:pl-16"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 md:left-4.5 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 ${
                      isFirst ? 'bg-purple-400' : isLast ? 'bg-violet-500' : 'bg-purple-500'
                    }`}></div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                      <div className="md:flex">
                        {/* Photo */}
                        <button
                          onClick={() => setSelectedPhotoIndex(index)}
                          className="relative group w-full md:w-64 h-64 md:h-auto overflow-hidden"
                          data-testid={`button-view-photo-${entry.id}`}
                        >
                          <img
                            src={entry.imageUrl!}
                            alt={`Progress photo from ${formatDate(entry.loggedAt)}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          
                          {/* Badge for first/last */}
                          {isFirst && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              START
                            </div>
                          )}
                          {isLast && (
                            <div className="absolute top-2 left-2 bg-violet-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              LATEST
                            </div>
                          )}
                        </button>

                        {/* Info */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                {formatDate(entry.loggedAt)}
                              </p>
                              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400" data-testid={`text-weight-${entry.id}`}>
                                {formatWeight(entry.weightGrams)}
                              </p>
                            </div>

                            {/* Weight change indicator */}
                            {weightChange && weightChange.trend !== 'same' && (
                              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
                                weightChange.trend === 'down' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {weightChange.trend === 'down' ? (
                                  <TrendingDown className="h-4 w-4" />
                                ) : (
                                  <TrendingUp className="h-4 w-4" />
                                )}
                                <span className="text-sm font-semibold">
                                  {Math.abs(weightChange.change).toFixed(1)} {displayUnit}
                                </span>
                              </div>
                            )}
                          </div>

                          {entry.notes && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-sm text-gray-700 dark:text-gray-300" data-testid={`text-notes-${entry.id}`}>
                                {entry.notes}
                              </p>
                            </div>
                          )}

                          {/* Stats */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">
                                {index === 0 ? 'Starting point' : `${index + 1} of ${weightEntries.length}`}
                              </span>
                              {!isFirst && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {Math.abs((entry.weightGrams - weightEntries[0].weightGrams) / (displayUnit === "kg" ? 1000 : 453.592)).toFixed(1)} {displayUnit} from start
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Full-screen photo viewer */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={(open) => !open && setSelectedPhotoIndex(null)}>
        <DialogContent className="max-w-6xl h-[90vh] p-0" data-testid="dialog-photo-viewer">
          <AnimatePresence mode="wait">
            {selectedPhotoIndex !== null && weightEntries[selectedPhotoIndex] && (
              <motion.div
                key={selectedPhotoIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-semibold text-lg">
                      {formatDate(weightEntries[selectedPhotoIndex].loggedAt)}
                    </p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatWeight(weightEntries[selectedPhotoIndex].weightGrams)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPhotoIndex(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    data-testid="button-close-viewer"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Photo with swipe support */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                  <motion.img
                    key={selectedPhotoIndex}
                    src={weightEntries[selectedPhotoIndex].imageUrl!}
                    alt="Progress photo"
                    className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing"
                    data-testid="img-fullscreen"
                    drag="x"
                    dragElastic={0.7}
                    dragMomentum={false}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipeThreshold = 50;
                      const swipeVelocityThreshold = 500;
                      
                      // Swipe left (next photo)
                      if (offset.x < -swipeThreshold || velocity.x < -swipeVelocityThreshold) {
                        handleNextPhoto();
                      }
                      // Swipe right (previous photo)
                      else if (offset.x > swipeThreshold || velocity.x > swipeVelocityThreshold) {
                        handlePreviousPhoto();
                      }
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />

                  {/* Navigation arrows */}
                  {selectedPhotoIndex > 0 && (
                    <button
                      onClick={handlePreviousPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                      data-testid="button-previous-photo"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  )}
                  {selectedPhotoIndex < weightEntries.length - 1 && (
                    <button
                      onClick={handleNextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                      data-testid="button-next-photo"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  )}

                  {/* Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                    {selectedPhotoIndex + 1} / {weightEntries.length}
                  </div>
                </div>

                {/* Notes */}
                {weightEntries[selectedPhotoIndex].notes && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <p className="text-gray-700 dark:text-gray-300">
                      {weightEntries[selectedPhotoIndex].notes}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
