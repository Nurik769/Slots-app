import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dice5, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const { login, register } = useAuth();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ email: '', username: '', password: '', referral_code: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(regForm.email, regForm.username, regForm.password, regForm.referral_code);
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative noise-bg">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back */}
        <Link to="/" className="flex items-center gap-2 text-[#94a3b8] hover:text-white text-sm mb-8 transition-colors" data-testid="auth-back-link">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Dice5 className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="font-['Unbounded'] font-bold text-white text-xl">CryptoPlay</span>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full bg-white/5 border border-white/5" data-testid="auth-tabs">
              <TabsTrigger value="login" className="w-full data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="auth-tab-login">
                Log In
              </TabsTrigger>
              <TabsTrigger value="register" className="w-full data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="auth-tab-register">
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-[#94a3b8] text-sm">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                    className="mt-1.5 bg-[#0a0a0b] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="you@example.com"
                    data-testid="login-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="login-password" className="text-[#94a3b8] text-sm">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                    className="mt-1.5 bg-[#0a0a0b] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="Your password"
                    data-testid="login-password-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-5 btn-glow"
                  data-testid="login-submit-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log In'}
                </Button>
              </form>
            </TabsContent>

            {/* Register */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="reg-email" className="text-[#94a3b8] text-sm">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    value={regForm.email}
                    onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))}
                    className="mt-1.5 bg-[#0a0a0b] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="you@example.com"
                    data-testid="register-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-username" className="text-[#94a3b8] text-sm">Username</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    required
                    value={regForm.username}
                    onChange={e => setRegForm(p => ({ ...p, username: e.target.value }))}
                    className="mt-1.5 bg-[#0a0a0b] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="CryptoPlayer"
                    data-testid="register-username-input"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-password" className="text-[#94a3b8] text-sm">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    value={regForm.password}
                    onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
                    className="mt-1.5 bg-[#0a0a0b] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="Min 6 characters"
                    data-testid="register-password-input"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-referral" className="text-[#94a3b8] text-sm">Referral Code (optional)</Label>
                  <Input
                    id="reg-referral"
                    type="text"
                    value={regForm.referral_code}
                    onChange={e => setRegForm(p => ({ ...p, referral_code: e.target.value }))}
                    className="mt-1.5 bg-[#0a0a0b] border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="Enter referral code"
                    data-testid="register-referral-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-5 btn-glow"
                  data-testid="register-submit-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
