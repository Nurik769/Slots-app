import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Dice5, Swords, WalletCards, Users, LayoutDashboard, ShieldCheck, LogOut, Menu, X, Trophy } from 'lucide-react';
import { useState } from 'react';
import LiveActivity from '@/components/LiveActivity';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/games/dice', label: 'Dice', icon: Dice5 },
  { path: '/games/pvp', label: 'PVP Cards', icon: Swords },
  { path: '/wallet', label: 'Wallet', icon: WalletCards },
  { path: '/leaderboard', label: 'Leaders', icon: Trophy },
  { path: '/referrals', label: 'Referrals', icon: Users },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Top navbar */}
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50" data-testid="main-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2" data-testid="nav-logo">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Dice5 className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-['Unbounded'] font-bold text-white text-lg tracking-tight">CryptoPlay</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-white/10 text-emerald-400'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  data-testid="nav-admin"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/admin'
                      ? 'bg-white/10 text-amber-400'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </div>

            {/* Balance + user */}
            <div className="hidden md:flex items-center gap-4">
              <div className="glass-card px-4 py-2 rounded-xl" data-testid="nav-balance">
                <span className="text-xs text-[#94a3b8]">Balance</span>
                <p className="font-mono text-sm font-semibold text-emerald-400">
                  {(user?.balance || 0).toFixed(2)} USDT
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{user?.username}</span>
                <button
                  onClick={handleLogout}
                  data-testid="nav-logout"
                  className="p-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-white"
              data-testid="mobile-menu-toggle"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#050505]/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-1">
              <div className="glass-card px-4 py-3 rounded-xl mb-3" data-testid="mobile-balance">
                <span className="text-xs text-[#94a3b8]">Balance</span>
                <p className="font-mono text-lg font-bold text-emerald-400">
                  {(user?.balance || 0).toFixed(2)} USDT
                </p>
              </div>
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-white/10 text-emerald-400'
                      : 'text-[#94a3b8]'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-[#94a3b8]">
                  <ShieldCheck className="w-4 h-4" /> Admin
                </Link>
              )}
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400 w-full">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Live activity bar */}
      <div className="fixed top-16 left-0 right-0 z-40">
        <LiveActivity />
      </div>

      {/* Main content */}
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4" data-testid="app-footer">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Dice5 className="w-4 h-4 text-emerald-400" />
              <span className="font-['Unbounded'] text-sm text-white">CryptoPlay</span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Support: <a href="mailto:dailyessentials532@gmail.com" className="text-emerald-400 hover:underline" data-testid="footer-email">dailyessentials532@gmail.com</a>
            </p>
            <p className="text-xs text-[#94a3b8]">&copy; 2026 CryptoPlay. All rights reserved.</p>
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-[10px] text-[#555] text-center leading-relaxed max-w-2xl mx-auto" data-testid="footer-disclaimer">
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
