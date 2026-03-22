import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Flame, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

const SYMBOLS = {
  diamond: { label: 'Diamond', icon: '◆', color: 'text-cyan-300', bg: 'bg-cyan-500/20' },
  seven: { label: '7', icon: '7', color: 'text-red-400', bg: 'bg-red-500/20' },
  star: { label: 'Star', icon: '★', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  bell: { label: 'Bell', icon: '♪', color: 'text-yellow-300', bg: 'bg-yellow-500/20' },
  cherry: { label: 'Cherry', icon: '●', color: 'text-red-500', bg: 'bg-red-500/20' },
  lemon: { label: 'Lemon', icon: '◉', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  orange: { label: 'Orange', icon: '◎', color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

const ALL_SYMBOLS = Object.keys(SYMBOLS);

function SlotReel({ symbol, spinning, delay = 0 }) {
  const [displaySymbol, setDisplaySymbol] = useState(symbol || 'cherry');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (spinning) {
      intervalRef.current = setInterval(() => {
        setDisplaySymbol(ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]);
      }, 60);
      return () => clearInterval(intervalRef.current);
    } else {
      clearInterval(intervalRef.current);
      if (symbol) {
        const timer = setTimeout(() => setDisplaySymbol(symbol), delay);
        return () => clearTimeout(timer);
      }
    }
  }, [spinning, symbol, delay]);

  const s = SYMBOLS[displaySymbol] || SYMBOLS.cherry;

  return (
    <motion.div
      animate={spinning ? { y: [0, -8, 0] } : {}}
      transition={spinning ? { duration: 0.15, repeat: Infinity } : {}}
      className={`w-24 h-28 sm:w-28 sm:h-32 rounded-2xl ${s.bg} border border-white/10 flex flex-col items-center justify-center gap-1 transition-all duration-200`}
    >
      <span className={`text-4xl sm:text-5xl font-bold ${s.color}`}>{s.icon}</span>
      <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{s.label}</span>
    </motion.div>
  );
}

function StreakBadge({ streak, multiplier }) {
  if (streak < 2) return null;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30"
      data-testid="streak-badge"
    >
      <Flame className="w-4 h-4 text-amber-400" />
      <span className="font-mono text-sm font-bold text-amber-400">{streak}x Streak</span>
      <span className="text-xs text-amber-300">({multiplier}x)</span>
    </motion.div>
  );
}

