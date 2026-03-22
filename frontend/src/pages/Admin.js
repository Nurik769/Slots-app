import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, ArrowUpDown, CircleDollarSign, TrendingUp, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, uRes, tRes, wRes, dRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/admin/transactions'),
        API.get('/admin/withdrawals'),
        API.get('/admin/deposits'),
      ]);
      setStats(sRes.data);
      setUsers(uRes.data.users || []);
      setTransactions(tRes.data.transactions?.slice(0, 100) || []);
      setWithdrawals(wRes.data.withdrawals || []);
      setDeposits(dRes.data.deposits || []);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleWithdrawal = async (id, action) => {
    setActionLoading(id);
    try {
      await API.post(`/admin/withdrawals/${id}/${action}`);
      toast.success(`Withdrawal ${action}d`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeposit = async (id) => {
    setActionLoading(id);
    try {
      await API.post(`/admin/deposits/${id}/confirm`);
      toast.success('Deposit confirmed');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to confirm');
    } finally {
      setActionLoading(null);
    }
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'emerald' },
    { label: 'Total Deposits', value: `${stats.total_deposits.toFixed(2)} USDT`, icon: CircleDollarSign, color: 'cyan' },
    { label: 'Total Bets', value: `${stats.total_bets.toFixed(2)} USDT`, icon: ArrowUpDown, color: 'amber' },
    { label: 'Platform Profit', value: `${stats.profit.toFixed(2)} USDT`, icon: TrendingUp, color: stats.profit >= 0 ? 'emerald' : 'red' },
    { label: 'Total Games', value: stats.total_games, icon: ArrowUpDown, color: 'cyan' },
    { label: 'Pending Withdrawals', value: stats.pending_withdrawals, icon: AlertTriangle, color: stats.pending_withdrawals > 0 ? 'amber' : 'emerald' },
  ] : [];

  const colorClasses = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400' },
  };

  return (
    <div data-testid="admin-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight">Admin Panel</h1>
            <p className="text-sm text-[#94a3b8] mt-1">Platform management & statistics</p>
          </div>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8" data-testid="admin-stats">
            {statCards.map(s => {
              const c = colorClasses[s.color];
              return (
                <div key={s.label} className="glass-card rounded-xl p-4">
                  <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
                    <s.icon className={`w-4 h-4 ${c.text}`} />
                  </div>
                  <p className="font-mono text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="withdrawals" className="glass-card rounded-2xl p-6">
          <TabsList className="bg-white/5 border border-white/5 flex-wrap h-auto" data-testid="admin-tabs">
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="admin-tab-withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="deposits" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="admin-tab-deposits">Deposits</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="admin-tab-users">Users</TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-white/10 data-[state=active]:text-white" data-testid="admin-tab-transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* Withdrawals */}
          <TabsContent value="withdrawals">
            <div className="mt-4">
              {loading ? <p className="text-[#94a3b8] text-center py-8">Loading...</p> : withdrawals.length === 0 ? (
                <p className="text-[#94a3b8] text-center py-8 text-sm">No withdrawals</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[#94a3b8]">User</TableHead>
                        <TableHead className="text-[#94a3b8]">Amount</TableHead>
                        <TableHead className="text-[#94a3b8]">Address</TableHead>
                        <TableHead className="text-[#94a3b8]">Status</TableHead>
                        <TableHead className="text-[#94a3b8]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map(w => (
                        <TableRow key={w.id} className="border-white/5" data-testid={`withdrawal-row-${w.id}`}>
                          <TableCell className="text-white text-sm">{w.username}</TableCell>
                          <TableCell className="font-mono text-sm text-white">{w.amount} USDT</TableCell>
                          <TableCell className="font-mono text-xs text-[#94a3b8] max-w-[200px] truncate">{w.address}</TableCell>
                          <TableCell>
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-mono ${
                              w.status === 'approved' ? 'status-confirmed' : w.status === 'rejected' ? 'status-rejected' : 'status-pending'
                            }`}>{w.status}</span>
                          </TableCell>
                          <TableCell>
                            {w.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 h-7 text-xs"
                                  onClick={() => handleWithdrawal(w.id, 'approve')}
                                  disabled={actionLoading === w.id}
                                  data-testid={`approve-withdrawal-${w.id}`}
                                >
                                  {actionLoading === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Approve</>}
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 h-7 text-xs"
                                  onClick={() => handleWithdrawal(w.id, 'reject')}
                                  disabled={actionLoading === w.id}
                                  data-testid={`reject-withdrawal-${w.id}`}
                                >
                                  <XCircle className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Deposits */}
          <TabsContent value="deposits">
            <div className="mt-4">
              {loading ? <p className="text-[#94a3b8] text-center py-8">Loading...</p> : deposits.length === 0 ? (
                <p className="text-[#94a3b8] text-center py-8 text-sm">No deposits</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[#94a3b8]">User</TableHead>
                        <TableHead className="text-[#94a3b8]">Amount</TableHead>
                        <TableHead className="text-[#94a3b8]">TX Hash</TableHead>
                        <TableHead className="text-[#94a3b8]">Status</TableHead>
                        <TableHead className="text-[#94a3b8]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map(d => (
                        <TableRow key={d.id} className="border-white/5" data-testid={`deposit-row-${d.id}`}>
                          <TableCell className="text-white text-sm">{d.username}</TableCell>
                          <TableCell className="font-mono text-sm text-white">{d.amount} USDT</TableCell>
                          <TableCell className="font-mono text-xs text-[#94a3b8] max-w-[200px] truncate">{d.tx_hash || '-'}</TableCell>
                          <TableCell>
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-mono ${
                              d.status === 'confirmed' ? 'status-confirmed' : 'status-pending'
                            }`}>{d.status}</span>
                          </TableCell>
                          <TableCell>
                            {d.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 h-7 text-xs"
                                onClick={() => handleDeposit(d.id)}
                                disabled={actionLoading === d.id}
                                data-testid={`confirm-deposit-${d.id}`}
                              >
                                {actionLoading === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Confirm</>}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <div className="mt-4">
              {loading ? <p className="text-[#94a3b8] text-center py-8">Loading...</p> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[#94a3b8]">Username</TableHead>
                        <TableHead className="text-[#94a3b8]">Email</TableHead>
                        <TableHead className="text-[#94a3b8]">Balance</TableHead>
                        <TableHead className="text-[#94a3b8]">Role</TableHead>
                        <TableHead className="text-[#94a3b8]">Flagged</TableHead>
                        <TableHead className="text-[#94a3b8]">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(u => (
                        <TableRow key={u.id} className="border-white/5" data-testid={`user-row-${u.id}`}>
                          <TableCell className="text-white text-sm font-medium">{u.username}</TableCell>
                          <TableCell className="text-[#94a3b8] text-sm">{u.email}</TableCell>
                          <TableCell className="font-mono text-sm text-emerald-400">{(u.balance || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                              u.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-[#94a3b8] border border-white/10'
                            }`}>{u.role}</span>
                          </TableCell>
                          <TableCell>
                            {u.flagged && <AlertTriangle className="w-4 h-4 text-red-400" />}
                          </TableCell>
                          <TableCell className="text-xs text-[#94a3b8]">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Transactions */}
          <TabsContent value="transactions">
            <div className="mt-4">
              {loading ? <p className="text-[#94a3b8] text-center py-8">Loading...</p> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="text-[#94a3b8]">Type</TableHead>
                        <TableHead className="text-[#94a3b8]">Amount</TableHead>
                        <TableHead className="text-[#94a3b8]">Status</TableHead>
                        <TableHead className="text-[#94a3b8]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(tx => (
                        <TableRow key={tx.id} className="border-white/5">
                          <TableCell className="text-white text-sm capitalize">{tx.type.replace('_', ' ')}</TableCell>
                          <TableCell className={`font-mono text-sm ${
                            ['win', 'deposit', 'referral_bonus'].includes(tx.type) ? 'text-emerald-400' : 'text-red-400'
                          }`}>{tx.amount.toFixed(2)} USDT</TableCell>
                          <TableCell>
                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-mono ${
                              tx.status === 'completed' || tx.status === 'confirmed' || tx.status === 'approved' ? 'status-confirmed' :
                              tx.status === 'rejected' ? 'status-rejected' : 'status-pending'
                            }`}>{tx.status}</span>
                          </TableCell>
                          <TableCell className="text-xs text-[#94a3b8]">{new Date(tx.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
