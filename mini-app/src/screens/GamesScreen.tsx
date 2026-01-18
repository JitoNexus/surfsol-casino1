import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

type Props = {
  demoMode: boolean;
  demoBalance: number;
  realBalance: number;
  onBack: () => void;
  onSelectPlinko: () => void;
  onToggleDemo: (v: boolean) => void;
  onResetDemo: () => void;
};

const GamesScreen: React.FC<Props> = ({
  demoMode,
  demoBalance,
  realBalance,
  onBack,
  onSelectPlinko,
  onToggleDemo,
  onResetDemo,
}) => {
  const cards = [
    { id: 'plinko', name: 'Plinko', icon: '🟣', color: 'from-violet-500/25 to-indigo-500/10', playable: true },
    { id: 'dice', name: 'Dice', icon: '🎲', color: 'from-orange-500/25 to-red-500/10', playable: false },
    { id: 'mines', name: 'Mines', icon: '💣', color: 'from-emerald-500/25 to-teal-500/10', playable: false },
    { id: 'crash', name: 'Crash', icon: '🚀', color: 'from-surfsol-primary/25 to-surfsol-secondary/10', playable: false },
  ] as const;

  return (
    <div className="px-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-bold">Back</span>
        </button>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{demoMode ? 'Demo Balance' : 'Wallet Balance'}</div>
          <div className="text-sm font-black">{(demoMode ? demoBalance : realBalance).toFixed(4)} SOL</div>
        </div>
      </div>

      <div className="glass-morphism rounded-3xl p-5 border border-white/10 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-widest text-gray-300">Play Mode</div>
            <div className="text-xs text-gray-400">Use Demo to play without real funds.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleDemo(true)}
              className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider ${demoMode ? 'bg-surfsol-accent/15 border-surfsol-accent/30 text-surfsol-accent' : 'bg-white/5 border-white/10 text-gray-300'}`}
            >
              Demo
            </button>
            <button
              onClick={() => onToggleDemo(false)}
              className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider ${!demoMode ? 'bg-surfsol-primary/15 border-surfsol-primary/30 text-white' : 'bg-white/5 border-white/10 text-gray-300'}`}
            >
              Real
            </button>
          </div>
        </div>

        {demoMode && (
          <div className="mt-4 flex items-center justify-between bg-black/20 rounded-2xl p-4 border border-white/5">
            <div>
              <div className="text-xs text-gray-400">Demo balance</div>
              <div className="text-lg font-black">{demoBalance.toFixed(4)} SOL</div>
            </div>
            <button
              onClick={onResetDemo}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 font-bold text-sm"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((game, i) => (
          <motion.button
            key={game.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (game.id === 'plinko') onSelectPlinko();
            }}
            className={`text-left bg-gradient-to-br ${game.color} border border-white/10 rounded-2xl p-4 relative overflow-hidden group`}
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="text-3xl mb-3 drop-shadow-lg">{game.icon}</div>
              <div className="font-black text-base">{game.name}</div>
              <div className="text-xs text-gray-300 mt-1">
                {game.id === 'plinko'
                  ? demoMode
                    ? 'Playable now'
                    : 'Enable demo'
                  : 'Coming soon'}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default GamesScreen;
