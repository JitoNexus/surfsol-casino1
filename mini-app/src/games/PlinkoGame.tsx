import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';

type Props = {
  demoMode: boolean;
  demoBalance: number;
  setDemoBalance: (updater: (v: number) => number) => void;
  onBack: () => void;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const PlinkoGame: React.FC<Props> = ({ demoMode, demoBalance, setDemoBalance, onBack }) => {
  const [bet, setBet] = useState<number>(0.05);
  const [dropping, setDropping] = useState(false);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);

  const rows = 9;
  const multipliers = useMemo(() => [0.2, 0.5, 0.8, 1.2, 2.0, 1.2, 0.8, 0.5, 0.2], []);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const [boardWidth, setBoardWidth] = useState(320);

  useEffect(() => {
    const update = () => {
      if (!boardRef.current) return;
      setBoardWidth(Math.max(280, Math.min(420, boardRef.current.getBoundingClientRect().width)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const maxBet = Math.max(0.01, Math.min(0.5, demoBalance));
    setBet(v => clamp(v, 0.01, maxBet));
  }, [demoBalance]);

  const [ballX, setBallX] = useState(0);
  const [ballY, setBallY] = useState(0);

  const drop = async () => {
    if (!demoMode) return;
    if (dropping) return;
    if (bet <= 0 || bet > demoBalance) return;

    setDropping(true);
    setLastPayout(null);
    setLastMultiplier(null);
    setBallX(0);
    setBallY(0);

    setDemoBalance(v => v - bet);

    const stepY = 28;
    const stepX = boardWidth / multipliers.length;
    let pos = Math.floor(multipliers.length / 2);

    for (let r = 0; r < rows; r++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      pos = clamp(pos + dir, 0, multipliers.length - 1);
      setBallX((pos + 0.5) * stepX - boardWidth / 2);
      setBallY((r + 1) * stepY);
      await new Promise(res => setTimeout(res, 90));
    }

    const m = multipliers[pos] ?? 0;
    const payout = bet * m;

    setDemoBalance(v => v + payout);
    setLastPayout(payout);
    setLastMultiplier(m);
    setDropping(false);
  };

  const maxBet = Math.max(0.01, Math.min(0.5, demoBalance));

  return (
    <div className="px-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-bold">Games</span>
        </button>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Demo Balance</div>
          <div className="text-sm font-black">{demoBalance.toFixed(4)} SOL</div>
        </div>
      </div>

      <div className="glass-morphism rounded-3xl p-5 border border-white/10 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xl font-black">Plinko</div>
            <div className="text-xs text-gray-400">Demo mode</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bet</div>
            <div className="text-sm font-black">{bet.toFixed(3)} SOL</div>
          </div>
        </div>

        <input
          type="range"
          min={0.01}
          max={maxBet}
          step={0.01}
          value={bet}
          onChange={(e) => setBet(Number(e.target.value))}
          className="w-full"
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={drop}
            disabled={!demoMode || dropping || bet > demoBalance}
            className={`flex-1 px-4 py-3 rounded-2xl font-black uppercase tracking-widest border ${(!demoMode || dropping || bet > demoBalance) ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-surfsol-primary/80 hover:bg-surfsol-primary border-white/10 text-white'}`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Drop
            </span>
          </button>
          <button
            onClick={() => setDemoBalance(() => 5)}
            className="px-3 py-3 rounded-2xl border border-white/10 bg-white/10 hover:bg-white/15 font-black uppercase tracking-widest text-xs"
          >
            Reset
          </button>
        </div>

        {lastPayout !== null && (
          <div className="mt-4 bg-black/20 rounded-2xl p-4 border border-white/5">
            <div className="text-xs text-gray-400">Last result</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-black text-surfsol-accent">+{lastPayout.toFixed(4)} SOL</div>
              <div className="text-xs font-black text-white/70">({(lastMultiplier ?? 0).toFixed(2)}x)</div>
            </div>
          </div>
        )}
      </div>

      <div ref={boardRef} className="glass-morphism rounded-3xl p-5 border border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(180deg, rgba(100,255,218,0.10), transparent)' }} />

        <div className="relative" style={{ height: 320 }}>
          <div
            className="absolute left-1/2 top-5 w-4 h-4 rounded-full bg-surfsol-accent shadow-[0_0_18px_rgba(100,255,218,0.6)]"
            style={{ transform: `translate(calc(-50% + ${ballX}px), ${ballY}px)` }}
          />

          <div className="absolute left-0 right-0 bottom-0 grid" style={{ gridTemplateColumns: `repeat(${multipliers.length}, minmax(0, 1fr))` }}>
            {multipliers.map((m, i) => (
              <div key={i} className="px-1">
                <div className="bg-white/5 border border-white/10 rounded-xl py-2 text-center text-xs font-black text-white/80">
                  {m.toFixed(2)}x
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!demoMode && (
        <div className="mt-4 text-xs text-gray-400">Enable Demo mode to play Plinko.</div>
      )}
    </div>
  );
};

export default PlinkoGame;
