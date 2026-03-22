import { useState, useEffect, useCallback } from 'react';
import API from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Calendar, Medal, Crown } from 'lucide-react';

const rankColors = ['text-amber-400', 'text-[#C0C0C0]', 'text-amber-700'];
const rankBgs = ['bg-amber-500/10', 'bg-[#C0C0C0]/10', 'bg-amber-700/10'];

function RankBadge({ rank }) {
  if (rank <= 3) {
    return (
      <div className={`w-8 h-8 rounded-lg ${rankBgs[rank - 1]} flex items-center justify-center`}>
        <Crown className={`w-4 h-4 ${rankColors[rank - 1]}`} />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
      <span className="text-xs font-mono font-bold text-[#94a3b8]">{rank}</span>
    </div>
  );
}

function LeaderboardTable({ data, valueKey, valueLabel, valueSuffix = ' USDT', emptyText }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Medal className="w-8 h-8 text-[#555] mx-auto mb-3" />
        <p className="text-sm text-[#94a3b8]">{emptyText || 'No data yet'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center px-4 py-2 text-[10px] text-[#94a3b8] uppercase tracking-wider">
        <span className="w-10">Rank</span>
        <span className="flex-1">Player</span>
        <span className="text-right w-28">{valueLabel}</span>
        {data[0]?.games_won !== undefined && (
          <span className="text-right w-20">Games</span>
        )}
      </div>

      {data.map((entry, i) => (
        <motion.div
          key={entry.username + i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
            i < 3 ? 'bg-white/[0.03] border border-white/5' : 'hover:bg-white/[0.02]'
          }`}
          data-testid={`leaderboard-row-${i}`}
        >
          <div className="w-10">
            <RankBadge rank={i + 1} />
          </div>
          <div className="flex-1 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              i === 0 ? 'bg-amber-500/20' : i === 1 ? 'bg-[#C0C0C0]/20' : i === 2 ? 'bg-amber-700/20' : 'bg-emerald-500/10'
            }`}>
              <span className={`text-xs font-bold ${
                i === 0 ? 'text-amber-400' : i === 1 ? 'text-[#C0C0C0]' : i === 2 ? 'text-amber-700' : 'text-emerald-400'
              }`}>{entry.username?.[0]?.toUpperCase()}</span>
            </div>
            <span className={`text-sm font-medium ${i < 3 ? 'text-white' : 'text-[#94a3b8]'}`}>
              {entry.username}
            </span>
          </div>
          <span className={`text-right w-28 font-mono text-sm font-semibold ${
            (entry[valueKey] || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {(entry[valueKey] || 0) >= 0 ? '+' : ''}{(entry[valueKey] || 0).toFixed(2)}{valueSuffix}
          </span>
          {entry.games_won !== undefined && (
            <span className="text-right w-20 font-mono text-xs text-[#94a3b8]">
              {entry.games_won} wins
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data: lb } = await API.get('/leaderboard');
      setData(lb);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const iv = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(iv);
  }, [fetchLeaderboard]);

  const weekStart = data?.week_start
    ? new Date(data.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div data-testid="leaderboard-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight">Leaderboard</h1>
            <p className="text-sm text-[#94a3b8] mt-1">Top players. Updated every 30 seconds.</p>
          </div>
          {weekStart && (
            <div className="flex items-center gap-2 text-xs text-[#94a3b8] glass-card px-3 py-1.5 rounded-lg">
              <Calendar className="w-3 h-3" />
              Week of {weekStart}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 skeleton-shimmer rounded-xl" />)}
          </div>
        ) : (
          <Tabs defaultValue="weekly" className="glass-card rounded-2xl p-6">
            <TabsList className="bg-white/5 border border-white/5" data-testid="leaderboard-tabs">
              <TabsTrigger value="weekly" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="leaderboard-tab-weekly">
                <Calendar className="w-3 h-3 mr-1.5" /> Weekly
              </TabsTrigger>
              <TabsTrigger value="alltime" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="leaderboard-tab-alltime">
                <Trophy className="w-3 h-3 mr-1.5" /> All Time
              </TabsTrigger>
              <TabsTrigger value="profit" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="leaderboard-tab-profit">
                <TrendingUp className="w-3 h-3 mr-1.5" /> Top Profit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="mt-4">
              <LeaderboardTable
                data={data?.weekly_winners}
                valueKey="total_wins"
                valueLabel="Winnings"
                emptyText="No winners this week yet. Be the first!"
              />
            </TabsContent>

            <TabsContent value="alltime" className="mt-4">
              <LeaderboardTable
                data={data?.top_winners}
                valueKey="total_wins"
                valueLabel="Total Won"
                emptyText="No winners yet"
              />
            </TabsContent>

            <TabsContent value="profit" className="mt-4">
              <LeaderboardTable
                data={data?.top_profit}
                valueKey="profit"
                valueLabel="Net Profit"
                emptyText="No profit data yet"
              />
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </div>
  );
}
