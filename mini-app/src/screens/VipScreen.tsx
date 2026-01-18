import React from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';

type Props = {
  onBack: () => void;
};

const VipScreen: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="px-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-bold">Back</span>
        </button>
      </div>

      <div className="glass-morphism rounded-3xl p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-surfsol-primary/20 border border-white/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-surfsol-accent" />
          </div>
          <div>
            <div className="text-xl font-black">VIP</div>
            <div className="text-xs text-gray-400">Leaderboards, boosted rewards, promos.</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">Weekly leaderboard prizes</div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">VIP rakeback & bonuses</div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">Exclusive game drops</div>
        </div>
      </div>
    </div>
  );
};

export default VipScreen;
