import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTheme, ThemeName, themes } from './context/ThemeContext';
import { Wallet, Copy, QrCode, Settings, Volume2, VolumeX, Palette, RotateCcw, Trophy, ExternalLink, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import AdvancedPlinko from './games/AdvancedPlinko';
import { generateRealWallet, restoreWallet, getWalletBalance, isValidSolanaAddress, sendSOL, HOUSE_WALLET } from './services/solanaWallet';
import { startThemeMusic, stopThemeMusic, unlockAudio } from './services/sounds';

interface WalletData {
  publicKey: string;
  secretKey: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  balance: number;
}

const App: React.FC = () => {
  const { theme, colors, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'plinko' | 'wallet' | 'leaderboard' | 'settings'>('plinko');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [realBalance, setRealBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [demoBalance, setDemoBalance] = useState<number>(() => {
    const v = localStorage.getItem('surfsol_demo_balance');
    const n = v ? Number(v) : 1;
    return Number.isFinite(n) ? n : 1;
  });
  const [isRealMode, setIsRealMode] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('surfsol_music') === '1');

  // Load or create wallet on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('surfsol_wallet_secret');
    if (savedKey) {
      const restored = restoreWallet(savedKey);
      if (restored) {
        setWallet(restored);
      }
    }
  }, []);

  // Save wallet when created
  const createWallet = useCallback(() => {
    const newWallet = generateRealWallet();
    setWallet(newWallet);
    localStorage.setItem('surfsol_wallet_secret', newWallet.secretKey);
    setShowPrivateKey(true);
  }, []);

  // Fetch real balance
  const refreshRealBalance = useCallback(async () => {
    if (!wallet?.publicKey) return;
    setIsLoadingBalance(true);
    try {
      const bal = await getWalletBalance(wallet.publicKey);
      setRealBalance(bal);
    } catch (e) {
      console.error('Failed to fetch balance:', e);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [wallet?.publicKey]);

  useEffect(() => {
    if (wallet?.publicKey) {
      refreshRealBalance();
      // Refresh every 30 seconds
      const interval = setInterval(refreshRealBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [wallet?.publicKey, refreshRealBalance]);

  useEffect(() => {
    localStorage.setItem('surfsol_demo_balance', String(demoBalance));
  }, [demoBalance]);

  // Fetch real leaderboard from API
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setLeaderboard(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Music toggle
  useEffect(() => {
    localStorage.setItem('surfsol_music', musicEnabled ? '1' : '0');
    if (musicEnabled) {
      startThemeMusic(theme, 0.15);
    } else {
      stopThemeMusic();
    }
  }, [musicEnabled, theme]);

  const handleWithdraw = async () => {
    if (!wallet?.secretKey || !withdrawAddress || !withdrawAmount) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > realBalance) {
      setWithdrawError('Invalid amount');
      return;
    }
    
    if (!isValidSolanaAddress(withdrawAddress)) {
      setWithdrawError('Invalid Solana address');
      return;
    }

    setWithdrawing(true);
    setWithdrawError('');
    
    try {
      const result = await sendSOL(wallet.secretKey, withdrawAddress, amount);
      if (result.success) {
        setWithdrawAddress('');
        setWithdrawAmount('');
        await refreshRealBalance();
      } else {
        setWithdrawError(result.error || 'Withdrawal failed');
      }
    } catch (e: any) {
      setWithdrawError(e.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const currentBalance = isRealMode ? realBalance : demoBalance;
  const walletAddress = wallet?.publicKey || '';

  const shortAddress = useMemo(() => {
    if (!walletAddress) return '';
    return `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}`;
  }, [walletAddress]);

  const copyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = walletAddress;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ background: colors.background, color: colors.text }}
    >
      {/* Background gradient */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${colors.primary}25, transparent 50%),
                       radial-gradient(ellipse at 80% 80%, ${colors.secondary}15, transparent 40%)`,
        }}
      />

      {/* Header */}
      <header 
        className="sticky top-0 z-50 backdrop-blur-xl border-b px-3 py-2"
        style={{ background: `${colors.surface}95`, borderColor: `${colors.text}10` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
            >
              <span className="text-base">🌊</span>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none">SURFSOL</h1>
              <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: colors.accent }}>
                {isRealMode ? 'Real Mode' : 'Demo Mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mode Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRealMode(!isRealMode)}
              className="px-2 py-1 rounded-lg border text-[10px] font-bold uppercase"
              style={{ 
                borderColor: isRealMode ? '#22c55e' : colors.accent,
                background: isRealMode ? 'rgba(34, 197, 94, 0.2)' : `${colors.accent}20`,
                color: isRealMode ? '#22c55e' : colors.accent,
              }}
            >
              {isRealMode ? 'Real' : 'Demo'}
            </motion.button>
            {/* Music Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                await unlockAudio();
                setMusicEnabled(!musicEnabled);
              }}
              className="p-1.5 rounded-lg border"
              style={{ 
                borderColor: musicEnabled ? colors.accent : `${colors.text}20`, 
                background: musicEnabled ? `${colors.accent}20` : `${colors.text}05` 
              }}
            >
              {musicEnabled ? (
                <Volume2 className="w-4 h-4" style={{ color: colors.accent }} />
              ) : (
                <VolumeX className="w-4 h-4" style={{ color: colors.textMuted }} />
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-1.5 rounded-lg border"
              style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
            >
              <Palette className="w-4 h-4" style={{ color: colors.textMuted }} />
            </motion.button>
          </div>
        </div>

        {/* Theme Picker */}
        <AnimatePresence>
          {showThemePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex gap-1.5 overflow-hidden"
            >
              {(Object.keys(themes) as ThemeName[]).map((t) => (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setTheme(t); setShowThemePicker(false); }}
                  className="flex-1 py-1.5 rounded-lg border font-bold text-[10px] uppercase"
                  style={{
                    borderColor: theme === t ? colors.accent : `${colors.text}20`,
                    background: theme === t ? `${colors.accent}20` : `${colors.text}05`,
                    color: theme === t ? colors.accent : colors.textMuted,
                  }}
                >
                  {t}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'plinko' && (
            <motion.div
              key="plinko"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AdvancedPlinko
                demoBalance={isRealMode ? realBalance : demoBalance}
                setDemoBalance={isRealMode ? 
                  () => {} : // Real mode - don't allow demo balance changes
                  setDemoBalance
                }
              />
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 space-y-3"
            >
              {/* Real Wallet Card */}
              <div 
                className="rounded-2xl p-4 border"
                style={{ background: `${colors.surface}80`, borderColor: `${colors.text}10` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>
                    Solana Wallet
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${colors.accent}20`, color: colors.accent }}>
                    Mainnet
                  </span>
                </div>

                {wallet ? (
                  <>
                    {/* Address */}
                    <div className="rounded-xl p-3 mb-3" style={{ background: `${colors.background}80`, border: `1px solid ${colors.text}10` }}>
                      <div className="text-[10px] mb-1" style={{ color: colors.textMuted }}>Address</div>
                      <div className="font-mono text-xs break-all mb-2">{walletAddress}</div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={copyAddress}
                          className="px-2 py-1 rounded-lg border text-xs font-bold inline-flex items-center gap-1"
                          style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
                        >
                          <Copy className="w-3 h-3" />
                          {copied ? 'Copied!' : 'Copy'}
                        </motion.button>
                        <a
                          href={`https://solscan.io/account/${walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg border text-xs font-bold inline-flex items-center gap-1"
                          style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Explorer
                        </a>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="rounded-xl p-3 mb-3" style={{ background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}10)`, border: `1px solid ${colors.text}10` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase" style={{ color: colors.textMuted }}>Real Balance</span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={refreshRealBalance}
                          disabled={isLoadingBalance}
                          className="p-1 rounded"
                          style={{ background: `${colors.text}10` }}
                        >
                          <RotateCcw className={`w-3 h-3 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                        </motion.button>
                      </div>
                      <div className="text-2xl font-black">{realBalance.toFixed(4)} <span className="text-sm opacity-60">SOL</span></div>
                    </div>

                    {/* QR Code */}
                    <div className="rounded-xl p-3 mb-3" style={{ background: `${colors.background}80`, border: `1px solid ${colors.text}10` }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <QrCode className="w-3 h-3" style={{ color: colors.accent }} />
                        <span className="text-xs font-bold">Deposit SOL</span>
                      </div>
                      <div className="flex justify-center">
                        <div className="bg-white p-2 rounded-xl">
                          <QRCodeCanvas value={`solana:${walletAddress}`} size={140} />
                        </div>
                      </div>
                      <p className="text-[10px] mt-2 text-center" style={{ color: colors.textMuted }}>
                        Send SOL to this address to deposit
                      </p>
                    </div>

                    {/* Withdraw Section */}
                    <div className="rounded-xl p-3" style={{ background: `${colors.background}80`, border: `1px solid ${colors.text}10` }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Send className="w-3 h-3" style={{ color: colors.accent }} />
                        <span className="text-xs font-bold">Withdraw SOL</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Recipient address"
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-xs mb-2"
                        style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
                      />
                      <div className="flex gap-2 mb-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border text-xs"
                          style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
                          step={0.001}
                        />
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleWithdraw}
                          disabled={withdrawing || !withdrawAddress || !withdrawAmount}
                          className="px-4 py-2 rounded-lg font-bold text-xs"
                          style={{ 
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                            opacity: withdrawing ? 0.5 : 1,
                          }}
                        >
                          {withdrawing ? 'Sending...' : 'Send'}
                        </motion.button>
                      </div>
                      {withdrawError && (
                        <p className="text-[10px] text-red-400">{withdrawError}</p>
                      )}
                    </div>

                    {/* Private Key Warning */}
                    <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-red-400">⚠️ PRIVATE KEY (Save this!)</span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                        >
                          {showPrivateKey ? 'Hide' : 'Show'}
                        </motion.button>
                      </div>
                      {showPrivateKey && (
                        <div className="font-mono text-[9px] break-all p-2 rounded bg-black/30 text-red-300">
                          {wallet.secretKey}
                        </div>
                      )}
                      <p className="text-[9px] text-red-300 mt-1">
                        Save this key offline. We cannot recover your funds if lost!
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                      Generate a real Solana wallet to deposit and play with real SOL
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={createWallet}
                      className="px-6 py-3 rounded-xl font-bold"
                      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                    >
                      Generate Wallet
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3"
            >
              <div 
                className="rounded-2xl p-4 border"
                style={{ background: `${colors.surface}80`, borderColor: `${colors.text}10` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" style={{ color: colors.accent }} />
                    <span className="text-sm font-black uppercase tracking-widest">Top Players</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={fetchLeaderboard}
                    disabled={leaderboardLoading}
                    className="p-1.5 rounded-lg"
                    style={{ background: `${colors.text}10` }}
                  >
                    <RotateCcw className={`w-4 h-4 ${leaderboardLoading ? 'animate-spin' : ''}`} style={{ color: colors.textMuted }} />
                  </motion.button>
                </div>

                {leaderboardLoading && leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-2" style={{ borderColor: colors.accent, borderTopColor: 'transparent' }} />
                    <p className="text-xs" style={{ color: colors.textMuted }}>Loading leaderboard...</p>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: colors.textMuted }}>No players yet. Be the first!</p>
                  </div>
                ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ 
                        background: i < 3 
                          ? `linear-gradient(135deg, ${i === 0 ? 'rgba(255, 215, 0, 0.15)' : i === 1 ? 'rgba(192, 192, 192, 0.15)' : 'rgba(205, 127, 50, 0.15)'}, transparent)`
                          : `${colors.background}60`,
                        border: `1px solid ${colors.text}10`,
                      }}
                    >
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm"
                        style={{ 
                          background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : `${colors.text}20`,
                          color: i < 3 ? '#000' : colors.text,
                        }}
                      >
                        {entry.rank}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{entry.username}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sm" style={{ color: colors.accent }}>
                          {entry.balance.toFixed(2)}
                        </div>
                        <div className="text-[10px]" style={{ color: colors.textMuted }}>SOL</div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 space-y-3"
            >
              <div 
                className="rounded-2xl p-4 border"
                style={{ background: `${colors.surface}80`, borderColor: `${colors.text}10` }}
              >
                <h2 className="text-sm font-black mb-4">Settings</h2>
                
                {/* Theme */}
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: colors.textMuted }}>Theme</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.keys(themes) as ThemeName[]).map((t) => (
                      <motion.button
                        key={t}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTheme(t)}
                        className="py-2 rounded-lg border font-bold text-[10px] uppercase"
                        style={{
                          borderColor: theme === t ? colors.accent : `${colors.text}20`,
                          background: theme === t ? `${colors.accent}20` : `${colors.text}05`,
                          color: theme === t ? colors.accent : colors.textMuted,
                        }}
                      >
                        {t}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Demo Balance */}
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: colors.textMuted }}>Demo Balance</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-black">{demoBalance.toFixed(4)} SOL</div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDemoBalance(1)}
                      className="px-3 py-1.5 rounded-lg border font-bold text-xs"
                      style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
                    >
                      Reset to 1 SOL
                    </motion.button>
                  </div>
                </div>

                {/* About */}
                <div className="rounded-xl p-3" style={{ background: `${colors.background}80`, border: `1px solid ${colors.text}10` }}>
                  <div className="text-xs font-bold mb-1">About SurfSol</div>
                  <p className="text-[10px]" style={{ color: colors.textMuted }}>
                    Provably fair Plinko on Solana. Generate a real wallet to deposit and play with real SOL.
                    Demo mode uses virtual balance. House edge: 3-5% depending on risk level.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t px-2 py-2 flex justify-around items-center z-50"
        style={{ background: `${colors.surface}98`, borderColor: `${colors.text}10` }}
      >
        {[
          { id: 'plinko' as const, icon: '🎰', label: 'Play' },
          { id: 'wallet' as const, icon: <Wallet className="w-5 h-5" />, label: 'Wallet' },
          { id: 'leaderboard' as const, icon: <Trophy className="w-5 h-5" />, label: 'Ranks' },
          { id: 'settings' as const, icon: <Settings className="w-5 h-5" />, label: 'Settings' },
        ].map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <div 
              className="text-xl"
              style={{ 
                color: activeTab === item.id ? colors.accent : colors.textMuted,
                filter: activeTab === item.id ? `drop-shadow(0 0 6px ${colors.glow})` : 'none',
              }}
            >
              {typeof item.icon === 'string' ? item.icon : item.icon}
            </div>
            <span 
              className="text-[9px] font-bold uppercase"
              style={{ color: activeTab === item.id ? colors.accent : colors.textMuted }}
            >
              {item.label}
            </span>
          </motion.button>
        ))}
      </nav>
    </div>
  );
};

export default App;
