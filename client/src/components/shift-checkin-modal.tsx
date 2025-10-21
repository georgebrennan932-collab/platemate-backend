import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, X, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";

interface ShiftCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShiftCheckInModal({ isOpen, onClose }: ShiftCheckInModalProps) {
  const [selectedShift, setSelectedShift] = useState<string>("");

  const shiftOptions = [
    { value: "day_off", label: "Day Off", emoji: "🏖️", description: "No shift today" },
    { value: "regular", label: "Regular Daytime", emoji: "☀️", description: "Standard 9-5 hours" },
    { value: "early_shift", label: "Early Shift", emoji: "🌅", description: "6am-2pm" },
    { value: "late_shift", label: "Late Shift", emoji: "🌆", description: "2pm-10pm" },
    { value: "night_shift", label: "Night Shift", emoji: "🌙", description: "Overnight hours" },
    { value: "long_shift", label: "Long Clinical Shift", emoji: "🏥", description: "12.5hr NHS/emergency" },
  ];

  const updateShiftMutation = useMutation({
    mutationFn: async (shiftType: string) => {
      const today = new Date().toISOString().split('T')[0];
      return await apiRequest('POST', '/api/user-profile', {
        todayShiftType: shiftType,
        todayShiftDate: today,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profile"] });
      onClose();
    },
  });

  const handleConfirm = () => {
    if (selectedShift) {
      updateShiftMutation.mutate(selectedShift);
    }
  };

  const handleSkip = () => {
    // Dismiss for today by setting flag in localStorage
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`shift-checkin-dismissed-${today}`, "true");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <DialogTitle>Today's Shift</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
              data-testid="button-close-shift-checkin"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Help your AI Coach adapt meal planning for today
          </p>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {shiftOptions.map((shift) => (
            <motion.button
              key={shift.value}
              type="button"
              onClick={() => setSelectedShift(shift.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-4 rounded-xl text-left border-2 transition-all ${
                selectedShift === shift.value
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
              }`}
              data-testid={`shift-option-${shift.value}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{shift.emoji}</span>
                  <div>
                    <div className="font-medium text-sm">{shift.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {shift.description}
                    </div>
                  </div>
                </div>
                {selectedShift === shift.value && (
                  <Clock className="h-4 w-4 text-purple-600" />
                )}
              </div>
            </motion.button>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
            data-testid="button-skip-shift"
          >
            Skip for today
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedShift || updateShiftMutation.isPending}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            data-testid="button-confirm-shift"
          >
            {updateShiftMutation.isPending ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
