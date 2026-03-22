import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { motion } from 'framer-motion';
import { Dice5, Swords, Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { user, refreshBalance } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshBalance();
    Promise.all([
      API.get('/wallet/transactions').then(r => setTransactions(r.data.transactions?.slice(0, 5) || [])),
      API.get('/games/recent').then(r => setRecentGames(r.data.games?.slice(0, 5) || [])),
    ]).finally(() => setLoading(false));
  }, [refreshBalance]);

  const quickActions = [
    { label: 'Dice Game', path: '/games/dice', icon: Dice5, color: 'emerald' },
    { label: 'PVP Cards', path: '/games/pvp', icon: Swords, color: 'cyan' },
    { label: 'Deposit', path: '/wallet', icon: Wallet, color: 'amber' },
  ];

  return (
    <div data-testid="dashboard-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight" data-testid="dashboard-welcome">
            Welcome, {user?.username}
          </h1>
          <p className="text-sm text-[#94a3b8] mt-1">Your crypto gaming dashboard</p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Balance card - spans 2 cols */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-8 relative overflow-hidden" data-testid="balance-card">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
            <div className="relative">
              <p className="text-sm text-[#94a3b8]">Total Balance</p>
              <p className="font-mono text-4xl sm:text-5xl font-bold text-white mt-2" data-testid="dashboard-balance">
                {loading ? <Skeleton className="h-12 w-48 skeleton-shimmer" /> : `${(user?.balance || 0).toFixed(2)}`}
              </p>
              <p className="text-sm text-[#94a3b8] mt-1">USDT TRC-20</p>

              <div className="flex gap-3 mt-6">
                <Link to="/wallet">
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl btn-glow" data-testid="dashboard-deposit-btn">
                    <ArrowDownRight className="w-4 h-4 mr-2" /> Deposit
                  </Button>
                </Link>
                <Link to="/wallet">
                  <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl" data-testid="dashboard-withdraw-btn">
                    <ArrowUpRight className="w-4 h-4 mr-2" /> Withdraw
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            {quickActions.map(a => (
              <Link key={a.label} to={a.path}>
                <div
                  className="glass-card rounded-2xl p-5 flex items-center gap-4 group cursor-pointer hover:scale-[1.02] transition-transform mb-4"
                  data-testid={`quick-action-${a.label.toLowerCase().replace(' ', '-')}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${
                    a.color === 'emerald' ? 'bg-emerald-500/10' : a.color === 'cyan' ? 'bg-cyan-500/10' : 'bg-amber-500/10'
                  } flex items-center justify-center`}>
                    <a.icon className={`w-5 h-5 ${
                      a.color === 'emerald' ? 'text-emerald-400' : a.color === 'cyan' ? 'text-cyan-400' : 'text-amber-400'
                    }`} />
                  </div>
                  <span className="text-white font-medium text-sm">{a.label}</span>
                  <ArrowUpRight className="w-4 h-4 text-[#94a3b8] ml-auto group-hover:text-white transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Recent Transactions */}
          <div className="glass-card rounded-2xl p-6" data-testid="recent-transactions">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Unbounded'] text-sm font-semibold text-white">Recent Transactions</h3>
              <Link to="/wallet" className="text-xs text-emerald-400 hover:underline">View All</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full skeleton-shimmer rounded-lg" />)}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-[#94a3b8] text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === 'win' || tx.type === 'deposit' || tx.type === 'referral_bonus' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      }`}>
                        {tx.type === 'win' || tx.type === 'deposit' || tx.type === 'referral_bonus'
                          ? <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                          : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm text-white capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-xs text-[#555]">{new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-sm font-semibold ${
                      tx.type === 'win' || tx.type === 'deposit' || tx.type === 'referral_bonus' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'win' || tx.type === 'deposit' || tx.type === 'referral_bonus' ? '+' : '-'}{tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Games */}
          <div className="glass-card rounded-2xl p-6" data-testid="recent-games">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Unbounded'] text-sm font-semibold text-white">Recent Games</h3>
              <Link to="/games/dice" className="text-xs text-emerald-400 hover:underline">Play Now</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full skeleton-shimmer rounded-lg" />)}
              </div>
            ) : recentGames.length === 0 ? (
              <p className="text-sm text-[#94a3b8] text-center py-8">No games yet</p>
            ) : (
              <div className="space-y-2">
                {recentGames.map(g => (
                  <div key={g.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      {g.type === 'dice' ? <Dice5 className="w-4 h-4 text-cyan-400" /> : <Swords className="w-4 h-4 text-amber-400" />}
                      <div>
                        <p className="text-sm text-white">{g.username || 'Player'}</p>
                        <p className="text-xs text-[#555] capitalize">{g.type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-sm font-semibold ${g.is_win ? 'text-emerald-400' : 'text-red-400'}`}>
                      {g.is_win ? `+${(g.win_amount || 0).toFixed(0)}` : `-${(g.bet_amount || 0).toFixed(0)}`} USDT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