export default function SlotsGame() {
  const { user, refreshBalance } = useAuth();
  const [betAmount, setBetAmount] = useState('5');
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(['cherry', 'star', 'bell']);
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);
  const [streakMult, setStreakMult] = useState(1.0);

  const fireBigWin = useCallback(() => {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#10b981', '#06b6d4', '#f59e0b'] });
    setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 } }), 300);
  }, []);

  const playSpin = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < 5) { toast.error('Minimum bet is 5 USDT'); return; }
    if (bet > (user?.balance || 0)) { toast.error('Insufficient balance'); return; }

    setSpinning(true);
    setResult(null);

    try {
      const { data } = await API.post('/games/slots/play', { bet_amount: bet });

      // Spin for 1.5s minimum
      await new Promise(r => setTimeout(r, 1500));
      setReels(data.reels);
      setSpinning(false);

      // Wait for reel stop animation
      await new Promise(r => setTimeout(r, 600));

      setResult(data);
      setStreak(data.win_streak || 0);
      setStreakMult(data.streak_multiplier || 1.0);

      if (data.is_jackpot) {
        fireBigWin();
        toast.success(`JACKPOT! ${data.win_amount.toFixed(2)} USDT!`);
      } else if (data.is_big_win) {
        fireBigWin();
        toast.success(`BIG WIN! ${data.win_amount.toFixed(2)} USDT!`);
      } else if (data.is_win) {
        toast.success(`Won ${data.win_amount.toFixed(2)} USDT!`);
      } else {
        toast.error(`Lost ${data.bet_amount.toFixed(2)} USDT`);
      }
      refreshBalance();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Game error');
      setSpinning(false);
    }
  };

  return (
    <div data-testid="slots-game-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight">Slots</h1>
            <p className="text-sm text-[#94a3b8] mt-1">Spin to win up to 50x | RTP ~95%</p>
          </div>
          <StreakBadge streak={streak} multiplier={streakMult} />
        </div>

        <div className="max-w-xl mx-auto">
          <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
            {result?.is_big_win && (
              <div className="absolute inset-0 bg-amber-500/[0.05] pointer-events-none" />
            )}

            <div className="relative">
              {/* Reels */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 py-8" data-testid="slot-reels">
                {[0, 1, 2].map(i => (
                  <SlotReel
                    key={i}
                    symbol={spinning ? null : reels[i]}
                    spinning={spinning}
                    delay={i * 200}
                  />
                ))}
              </div>

              {/* Result banner */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={`text-center py-4 rounded-xl mb-6 ${
                      result.is_jackpot ? 'bg-amber-500/15 border border-amber-500/30 glow-amber' :
                      result.is_big_win ? 'bg-cyan-500/10 border border-cyan-500/20 glow-cyan' :
                      result.is_win ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      'bg-red-500/10 border border-red-500/20'
                    }`}
                    data-testid="slots-result-banner"
                  >
                    {result.is_jackpot ? (
                      <p className="font-['Unbounded'] text-xl font-bold text-amber-400">
                        JACKPOT! +{result.win_amount.toFixed(2)} USDT
                      </p>
                    ) : result.is_win ? (
                      <p className={`font-['Unbounded'] text-lg font-bold ${result.is_big_win ? 'text-cyan-400' : 'text-emerald-400'}`}>
                        {result.is_big_win ? 'BIG WIN' : 'WIN'} +{result.win_amount.toFixed(2)} USDT
                        {result.streak_multiplier > 1 && (
                          <span className="text-amber-400 text-sm ml-2">({result.streak_multiplier}x streak)</span>
                        )}
                      </p>
                    ) : (
                      <p className="font-['Unbounded'] text-lg font-bold text-red-400">No luck</p>
                    )}
                    <p className="text-xs text-[#94a3b8] font-mono mt-1">Balance: {result.new_balance.toFixed(2)} USDT</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2 block">Bet Amount (USDT)</label>
                  <Input
                    type="number" min="5" value={betAmount}
                    onChange={e => setBetAmount(e.target.value)}
                    className="bg-[#0a0a0b] border-white/10 text-white font-mono text-lg focus:border-emerald-500"
                    data-testid="slots-bet-input"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 25, 50, 100].map(b => (
                    <button key={b} onClick={() => setBetAmount(String(b))}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
                        betAmount === String(b) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-[#94a3b8] border border-white/5'
                      }`} data-testid={`slots-quick-bet-${b}`}>{b}</button>
                  ))}
                </div>
                <Button onClick={playSpin} disabled={spinning}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-['Unbounded'] font-semibold text-sm uppercase tracking-wider rounded-xl py-6"
                  data-testid="slots-spin-btn"
                >
                  {spinning ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Spinning...</> : <><Zap className="w-5 h-5 mr-2" /> Spin</>}
                </Button>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white/[0.02] rounded-lg p-2">
                    <p className="text-[10px] text-[#94a3b8]">3x ◆</p>
                    <p className="text-xs font-mono font-bold text-cyan-400">50x</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2">
                    <p className="text-[10px] text-[#94a3b8]">3x 7</p>
                    <p className="text-xs font-mono font-bold text-red-400">10x</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2">
                    <p className="text-[10px] text-[#94a3b8]">3x ★</p>
                    <p className="text-xs font-mono font-bold text-amber-400">5x</p>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2">
                    <p className="text-[10px] text-[#94a3b8]">3x ●</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">2x</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
