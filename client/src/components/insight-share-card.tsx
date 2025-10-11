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
        className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-2xl w-[600px] text-white"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold">My {period === 'daily' ? 'Daily' : 'Weekly'} Reflection</h1>
            <p className="text-indigo-100 text-sm">{date}</p>
          </div>
        </div>

        {/* What Went Well */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-900" />
            </div>
            <h3 className="font-bold">What Went Well</h3>
          </div>
          <p className="text-sm leading-relaxed">
            {wentWell.length > 150 ? wentWell.substring(0, 150) + '...' : wentWell}
          </p>
        </div>

        {/* Could Improve */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-yellow-900" />
            </div>
            <h3 className="font-bold">Room for Growth</h3>
          </div>
          <p className="text-sm leading-relaxed">
            {couldImprove.length > 150 ? couldImprove.substring(0, 150) + '...' : couldImprove}
          </p>
        </div>

        {/* Positivity Score */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Positivity Score</span>
            <span className="text-2xl font-bold">{sentimentScore}%</span>
          </div>
          <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
              style={{ width: `${sentimentScore}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/30 pt-4 text-center">
          <p className="text-lg font-semibold mb-1">AI-Powered Nutrition Insights</p>
          <p className="text-indigo-100 text-sm">PlateMate - Your Personal Nutrition Coach</p>
        </div>
      </div>
    );
  }
);

InsightShareCard.displayName = 'InsightShareCard';
