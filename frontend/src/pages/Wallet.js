import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Copy, Loader2, Check } from 'lucide-react';

const DEPOSIT_ADDRESS = 'TTHqZYyEvMSCH1LsPGCQkpdcncp3iiGC4F';

export default function Wallet() {
  const { user, refreshBalance } = useAuth();
  const [depositAmount, setDepositAmount] = useState('');
  const [depositTxHash, setDepositTxHash] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const { data } = await API.get('/wallet/transactions');
      setTransactions(data.transactions || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshBalance();
    fetchTransactions().finally(() => setLoading(false));
  }, [refreshBalance, fetchTransactions]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(DEPOSIT_ADDRESS);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }

    setSubmitting(true);
    try {
      await API.post('/wallet/deposit', { amount, tx_hash: depositTxHash || undefined });
      toast.success('Deposit request created! Awaiting confirmation.');
      setDepositAmount('');
      setDepositTxHash('');
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!withdrawAddress.trim()) { toast.error('Enter withdraw address'); return; }

    setSubmitting(true);
    try {
      await API.post('/wallet/withdraw', { amount, address: withdrawAddress });
      toast.success('Withdrawal request submitted!');
      setWithdrawAmount('');
      setWithdrawAddress('');
      refreshBalance();
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const statusClass = (status) => {
    if (status === 'confirmed' || status === 'approved' || status === 'completed') return 'status-confirmed';
    if (status === 'pending') return 'status-pending';
    if (status === 'rejected') return 'status-rejected';
    return 'status-pending';
  };

  return (
    <div data-testid="wallet-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8">
          <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight">Wallet</h1>
          <p className="text-sm text-[#94a3b8] mt-1">Manage your USDT funds</p>
        </div>

        {/* Balance */}
        <div className="glass-card rounded-2xl p-6 mb-6 relative overflow-hidden" data-testid="wallet-balance-card">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-emerald-500/5 blur-[60px] pointer-events-none" />
          <p className="text-sm text-[#94a3b8]">Available Balance</p>
          <p className="font-mono text-3xl sm:text-4xl font-bold text-white mt-2" data-testid="wallet-balance">
            {(user?.balance || 0).toFixed(2)} <span className="text-lg text-[#94a3b8]">USDT</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deposit & Withdraw */}
          <div className="glass-card rounded-2xl p-6">
            <Tabs defaultValue="deposit">
              <TabsList className="w-full bg-white/5 border border-white/5" data-testid="wallet-tabs">
                <TabsTrigger value="deposit" className="w-full data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="wallet-tab-deposit">
                  <ArrowDownRight className="w-4 h-4 mr-1" /> Deposit
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="w-full data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="wallet-tab-withdraw">
                  <ArrowUpRight className="w-4 h-4 mr-1" /> Withdraw
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deposit">
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2 block">Deposit Address (USDT TRC-20)</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-[#0a0a0b] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-emerald-400 font-mono break-all" data-testid="deposit-address">
                        {DEPOSIT_ADDRESS}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 shrink-0"
                        onClick={copyAddress}
                        data-testid="copy-address-btn"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#94a3b8]" />}
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleDeposit} className="space-y-3">
                    <div>
                      <label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Amount (USDT)</label>
                      <Input
                        type="number"
                        min="1"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        className="bg-[#0a0a0b] border-white/10 text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                        placeholder="Enter amount"
                        data-testid="deposit-amount-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Transaction Hash (optional)</label>
                      <Input
                        type="text"
                        value={depositTxHash}
                        onChange={e => setDepositTxHash(e.target.value)}
                        className="bg-[#0a0a0b] border-white/10 text-white font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                        placeholder="TRC-20 tx hash"
                        data-testid="deposit-txhash-input"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-5"
                      data-testid="deposit-submit-btn"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Deposit'}
                    </Button>
                  </form>
                  <p className="text-xs text-[#555] text-center">Deposits are confirmed by admin after blockchain verification.</p>
                </div>
              </TabsContent>

              <TabsContent value="withdraw">
                <form onSubmit={handleWithdraw} className="mt-4 space-y-4">
                  <div>
                    <label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Amount (USDT)</label>
                    <Input
                      type="number"
                      min="1"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className="bg-[#0a0a0b] border-white/10 text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                      placeholder="Enter amount"
                      data-testid="withdraw-amount-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1.5 block">TRC-20 Address</label>
                    <Input
                      type="text"
                      value={withdrawAddress}
                      onChange={e => setWithdrawAddress(e.target.value)}
                      className="bg-[#0a0a0b] border-white/10 text-white font-mono text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                      placeholder="Your USDT TRC-20 address"
                      data-testid="withdraw-address-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-5"
                    data-testid="withdraw-submit-btn"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Withdrawal'}
                  </Button>
                  <p className="text-xs text-[#555] text-center">Withdrawals require admin approval.</p>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {/* Transactions */}
          <div className="glass-card rounded-2xl p-6" data-testid="transaction-history">
            <h3 className="font-['Unbounded'] text-sm font-semibold text-white mb-4">Transaction History</h3>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-14 skeleton-shimmer rounded-lg" />)}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-[#94a3b8] text-center py-12">No transactions yet</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        ['win', 'deposit', 'referral_bonus'].includes(tx.type) ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      }`}>
                        {['win', 'deposit', 'referral_bonus'].includes(tx.type)
                          ? <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                          : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm text-white capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-xs text-[#555]">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono text-sm font-semibold ${
                        ['win', 'deposit', 'referral_bonus'].includes(tx.type) ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {['win', 'deposit', 'referral_bonus'].includes(tx.type) ? '+' : '-'}{tx.amount.toFixed(2)}
                      </span>
                      <div className="mt-0.5">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-mono ${statusClass(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
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
