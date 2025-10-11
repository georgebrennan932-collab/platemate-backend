import { forwardRef } from "react";
import { Lightbulb, Check, TrendingUp } from "lucide-react";

interface InsightShareCardProps {
  period: 'daily' | 'weekly';
  wentWell: string;
  couldImprove: string;
  sentimentScore: number;
  date: string;
}

export const InsightShareCard = forwardRef<HTMLDivElement, InsightShareCardProps>(
  ({ period, wentWell, couldImprove, sentimentScore, date }, ref) => {
    return (
      <div
        ref={ref}
        className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-600 p-8 rounded-2xl w-[600px] text-white overflow-hidden"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Metallic overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 pointer-events-none"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <Lightbulb className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">My {period === 'daily' ? 'Daily' : 'Weekly'} Reflection</h1>
              <p className="text-white/90 text-sm font-medium">{date}</p>
            </div>
          </div>

          {/* What Went Well */}
          <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-green-900" />
              </div>
              <h3 className="font-bold text-white">What Went Well</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/95">
              {wentWell.length > 150 ? wentWell.substring(0, 150) + '...' : wentWell}
            </p>
          </div>

          {/* Could Improve */}
          <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <TrendingUp className="w-4 h-4 text-yellow-900" />
              </div>
              <h3 className="font-bold text-white">Room for Growth</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/95">
              {couldImprove.length > 150 ? couldImprove.substring(0, 150) + '...' : couldImprove}
            </p>
          </div>

          {/* Positivity Score */}
          <div className="bg-white/25 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">Positivity Score</span>
              <span className="text-2xl font-bold text-white">{sentimentScore}%</span>
            </div>
            <div className="w-full h-3 bg-white/40 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-emerald-400 shadow-lg"
                style={{ width: `${sentimentScore}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/30 pt-4 text-center">
            <p className="text-lg font-bold text-white mb-1">AI-Powered Nutrition Insights</p>
            <p className="text-white/90 text-sm font-medium">PlateMate - Your Personal Nutrition Coach</p>
          </div>
        </div>
      </div>
    );
  }
);

InsightShareCard.displayName = 'InsightShareCard';
