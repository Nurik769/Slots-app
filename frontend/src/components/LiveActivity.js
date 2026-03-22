import { useEffect, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import API from '@/lib/api';

const fakeNames = ['CryptoKing', 'LuckyAce', 'DiamondHands', 'MoonShot', 'WhaleHunter', 'SatoshiFan', 'BlockMaster', 'TokenLord', 'NeonTrader', 'PixelBet', 'AlphaWolf', 'BitRunner'];
const fakeAmounts = [5, 10, 15, 25, 50, 75, 100, 150, 200];

function generateFakeActivity() {
  const name = fakeNames[Math.floor(Math.random() * fakeNames.length)];
  const amount = fakeAmounts[Math.floor(Math.random() * fakeAmounts.length)];
  const isWin = Math.random() > 0.4;
  const game = Math.random() > 0.5 ? 'Dice' : 'PVP Cards';
  return { name, amount, isWin, game, id: Math.random().toString(36).substr(2, 9) };
}

export default function LiveActivity() {
  const [activities, setActivities] = useState(() =>
    Array.from({ length: 5 }, generateFakeActivity)
  );

  useEffect(() => {
    // Load real recent games
    API.get('/games/recent').then(({ data }) => {
      if (data.games?.length > 0) {
        const real = data.games.slice(0, 5).map(g => ({
          name: g.username || 'Player',
          amount: g.win_amount || g.bet_amount,
          isWin: g.is_win,
          game: g.type === 'dice' ? 'Dice' : 'PVP Cards',
          id: g.id,
        }));
        setActivities(real);
      }
    }).catch(() => {});

    const interval = setInterval(() => {
      setActivities(prev => {
        const next = [...prev];
        next.pop();
        next.unshift(generateFakeActivity());
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0a0a0b]/90 backdrop-blur-md border-b border-white/5 overflow-hidden" data-testid="live-activity-bar">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-6 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
        {activities.map((a) => (
          <div key={a.id} className="flex items-center gap-2 shrink-0 text-xs">
            {a.isWin ? (
              <Trophy className="w-3 h-3 text-amber-400" />
            ) : (
              <TrendingUp className="w-3 h-3 text-[#94a3b8]" />
            )}
            <span className="text-white font-medium">{a.name}</span>
            <span className={a.isWin ? 'text-emerald-400 font-mono font-semibold' : 'text-red-400 font-mono'}>
              {a.isWin ? '+' : '-'}{a.amount} USDT
            </span>
            <span className="text-[#555] font-mono">{a.game}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
