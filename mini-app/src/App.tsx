import React from 'react';
import { useAppContext } from './context/AppContext';
import { Wallet, Coins, Info, Shield, Trophy, LayoutGrid, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const App: React.FC = () => {
  const { user, loading, error, refreshBalance } = useAppContext();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surfsol-darker">
        <div className="w-16 h-16 border-4 border-surfsol-primary border-t-surfsol-accent rounded-full animate-spin mb-4"></div>
        <p className="text-surfsol-secondary font-medium animate-pulse text-lg">Catching the wave...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surfsol-darker p-6 text-center">
        <div className="bg-red-500/20 p-4 rounded-2xl mb-4">
          <Info className="w-12 h-12 text-red-500 mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Ocean is Rough</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-surfsol-primary hover:bg-surfsol-secondary text-white px-8 py-3 rounded-xl font-bold transition-all w-full shadow-lg shadow-surfsol-primary/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surfsol-darker text-white pb-24 relative overflow-hidden">
      {/* Background Waves Decoration */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-surfsol-primary/20 to-transparent pointer-events-none opacity-50"></div>
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-surfsol-accent/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 z-50 glass-morphism mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-surfsol-primary rounded-xl flex items-center justify-center shadow-lg shadow-surfsol-primary/30 border border-surfsol-accent/20">
            <span className="text-2xl">🌊</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-none">SURFSOL</h1>
            <p className="text-[10px] text-surfsol-accent uppercase tracking-[0.2em] font-bold mt-1">Casino</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-surfsol-darker/50 px-3 py-1.5 rounded-full border border-white/5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-gray-300">Live</span>
        </div>
      </header>

      {/* Hero Section / User Balance */}
      <section className="px-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surf-wave rounded-3xl p-6 shadow-2xl shadow-surfsol-primary/40 relative overflow-hidden group"
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <button 
                onClick={refreshBalance}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors border border-white/10"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1 opacity-80 uppercase tracking-widest">Main Wallet Balance</p>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-4xl font-black tracking-tighter text-white drop-shadow-md">
                {user?.balance.toFixed(4)}
              </h2>
              <span className="text-xl font-bold text-white/80">SOL</span>
            </div>
            <div className="mt-6 flex items-center space-x-2 text-[10px] font-bold text-white/60 bg-black/20 w-fit px-3 py-1 rounded-full uppercase tracking-tighter">
              <Shield className="w-3 h-3" />
              <span>Non-Custodial Account Connected</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Games Preview Section */}
      <section className="px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center">
            <LayoutGrid className="w-5 h-5 mr-2 text-surfsol-accent" />
            Popular Games
          </h3>
          <span className="text-xs text-surfsol-accent font-bold uppercase tracking-wider">Show All</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'Slots', icon: '🎰', color: 'from-purple-500/20 to-indigo-500/20' },
            { name: 'Dice', icon: '🎲', color: 'from-orange-500/20 to-red-500/20' },
            { name: 'Mines', icon: '💣', color: 'from-emerald-500/20 to-teal-500/20' },
            { name: 'Crash', icon: '🚀', color: 'from-surfsol-primary/20 to-surfsol-secondary/20' },
          ].map((game, i) => (
            <motion.div 
              key={game.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileTap={{ scale: 0.95 }}
              className={`bg-gradient-to-br ${game.color} border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">{game.icon}</span>
              <p className="font-bold text-sm text-white/90">{game.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Info Cards */}
      <section className="px-6 pb-8 space-y-4">
        <div className="glass-morphism rounded-2xl p-4 flex items-center space-x-4 border-l-4 border-surfsol-accent">
          <div className="bg-surfsol-accent/10 p-2 rounded-xl">
            <Shield className="w-6 h-6 text-surfsol-accent" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Provably Fair System</h4>
            <p className="text-xs text-gray-400">Every outcome is cryptographically verifiable on Solana chain.</p>
          </div>
        </div>
        <div className="glass-morphism rounded-2xl p-4 flex items-center space-x-4 border-l-4 border-surfsol-primary">
          <div className="bg-surfsol-primary/10 p-2 rounded-xl">
            <Trophy className="w-6 h-6 text-surfsol-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">High Roller Rewards</h4>
            <p className="text-xs text-gray-400">Compete in our weekly leaderboard for massive SOL prizes.</p>
          </div>
        </div>
      </section>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full glass-morphism border-t border-white/10 px-6 py-4 flex justify-between items-center z-50">
        <button className="flex flex-col items-center space-y-1 text-surfsol-accent drop-shadow-[0_0_8px_rgba(100,255,218,0.4)]">
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Lobby</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <Coins className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Games</span>
        </button>
        <div className="w-14 h-14 bg-surfsol-primary rounded-full flex items-center justify-center shadow-lg shadow-surfsol-primary/40 -mt-12 border-4 border-surfsol-darker relative group overflow-hidden">
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
          <span className="text-2xl">🎲</span>
        </div>
        <button className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Wallet</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition-colors">
          <Trophy className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">VIP</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
