import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Plus, Loader2, Trophy, Crown, RefreshCw } from 'lucide-react';

const suitSymbols = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const suitColors = { hearts: 'text-red-400', diamonds: 'text-red-400', clubs: 'text-white', spades: 'text-white' };

function PlayingCard({ card, revealed = true }) {
  if (!card || !revealed) {
    return (
      <div className="w-20 h-28 rounded-xl bg-gradient-to-br from-emerald-600/30 to-cyan-600/30 border border-white/10 flex items-center justify-center">
        <span className="text-2xl text-white/30">?</span>
      </div>
    );
  }

  return (
    <div className="w-20 h-28 rounded-xl bg-[#0a0a0b] border border-white/10 flex flex-col items-center justify-center gap-1 relative overflow-hidden">
      <span className={`font-mono text-xl font-bold ${suitColors[card.suit]}`}>{card.name}</span>
      <span className={`text-2xl ${suitColors[card.suit]}`}>{suitSymbols[card.suit]}</span>
    </div>
  );
}

export default function PvpCards() {
  const { user, refreshBalance } = useAuth();
  const [lobbies, setLobbies] = useState([]);
  const [betAmount, setBetAmount] = useState('10');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [myGames, setMyGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLobbies = useCallback(async () => {
    try {
      const { data } = await API.get('/games/pvp/lobbies');
      setLobbies(data.lobbies || []);
    } catch { /* ignore */ }
  }, []);

  const fetchMyGames = useCallback(async () => {
    try {
      const { data } = await API.get('/games/pvp/history');
      setMyGames(data.games?.slice(0, 10) || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchLobbies(), fetchMyGames()]).finally(() => setLoading(false));
    const iv = setInterval(fetchLobbies, 5000);
    return () => clearInterval(iv);
  }, [fetchLobbies, fetchMyGames]);

  const createLobby = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < 5) { toast.error('Minimum bet is 5 USDT'); return; }
    if (bet > (user?.balance || 0)) { toast.error('Insufficient balance'); return; }

    setCreating(true);
    try {
      await API.post('/games/pvp/create', { bet_amount: bet });
      toast.success('Lobby created! Waiting for opponent...');
      fetchLobbies();
      refreshBalance();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create lobby');
    } finally {
      setCreating(false);
    }
  };

  const joinLobby = async (lobbyId) => {
    setJoining(lobbyId);
    try {
      const { data } = await API.post(`/games/pvp/join/${lobbyId}`);
      setGameResult(data);
      setShowResult(true);
      toast.success(data.winner_id === user?.id ? 'You won!' : 'You lost!');
      fetchLobbies();
      fetchMyGames();
      refreshBalance();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join');
    } finally {
      setJoining(null);
    }
  };

  const cancelLobby = async (lobbyId) => {
    try {
      await API.post(`/games/pvp/cancel/${lobbyId}`);
      toast.success('Lobby cancelled');
      fetchLobbies();
      refreshBalance();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    }
  };

  return (
    <div data-testid="pvp-cards-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight">PVP Cards</h1>
            <p className="text-sm text-[#94a3b8] mt-1">Challenge players. Higher card wins the pot.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLobbies} className="border-white/10 text-[#94a3b8]" data-testid="pvp-refresh-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create lobby */}
          <div className="glass-card rounded-2xl p-6" data-testid="pvp-create-panel">
            <h3 className="font-['Unbounded'] text-sm font-semibold text-white mb-4">Create Lobby</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2 block">Bet Amount (USDT)</label>
                <Input
                  type="number"
                  min="5"
                  value={betAmount}
                  onChange={e => setBetAmount(e.target.value)}
                  className="bg-[#0a0a0b] border-white/10 text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                  data-testid="pvp-bet-input"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 25, 50].map(b => (
                  <button
                    key={b}
                    onClick={() => setBetAmount(String(b))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                      betAmount === String(b) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-[#94a3b8] border border-white/5'
                    }`}
                    data-testid={`pvp-quick-bet-${b}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <Button
                onClick={createLobby}
                disabled={creating}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl py-5"
                data-testid="pvp-create-btn"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Create Lobby</>}
              </Button>
            </div>
          </div>

          {/* Lobbies */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6" data-testid="pvp-lobbies-panel">
            <h3 className="font-['Unbounded'] text-sm font-semibold text-white mb-4">Open Lobbies</h3>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 skeleton-shimmer rounded-lg" />)}
              </div>
            ) : lobbies.length === 0 ? (
              <div className="text-center py-12">
                <Swords className="w-8 h-8 text-[#555] mx-auto mb-3" />
                <p className="text-sm text-[#94a3b8]">No open lobbies. Create one!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lobbies.map(lobby => (
                  <div key={lobby.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors" data-testid={`lobby-${lobby.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <Swords className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{lobby.creator_username}</p>
                        <p className="text-xs text-[#94a3b8]">Waiting for opponent</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-cyan-400">{lobby.bet_amount} USDT</span>
                      {lobby.creator_id === user?.id ? (
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => cancelLobby(lobby.id)} data-testid={`lobby-cancel-${lobby.id}`}>
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-cyan-500 hover:bg-cyan-600 text-white"
                          onClick={() => joinLobby(lobby.id)}
                          disabled={joining === lobby.id}
                          data-testid={`lobby-join-${lobby.id}`}
                        >
                          {joining === lobby.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Games History */}
        <div className="mt-6 glass-card rounded-2xl p-6" data-testid="pvp-history-panel">
          <h3 className="font-['Unbounded'] text-sm font-semibold text-white mb-4">My PVP History</h3>
          {myGames.length === 0 ? (
            <p className="text-sm text-[#94a3b8] text-center py-8">No PVP games yet</p>
          ) : (
            <div className="space-y-2">
              {myGames.map(g => (
                <div key={g.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <Crown className={`w-4 h-4 ${g.winner_id === user?.id ? 'text-amber-400' : 'text-[#555]'}`} />
                    <div>
                      <p className="text-sm text-white">
                        {g.result?.creator?.username} vs {g.result?.joiner?.username}
                      </p>
                      <p className="text-xs text-[#555]">Winner: {g.result?.winner_username}</p>
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-semibold ${g.winner_id === user?.id ? 'text-emerald-400' : 'text-red-400'}`}>
                    {g.winner_id === user?.id ? `+${g.bet_amount * 2}` : `-${g.bet_amount}`} USDT
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Result Dialog */}
        <Dialog open={showResult} onOpenChange={setShowResult}>
          <DialogContent className="bg-[#111113] border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Unbounded'] text-center">
                {gameResult?.winner_id === user?.id ? (
                  <span className="text-emerald-400 flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6" /> Victory!
                  </span>
                ) : (
                  <span className="text-red-400">Defeat</span>
                )}
              </DialogTitle>
            </DialogHeader>
            {gameResult && (
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-xs text-[#94a3b8] mb-2">{gameResult.creator?.username}</p>
                    <PlayingCard card={gameResult.creator?.card} />
                  </div>
                  <span className="font-['Unbounded'] text-lg font-bold text-[#94a3b8]">VS</span>
                  <div className="text-center">
                    <p className="text-xs text-[#94a3b8] mb-2">{gameResult.joiner?.username}</p>
                    <PlayingCard card={gameResult.joiner?.card} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#94a3b8]">Winner</p>
                  <p className="font-['Unbounded'] text-lg font-bold text-white">{gameResult.winner_username}</p>
                  <p className="font-mono text-lg text-emerald-400 font-bold">+{gameResult.total_pot} USDT</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
