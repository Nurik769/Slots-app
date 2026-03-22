import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import API, { BACKEND_URL } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Plus, Loader2, Trophy, Crown, RefreshCw, Wifi, WifiOff, Timer } from 'lucide-react';

const suitSymbols = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const suitColors = { hearts: 'text-red-400', diamonds: 'text-red-400', clubs: 'text-white', spades: 'text-white' };

function PlayingCard({ card, revealed = true, size = 'md' }) {
  const s = size === 'lg' ? 'w-28 h-40' : 'w-20 h-28';
  if (!card || !revealed) {
    return (
      <div className={`${s} rounded-xl bg-gradient-to-br from-emerald-600/30 to-cyan-600/30 border border-white/10 flex items-center justify-center`}>
        <span className="text-3xl text-white/30">?</span>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`${s} rounded-xl bg-[#0a0a0b] border border-white/10 flex flex-col items-center justify-center gap-1`}
    >
      <span className={`font-mono text-2xl font-bold ${suitColors[card.suit]}`}>{card.name}</span>
      <span className={`text-3xl ${suitColors[card.suit]}`}>{suitSymbols[card.suit]}</span>
    </motion.div>
  );
}

export default function PvpCards() {
  const { user, refreshBalance } = useAuth();
  const [lobbies, setLobbies] = useState([]);
  const [betAmount, setBetAmount] = useState('10');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(null);
  const [myGames, setMyGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // WebSocket game state
  const [activeLobbyId, setActiveLobbyId] = useState(null);
  const [gamePhase, setGamePhase] = useState(null); // null | waiting | connecting | countdown | cards_dealt | result
  const [countdown, setCountdown] = useState(null);
  const [dealtCards, setDealtCards] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const wsRef = useRef(null);

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

  // Cleanup WS on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const connectToLobby = (lobbyId) => {
    const token = localStorage.getItem('token');
    const wsBase = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrl = `${wsBase}/api/ws/pvp/${lobbyId}?token=${token}`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setGamePhase('connecting');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'player_joined':
            setPlayerCount(data.player_count || 0);
            if (data.player_count >= 2) {
              toast.success('Opponent connected! Game starting...');
            }
            break;
          case 'countdown':
            setGamePhase('countdown');
            setCountdown(data.seconds);
            break;
          case 'cards_dealt':
            setGamePhase('cards_dealt');
            setDealtCards(data.players);
            break;
          case 'game_result':
            setGamePhase('result');
            setGameResult(data.result);
            refreshBalance();
            fetchMyGames();
            fetchLobbies();
            if (data.result?.winner_id === user?.id) {
              toast.success(`You won ${data.result.total_pot} USDT!`);
            } else if (data.reason === 'opponent_disconnected') {
              toast.success('Opponent disconnected. You win!');
            } else {
              toast.error('You lost this round.');
            }
            break;
          case 'player_disconnected':
            toast.info('Opponent disconnected');
            break;
          default:
            break;
        }
      } catch { /* ignore */ }
    };

    socket.onclose = () => {
      if (gamePhase && gamePhase !== 'result') {
        // Only show if we were in an active game
      }
    };

    socket.onerror = () => {
      toast.error('WebSocket connection error');
    };

    wsRef.current = socket;
  };

  const createLobby = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < 5) { toast.error('Minimum bet is 5 USDT'); return; }
    if (bet > (user?.balance || 0)) { toast.error('Insufficient balance'); return; }

    setCreating(true);
    try {
      const { data } = await API.post('/games/pvp/create', { bet_amount: bet });
      setActiveLobbyId(data.lobby_id);
      setGamePhase('waiting');
      setPlayerCount(1);
      setDealtCards(null);
      setGameResult(null);
      setCountdown(null);
      connectToLobby(data.lobby_id);
      refreshBalance();
      fetchLobbies();
      toast.success('Lobby created! Waiting for opponent...');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create lobby');
    } finally {
      setCreating(false);
    }
  };

  const joinLobby = async (lobbyId) => {
    setJoining(lobbyId);
    try {
      await API.post(`/games/pvp/join/${lobbyId}`);
      setActiveLobbyId(lobbyId);
      setGamePhase('connecting');
      setPlayerCount(2);
      setDealtCards(null);
      setGameResult(null);
      setCountdown(null);
      connectToLobby(lobbyId);
      refreshBalance();
      fetchLobbies();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join');
    } finally {
      setJoining(null);
    }
  };

  const cancelLobby = async (lobbyId) => {
    try {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      await API.post(`/games/pvp/cancel/${lobbyId}`);
      toast.success('Lobby cancelled');
      setActiveLobbyId(null);
      setGamePhase(null);
      fetchLobbies();
      refreshBalance();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    }
  };

  const resetGame = () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setActiveLobbyId(null);
    setGamePhase(null);
    setDealtCards(null);
    setGameResult(null);
    setCountdown(null);
    setPlayerCount(0);
    fetchLobbies();
    fetchMyGames();
  };

  // Active game view
  if (activeLobbyId && gamePhase) {
    return (
      <div data-testid="pvp-game-active">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
            {/* Ambient glow */}
            {gamePhase === 'result' && gameResult && (
              <div className={`absolute inset-0 ${gameResult.winner_id === user?.id ? 'bg-emerald-500/[0.04]' : 'bg-red-500/[0.04]'} pointer-events-none`} />
            )}

            <div className="relative">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="font-['Unbounded'] text-xl font-bold text-white">PVP Card Battle</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {gamePhase === 'waiting' ? (
                    <><Wifi className="w-4 h-4 text-amber-400 animate-pulse" /><span className="text-sm text-amber-400">Waiting for opponent...</span></>
                  ) : gamePhase === 'connecting' ? (
                    <><Wifi className="w-4 h-4 text-cyan-400 animate-pulse" /><span className="text-sm text-cyan-400">Connected. Waiting for game...</span></>
                  ) : gamePhase === 'countdown' ? (
                    <><Timer className="w-4 h-4 text-emerald-400" /><span className="text-sm text-emerald-400">Game starting...</span></>
                  ) : gamePhase === 'cards_dealt' ? (
                    <span className="text-sm text-white">Cards dealt!</span>
                  ) : (
                    <span className="text-sm text-white">Game over</span>
                  )}
                </div>
              </div>

              {/* Countdown */}
              <AnimatePresence>
                {gamePhase === 'countdown' && countdown && (
                  <motion.div
                    key={countdown}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-center py-12"
                  >
                    <span className="font-['Unbounded'] text-7xl font-bold text-emerald-400">{countdown}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Waiting state */}
              {(gamePhase === 'waiting' || gamePhase === 'connecting') && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-[#94a3b8]">Players connected: {playerCount}/2</p>
                  {gamePhase === 'waiting' && (
                    <Button
                      variant="outline"
                      className="mt-6 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => cancelLobby(activeLobbyId)}
                      data-testid="pvp-cancel-active"
                    >
                      Cancel Lobby
                    </Button>
                  )}
                </div>
              )}

              {/* Cards display */}
              {(gamePhase === 'cards_dealt' || gamePhase === 'result') && dealtCards && (
                <div className="flex items-center justify-around py-8">
                  {Object.entries(dealtCards).map(([playerId, info]) => (
                    <div key={playerId} className="text-center">
                      <p className={`text-sm mb-3 ${playerId === user?.id ? 'text-emerald-400 font-semibold' : 'text-[#94a3b8]'}`}>
                        {info.username} {playerId === user?.id && '(You)'}
                      </p>
                      <PlayingCard card={info.card} size="lg" />
                    </div>
                  ))}
                </div>
              )}

              {/* Result banner */}
              {gamePhase === 'result' && gameResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <div className={`text-center py-6 rounded-xl ${
                    gameResult.winner_id === user?.id
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`} data-testid="pvp-result-banner">
                    {gameResult.winner_id === user?.id ? (
                      <>
                        <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                        <p className="font-['Unbounded'] text-xl font-bold text-emerald-400">Victory!</p>
                        <p className="font-mono text-lg text-white mt-1">+{gameResult.total_pot} USDT</p>
                      </>
                    ) : (
                      <>
                        <p className="font-['Unbounded'] text-xl font-bold text-red-400">Defeat</p>
                        <p className="text-sm text-[#94a3b8] mt-1">
                          {gameResult.reason === 'opponent_disconnected' ? 'Wait... You actually won!' : `${gameResult.winner_username} wins`}
                        </p>
                      </>
                    )}
                  </div>

                  <Button
                    onClick={resetGame}
                    className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl py-5"
                    data-testid="pvp-play-again-btn"
                  >
                    Back to Lobbies
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Lobby list view
  return (
    <div data-testid="pvp-cards-page">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Unbounded'] text-2xl sm:text-3xl font-bold text-white tracking-tight">PVP Cards</h1>
            <p className="text-sm text-[#94a3b8] mt-1">Real-time card battles via WebSocket</p>
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
              <p className="text-[10px] text-[#555] text-center">Game plays via WebSocket in real-time</p>
            </div>
          </div>

          {/* Lobbies */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6" data-testid="pvp-lobbies-panel">
            <h3 className="font-['Unbounded'] text-sm font-semibold text-white mb-4">Open Lobbies</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton-shimmer rounded-lg" />)}
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
                        <p className="text-xs text-[#94a3b8]">
                          {lobby.status === 'waiting' ? 'Waiting for opponent' : 'Game in progress'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-cyan-400">{lobby.bet_amount} USDT</span>
                      {lobby.status === 'waiting' && lobby.creator_id !== user?.id && (
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
                      {lobby.creator_id === user?.id && lobby.status === 'waiting' && (
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => cancelLobby(lobby.id)} data-testid={`lobby-cancel-${lobby.id}`}>
                          Cancel
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
                        {g.result?.creator?.username || 'Player 1'} vs {g.result?.joiner?.username || 'Player 2'}
                      </p>
                      <p className="text-xs text-[#555]">
                        Winner: {g.result?.winner_username || 'Unknown'}
                        {g.result?.reason === 'opponent_disconnected' && ' (disconnect)'}
                      </p>
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
      </motion.div>
    </div>
  );
}
