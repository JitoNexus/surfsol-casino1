import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from './context/AppContext';
import { useTheme, ThemeName, themes } from './context/ThemeContext';
import { Wallet, Copy, QrCode, Settings, Volume2, VolumeX, Palette, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import AdvancedPlinko from './games/AdvancedPlinko';

const App: React.FC = () => {
  const { user, loading, localWallet, refreshBalance, generateLocalWallet } = useAppContext();
  const { theme, colors, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'plinko' | 'wallet' | 'settings'>('plinko');
  const [demoBalance, setDemoBalance] = useState<number>(() => {
    const v = localStorage.getItem('surfsol_demo_balance');
    const n = v ? Number(v) : 5;
    return Number.isFinite(n) ? n : 5;
  });
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('surfsol_music') === '1');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('surfsol_demo_balance', String(demoBalance));
  }, [demoBalance]);

  useEffect(() => {
    localStorage.setItem('surfsol_music', musicEnabled ? '1' : '0');
  }, [musicEnabled]);

  const walletAddress = user?.public_key || localWallet || '';
  const safeBalance = Number.isFinite(Number(user?.balance)) ? Number(user?.balance) : 0;

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

  if (loading) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen"
        style={{ background: colors.background }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-4 mb-4"
          style={{ borderColor: colors.primary, borderTopColor: colors.accent }}
        />
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-lg font-bold"
          style={{ color: colors.textMuted }}
        >
          Loading SurfSol...
        </motion.p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ background: colors.background, color: colors.text }}
    >
      {/* Animated Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${colors.primary}30, transparent 50%),
                       radial-gradient(ellipse at 80% 80%, ${colors.secondary}20, transparent 40%),
                       radial-gradient(ellipse at 20% 60%, ${colors.accent}15, transparent 40%)`,
        }}
      />
      
      {/* Floating Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{ background: colors.accent, opacity: 0.3 }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * -200, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: i * 0.5,
          }}
          initial={{
            left: `${10 + i * 15}%`,
            top: `${60 + Math.random() * 30}%`,
          }}
        />
      ))}

      {/* Header */}
      <header 
        className="sticky top-0 z-50 backdrop-blur-xl border-b px-4 py-3"
        style={{ 
          background: `${colors.surface}90`,
          borderColor: `${colors.text}10`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                boxShadow: `0 4px 20px ${colors.glow}`,
              }}
            >
              <span className="text-xl">🎰</span>
            </motion.div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">SURFSOL</h1>
              <p 
                className="text-[10px] uppercase tracking-[0.2em] font-bold"
                style={{ color: colors.accent }}
              >
                Plinko
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-2 rounded-full border backdrop-blur-sm"
              style={{ 
                borderColor: `${colors.text}20`,
                background: showThemePicker ? `${colors.accent}20` : `${colors.text}05`,
              }}
            >
              <Palette className="w-5 h-5" style={{ color: showThemePicker ? colors.accent : colors.textMuted }} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMusicEnabled(!musicEnabled)}
              className="p-2 rounded-full border backdrop-blur-sm"
              style={{ 
                borderColor: `${colors.text}20`,
                background: `${colors.text}05`,
              }}
            >
              {musicEnabled ? (
                <Volume2 className="w-5 h-5" style={{ color: colors.accent }} />
              ) : (
                <VolumeX className="w-5 h-5" style={{ color: colors.textMuted }} />
              )}
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
              className="mt-3 flex gap-2 overflow-hidden"
            >
              {(Object.keys(themes) as ThemeName[]).map((t) => (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setTheme(t);
                    setShowThemePicker(false);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all"
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
      <main className="pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'plinko' && (
            <motion.div
              key="plinko"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AdvancedPlinko
                demoBalance={demoBalance}
                setDemoBalance={setDemoBalance}
              />
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 space-y-4"
            >
              {/* Wallet Card */}
              <div 
                className="rounded-3xl p-5 border"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.surface}, ${colors.background})`,
                  borderColor: `${colors.text}10`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>
                    Your Wallet
                  </div>
                  <div className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: `${colors.accent}20`, color: colors.accent }}>
                    Solana
                  </div>
                </div>

                {walletAddress ? (
                  <>
                    <div 
                      className="rounded-2xl p-4 border mb-4"
                      style={{ background: `${colors.background}80`, borderColor: `${colors.text}10` }}
                    >
                      <div className="text-xs mb-2" style={{ color: colors.textMuted }}>Address</div>
                      <div className="font-mono text-sm break-all mb-3">{walletAddress}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold" style={{ color: colors.textMuted }}>{shortAddress}</div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={copyAddress}
                          className="ml-auto px-3 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2"
                          style={{ 
                            borderColor: copied ? colors.accent : `${colors.text}20`,
                            background: copied ? `${colors.accent}20` : `${colors.text}05`,
                            color: copied ? colors.accent : colors.text,
                          }}
                        >
                          <Copy className="w-4 h-4" />
                          {copied ? 'Copied!' : 'Copy'}
                        </motion.button>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div 
                      className="rounded-2xl p-4 border"
                      style={{ background: `${colors.background}80`, borderColor: `${colors.text}10` }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="w-4 h-4" style={{ color: colors.accent }} />
                        <div className="text-sm font-bold">Deposit QR</div>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="bg-white p-3 rounded-2xl">
                          <QRCodeCanvas value={`solana:${walletAddress}`} size={180} includeMargin />
                        </div>
                      </div>
                      <div className="text-xs mt-3" style={{ color: colors.textMuted }}>
                        Send SOL to this address. Then refresh.
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-sm mb-4" style={{ color: colors.textMuted }}>
                      No wallet found. Generate a local wallet to continue.
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={generateLocalWallet}
                      className="px-6 py-3 rounded-2xl font-bold"
                      style={{ 
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                        boxShadow: `0 4px 20px ${colors.glow}`,
                      }}
                    >
                      Generate Wallet
                    </motion.button>
                  </div>
                )}

                {/* Balance */}
                <div 
                  className="rounded-2xl p-4 border mt-4"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}10)`,
                    borderColor: `${colors.text}10`,
                  }}
                >
                  <div className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: colors.textMuted }}>
                    Balance
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-black">{safeBalance.toFixed(4)}</div>
                    <div className="text-sm font-bold" style={{ color: colors.textMuted }}>SOL</div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={refreshBalance}
                    className="mt-3 px-4 py-2 rounded-xl border font-bold text-sm inline-flex items-center gap-2"
                    style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Refresh Balance
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 space-y-4"
            >
              <div 
                className="rounded-3xl p-5 border"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.surface}, ${colors.background})`,
                  borderColor: `${colors.text}10`,
                }}
              >
                <h2 className="text-lg font-black mb-4">Settings</h2>
                
                {/* Theme Selection */}
                <div className="mb-6">
                  <div className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>
                    Theme
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(themes) as ThemeName[]).map((t) => (
                      <motion.button
                        key={t}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTheme(t)}
                        className="py-3 px-4 rounded-xl border font-bold text-sm uppercase tracking-wider"
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
                <div className="mb-6">
                  <div className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>
                    Demo Balance
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black">{demoBalance.toFixed(4)} SOL</div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDemoBalance(5)}
                      className="px-4 py-2 rounded-xl border font-bold text-sm"
                      style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
                    >
                      Reset to 5 SOL
                    </motion.button>
                  </div>
                </div>

                {/* About */}
                <div 
                  className="rounded-2xl p-4 border"
                  style={{ background: `${colors.background}80`, borderColor: `${colors.text}10` }}
                >
                  <div className="text-sm font-bold mb-2">About SurfSol</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>
                    SurfSol is a provably fair Plinko game on Solana. Demo mode uses virtual balance for practice.
                    Connect via Telegram bot for real SOL deposits.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t px-6 py-4 flex justify-around items-center z-50"
        style={{ 
          background: `${colors.surface}95`,
          borderColor: `${colors.text}10`,
        }}
      >
        {[
          { id: 'plinko' as const, icon: '🎰', label: 'Plinko' },
          { id: 'wallet' as const, icon: <Wallet className="w-6 h-6" />, label: 'Wallet' },
          { id: 'settings' as const, icon: <Settings className="w-6 h-6" />, label: 'Settings' },
        ].map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center gap-1 py-1 px-4"
          >
            <div 
              className="text-2xl"
              style={{ 
                color: activeTab === item.id ? colors.accent : colors.textMuted,
                filter: activeTab === item.id ? `drop-shadow(0 0 8px ${colors.glow})` : 'none',
              }}
            >
              {typeof item.icon === 'string' ? item.icon : item.icon}
            </div>
            <span 
              className="text-[10px] font-black uppercase tracking-wider"
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
