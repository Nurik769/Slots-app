import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Users, Copy, Check, Gift, Link as LinkIcon } from 'lucide-react';

export default function Referrals() {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchReferrals = useCallback(async () => {
    try {
      const { data } = await API.get('/referrals');
      setReferralData(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const referralLink = `${window.location.origin}/auth?tab=register&ref=${user?.referral_code || ''}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(user?.referral_code || '');
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy'); }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch { toast.error('Failed to copy'); }
  };

  return (
    <div data-testid="referrals-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8">
          <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight">Referrals</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Invite friends and earn 1 USDT per referral</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referral Code */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-8" data-testid="referral-code-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-['Unbounded'] text-sm font-semibold text-white">Your Referral Code</h3>
                <p className="text-xs text-[#94a3b8]">Share this code with friends</p>
              </div>
            </div>

            {/* Code block */}
            <div className="bg-[#0a0a0b] border border-white/10 rounded-xl p-4 flex items-center justify-between mb-4">
              <code className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-[0.2em]" data-testid="referral-code">
                {user?.referral_code || '---'}
              </code>
              <Button
                variant="outline"
                className="border-white/10 shrink-0"
                onClick={copyCode}
                data-testid="copy-referral-code-btn"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#94a3b8]" />}
              </Button>
            </div>

            {/* Link block */}
            <div className="bg-[#0a0a0b] border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <LinkIcon className="w-4 h-4 text-[#94a3b8] shrink-0" />
              <code className="font-mono text-xs text-[#94a3b8] break-all flex-1" data-testid="referral-link">
                {referralLink}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 shrink-0"
                onClick={copyLink}
                data-testid="copy-referral-link-btn"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#94a3b8]" />}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6" data-testid="referral-stats-referred">
              <p className="text-xs text-[#94a3b8] uppercase tracking-wider">Total Referred</p>
              <p className="font-mono text-3xl font-bold text-white mt-2">
                {loading ? '...' : (referralData?.total_referred || 0)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6" data-testid="referral-stats-earned">
              <p className="text-xs text-[#94a3b8] uppercase tracking-wider">Total Earned</p>
              <p className="font-mono text-3xl font-bold text-emerald-400 mt-2">
                {loading ? '...' : `${(referralData?.total_bonus || 0).toFixed(2)} USDT`}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <p className="text-xs text-[#94a3b8] uppercase tracking-wider">Bonus Per Referral</p>
              <p className="font-mono text-3xl font-bold text-amber-400 mt-2">+1 USDT</p>
            </div>
          </div>
        </div>

        {/* Referred Users */}
        <div className="mt-6 glass-card rounded-2xl p-6" data-testid="referred-users-list">
          <h3 className="font-['Unbounded'] text-sm font-semibold text-white mb-4">Referred Users</h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 skeleton-shimmer rounded-lg" />)}
            </div>
          ) : !referralData?.referred_users?.length ? (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-[#555] mx-auto mb-3" />
              <p className="text-sm text-[#94a3b8]">No referrals yet. Share your code!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referralData.referred_users.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-400">{u.username?.[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-white">{u.username}</span>
                  </div>
                  <span className="text-xs text-[#94a3b8]">{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
