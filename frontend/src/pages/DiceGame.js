import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Dice5, Loader2, Trophy, X, History } from 'lucide-react';

const diceFaces = {
  1: [[1,1]],
  2: [[0,2],[2,0]],
  3: [[0,2],[1,1],[2,0]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

function DiceFace({ value, color = 'white', size = 'lg' }) {
  const dots = diceFaces[value] || [];
  const s = size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  const dotS = size === 'lg' ? 'w-4 h-4' : 'w-2.5 h-2.5';

  return (
    <div className={`${s} rounded-2xl bg-[#0a0a0b] border border-white/10 grid grid-cols-3 grid-rows-3 p-2 gap-0.5`}>
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const hasDot = dots.some(([r, c]) => r === row && c === col);
        return (
          <div key={i} className="flex items-center justify-center">
            {hasDot && (
              <div className={`${dotS} rounded-full ${
                color === 'emerald' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                color === 'red' ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                'bg-white'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DiceGame() {
  const { user, refreshBalance } = useAuth();
  const [betAmount, setBetAmount] = useState('5');
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [cycleValue, setCycleValue] = useState(1);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await API.get('/games/dice/history');
      setHistory(data.games || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!rolling) return;
    const iv = setInterval(() => {
      setCycleValue(Math.floor(Math.random() * 6) + 1);
    }, 80);
    return () => clearInterval(iv);
  }, [rolling]);

  const playDice = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < 5) {
      toast.error('Minimum bet is 5 USDT');
      return;
    }
    if (bet > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setRolling(true);
    setResult(null);

    try {
      const { data } = await API.post('/games/dice/play', { bet_amount: bet });

      // Animate for 1.5s
      await new Promise(r => setTimeout(r, 1500));

      setResult(data);
      if (data.is_win) {
        toast.success(`You won ${data.win_amount.toFixed(2)} USDT!`);
      } else {
        toast.error(`You lost ${data.bet_amount.toFixed(2)} USDT`);
      }
      await refreshBalance();
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Game error');
    } finally {
      setRolling(false);
    }
  };

  const quickBets = [5, 10, 25, 50, 100];

  return (
    <div data-testid="dice-game-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight">Dice Game</h1>
            <p className="text-sm text-[#94a3b8] mt-1">Roll higher than the bot to win 2x</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-[#94a3b8] hover:text-white"
            onClick={() => setShowHistory(!showHistory)}
            data-testid="dice-history-toggle"
          >
            <History className="w-4 h-4 mr-1" /> History
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game area */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
              {/* Ambient glow based on result */}
              {result && (
                <div className={`absolute inset-0 ${
                  result.is_win ? 'bg-emerald-500/[0.03]' : 'bg-red-500/[0.03]'
                } pointer-events-none`} />
              )}

              <div className="relative">
                {/* Dice display */}
                <div className="flex items-center justify-center gap-8 sm:gap-16 py-8">
                  <div className="text-center">
                    <p className="text-xs text-[#94a3b8] mb-3 uppercase tracking-wider">You</p>
                    <div className={rolling ? 'dice-rolling' : ''} data-testid="player-dice">
                      <DiceFace
                        value={rolling ? cycleValue : (result?.player_dice || 1)}
                        color={result ? (result.is_win ? 'emerald' : 'red') : 'white'}
                      />
                    </div>
                    {result && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 font-mono text-2xl font-bold text-white"
                      >
                        {result.player_dice}
                      </motion.p>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="font-['Unbounded'] text-lg font-bold text-[#94a3b8]">VS</p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-[#94a3b8] mb-3 uppercase tracking-wider">Bot</p>
                    <div className={rolling ? 'dice-rolling' : ''} data-testid="bot-dice">
                      <DiceFace
                        value={rolling ? cycleValue : (result?.bot_dice || 1)}
                        color={result ? (result.is_win ? 'red' : 'emerald') : 'white'}
                      />
                    </div>
                    {result && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 font-mono text-2xl font-bold text-white"
                      >
                        {result.bot_dice}
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* Result banner */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className={`text-center py-4 rounded-xl mb-6 ${
                        result.is_win ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
                      }`}
                      data-testid="dice-result-banner"
                    >
                      <p className={`font-['Unbounded'] text-lg font-bold ${result.is_win ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.is_win ? (
                          <span className="flex items-center justify-center gap-2">
                            <Trophy className="w-5 h-5" /> You Won {result.win_amount.toFixed(2)} USDT!
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <X className="w-5 h-5" /> You Lost {result.bet_amount.toFixed(2)} USDT
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-[#94a3b8] mt-1 font-mono">
                        Balance: {result.new_balance.toFixed(2)} USDT
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bet controls */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2 block">Bet Amount (USDT)</label>
                    <Input
                      type="number"
                      min="5"
                      step="1"
                      value={betAmount}
                      onChange={e => setBetAmount(e.target.value)}
                      className="bg-[#0a0a0b] border-white/10 text-white font-mono text-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                      data-testid="dice-bet-input"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {quickBets.map(b => (
                      <button
                        key={b}
                        onClick={() => setBetAmount(String(b))}
                        className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
                          betAmount === String(b)
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/5 text-[#94a3b8] border border-white/5 hover:border-white/10'
                        }`}
                        data-testid={`dice-quick-bet-${b}`}
                      >
                        {b} USDT
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={playDice}
                    disabled={rolling}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-['Unbounded'] font-semibold text-sm uppercase tracking-wider rounded-xl py-6 btn-glow glow-emerald disabled:opacity-50"
                    data-testid="dice-roll-btn"
                  >
                    {rolling ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Rolling...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Dice5 className="w-5 h-5" /> Roll Dice
                      </span>
                    )}
                  </Button>

                  <p className="text-center text-xs text-[#555]">
                    Win chance: 48% | Payout: 2x | Min bet: 5 USDT | House edge: ~4%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* History sidebar */}
          <div className={`${showHistory ? 'block' : 'hidden lg:block'}`}>
            <div className="glass-card rounded-2xl p-6" data-testid="dice-history-panel">
              <h3 className="font-['Unbounded'] text-sm font-semibold text-white mb-4">Your History</h3>
              {history.length === 0 ? (
                <p className="text-sm text-[#94a3b8] text-center py-8">No games yet. Roll the dice!</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {history.map(g => (
                    <div key={g.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-white">{g.player_dice}</span>
                        <span className="text-[#555] text-xs">vs</span>
                        <span className="font-mono text-xs text-white">{g.bot_dice}</span>
                      </div>
                      <span className={`font-mono text-xs font-semibold ${g.is_win ? 'text-emerald-400' : 'text-red-400'}`}>
                        {g.is_win ? `+${(g.win_amount || 0).toFixed(0)}` : `-${(g.bet_amount || 0).toFixed(0)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
