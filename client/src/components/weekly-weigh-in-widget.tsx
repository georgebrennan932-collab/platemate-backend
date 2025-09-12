import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Scale } from "lucide-react";
import { WeightForm } from "./weight-form";
import { WeightList } from "./weight-list";
import type { WeightEntry } from "@shared/schema";

interface WeeklyWeighInWidgetProps {
  onEdit?: (entry: WeightEntry) => void;
}

export function WeeklyWeighInWidget({ onEdit }: WeeklyWeighInWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Persist open state in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('home-weight-open');
    if (saved !== null) {
      setIsOpen(saved === 'true');
    }
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    localStorage.setItem('home-weight-open', String(open));
  };

  // Fetch latest weight entry for header display
  const { data: weightEntries } = useQuery<WeightEntry[]>({
    queryKey: ['/api/weights'],
    retry: false,
  });

  const latestEntry = weightEntries?.[0];
  const formatWeight = (weightGrams: number) => {
    const kg = weightGrams / 1000;
    return `${kg.toFixed(1)} kg`;
  };

  // Check if entry is due (no entry in last 7 days)
  const isDue = !latestEntry || (new Date().getTime() - new Date(latestEntry.loggedAt).getTime()) > (7 * 24 * 60 * 60 * 1000);

  return (
    <div className="max-w-md mx-auto px-4 py-3">
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Compact Header */}
          <CollapsibleTrigger asChild>
            <button 
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              data-testid="trigger-weight"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                  <Scale className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    Weekly Weigh-In
                  </span>
                  <div className="flex items-center space-x-2">
                    {latestEntry ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Last: {formatWeight(latestEntry.weightGrams)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        No entries yet
                      </span>
                    )}
                    {isDue && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        Due this week
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenChange(!isOpen);
                  }}
                  className="text-xs"
                  data-testid="button-log-weight"
                >
                  Log
                </Button>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
          </CollapsibleTrigger>

          {/* Collapsible Content */}
          <CollapsibleContent>
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
              {/* Weight Form */}
              <WeightForm 
                compact 
                onSuccess={() => {
                  // Keep expanded after success to show the new entry
                }}
              />
              
              {/* Recent Weight Entries */}
              {weightEntries && weightEntries.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Recent Entries
                  </h4>
                  <ScrollArea className="max-h-64">
                    <WeightList compact onEdit={onEdit} />
                  </ScrollArea>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}