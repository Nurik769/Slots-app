import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dice5, Swords, Wallet, Shield, Zap, TrendingUp, Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const fakeNames = ['CryptoKing', 'LuckyAce', 'DiamondHands', 'MoonShot', 'WhaleHunter', 'SatoshiFan'];
const fakeAmounts = [10, 25, 50, 75, 100, 150, 200];

function generateFeed() {
  return {
    name: fakeNames[Math.floor(Math.random() * fakeNames.length)],
    amount: fakeAmounts[Math.floor(Math.random() * fakeAmounts.length)],
    game: Math.random() > 0.5 ? 'Dice' : 'PVP Cards',
    id: Math.random().toString(36).substr(2, 9),
  };
}

const features = [
  { icon: Dice5, title: 'Dice Game', desc: 'Roll against the bot. 10x payout on wins.', color: 'emerald' },
  { icon: Swords, title: 'PVP Cards', desc: 'Challenge other players. Higher card wins the pot.', color: 'cyan' },
  { icon: Wallet, title: 'USDT Wallet', desc: 'Deposit & withdraw USDT TRC-20 instantly.', color: 'amber' },
  { icon: Shield, title: 'Provably Fair', desc: 'Server-authoritative outcomes. Anti-cheat protected.', color: 'emerald' },
  { icon: Zap, title: 'Instant Games', desc: 'No waiting. Results in seconds.', color: 'cyan' },
  { icon: TrendingUp, title: 'Referral Bonus', desc: 'Earn 1 USDT for every friend you refer.', color: 'amber' },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

export default function Landing() {
  const [feed, setFeed] = useState(() => Array.from({ length: 6 }, generateFeed));

  useEffect(() => {
    const iv = setInterval(() => {
      setFeed(prev => {
        const next = [...prev];
        next.pop();
        next.unshift(generateFeed());
        return next;
      });
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] noise-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          {/* Navbar */}
          <nav className="flex items-center justify-between py-6" data-testid="landing-nav">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center glow-emerald">
                <Dice5 className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="font-['Unbounded'] font-bold text-white text-xl tracking-tight">CryptoPlay</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="text-[#94a3b8] hover:text-white" data-testid="landing-login-btn">
                  Log In
                </Button>
              </Link>
              <Link to="/auth?tab=register">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl btn-glow" data-testid="landing-register-btn">
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>

          {/* Hero content */}
          <div className="mt-20 lg:mt-32 text-left max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Live Platform</span>
              </div>

              <h1 className="font-['Unbounded'] text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight" data-testid="hero-title">
                Play & Earn
                <br />
                <span className="text-emerald-400">USDT</span> Crypto
              </h1>

              <p className="mt-6 text-base sm:text-lg text-[#94a3b8] max-w-xl leading-relaxed">
                The ultimate crypto gaming platform. Dice games, PVP card battles, and instant USDT payouts. Fair, fast, and secure.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/auth?tab=register">
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-['Unbounded'] font-semibold text-sm uppercase tracking-wider rounded-full px-8 py-6 btn-glow glow-emerald"
                    data-testid="hero-cta-play"
                  >
                    Start Playing <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/5 rounded-full px-8 py-6"
                    data-testid="hero-cta-login"
                  >
                    I Have an Account
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-16 flex gap-8 sm:gap-16">
                {[
                  { label: 'Min Bet', value: '5 USDT' },
                  { label: 'Win Up To', value: '2x' },
                  { label: 'Referral Bonus', value: '+1 USDT' },
                ].map(stat => (
                  <div key={stat.label}>
                    <p className="font-mono text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-[#94a3b8] mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live feed */}
      <section className="border-y border-white/5 bg-[#0a0a0b]/80">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-6 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live Wins</span>
          </div>
          {feed.map(f => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 shrink-0"
            >
              <Trophy className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-white font-medium">{f.name}</span>
              <span className="text-xs font-mono font-bold text-emerald-400">+{f.amount} USDT</span>
              <span className="text-xs text-[#555]">{f.game}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-['Unbounded'] text-base sm:text-lg font-semibold text-white">Why CryptoPlay?</h2>
            <p className="mt-2 text-sm text-[#94a3b8] max-w-md">Built for crypto players who demand fairness, speed, and real payouts.</p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const c = colorMap[f.color];
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-6 group cursor-default"
                >
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>
                    <f.icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <h3 className="font-['Unbounded'] text-sm font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="font-['Unbounded'] text-base sm:text-lg font-semibold text-white">Ready to Play?</h2>
          <p className="mt-3 text-sm text-[#94a3b8]">Create your account in seconds and start earning USDT.</p>
          <Link to="/auth?tab=register">
            <Button
              size="lg"
              className="mt-8 bg-emerald-500 hover:bg-emerald-600 text-white font-['Unbounded'] font-semibold text-sm uppercase rounded-full px-10 py-6 btn-glow glow-emerald"
              data-testid="cta-bottom-register"
            >
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4" data-testid="landing-footer">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Dice5 className="w-4 h-4 text-emerald-400" />
              <span className="font-['Unbounded'] text-sm text-white">CryptoPlay</span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Support: <a href="mailto:dailyessentials532@gmail.com" className="text-emerald-400 hover:underline">dailyessentials532@gmail.com</a>
            </p>
            <p className="text-xs text-[#94a3b8]">&copy; 2026 CryptoPlay. All rights reserved.</p>
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-[10px] text-[#555] text-center leading-relaxed max-w-2xl mx-auto">
              This platform is for entertainment purposes only. Cryptocurrency gambling may be restricted in your jurisdiction.
              Please gamble responsibly and never bet more than you can afford to lose. Users must be 18+ to participate.
              This service does not hold a gambling license. Use at your own risk.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
