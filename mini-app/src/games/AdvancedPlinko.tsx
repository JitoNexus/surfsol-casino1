import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

type RiskLevel = 'low' | 'medium' | 'high';

interface Ball {
  id: number;
  x: number;
  y: number;
  targetSlot: number;
  done: boolean;
  multiplier: number;
}

interface Props {
  demoBalance: number;
  setDemoBalance: (fn: (v: number) => number) => void;
}

const MULTIPLIERS: Record<RiskLevel, Record<number, number[]>> = {
  low: {
    8: [1.5, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.5],
    12: [2.0, 1.5, 1.3, 1.1, 1.0, 0.5, 0.5, 1.0, 1.1, 1.3, 1.5, 2.0, 2.5],
    16: [3.0, 2.0, 1.5, 1.3, 1.1, 1.0, 0.7, 0.5, 0.5, 0.7, 1.0, 1.1, 1.3, 1.5, 2.0, 3.0, 4.0],
  },
  medium: {
    8: [3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0],
    12: [5.0, 3.0, 1.5, 1.0, 0.7, 0.3, 0.3, 0.7, 1.0, 1.5, 3.0, 5.0, 7.0],
    16: [10, 5.0, 3.0, 2.0, 1.5, 1.0, 0.5, 0.3, 0.3, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10, 15],
  },
  high: {
    8: [10, 3.0, 1.0, 0.3, 0.1, 0.3, 1.0, 3.0, 10],
    12: [25, 10, 5.0, 2.0, 0.5, 0.2, 0.2, 0.5, 2.0, 5.0, 10, 25, 50],
    16: [100, 25, 10, 5.0, 2.0, 1.0, 0.3, 0.1, 0.1, 0.3, 1.0, 2.0, 5.0, 10, 25, 100, 200],
  },
};

const AdvancedPlinko: React.FC<Props> = ({ demoBalance, setDemoBalance }) => {
  const { colors } = useTheme();
  const [bet, setBet] = useState(0.05);
  const [rows, setRows] = useState<8 | 12 | 16>(12);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [ballCount, setBallCount] = useState(1);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lastWin, setLastWin] = useState<{ amount: number; multiplier: number } | null>(null);
  const [totalWin, setTotalWin] = useState(0);
  const [isDropping, setIsDropping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const ballIdRef = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);

  const multipliers = useMemo(() => MULTIPLIERS[risk][rows], [risk, rows]);
  const slots = multipliers.length;

  const canDrop = bet * ballCount <= demoBalance && !isDropping;

  const dropBall = useCallback(() => {
    const id = ++ballIdRef.current;
    let pos = Math.floor(slots / 2);

    const path: { x: number; y: number }[] = [];
    for (let r = 0; r <= rows; r++) {
      if (r > 0) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        pos = Math.max(0, Math.min(slots - 1, pos + dir));
      }
      path.push({ x: pos, y: r });
    }

    const finalSlot = pos;
    const mult = multipliers[finalSlot] ?? 0;

    const ball: Ball = {
      id,
      x: path[0].x,
      y: 0,
      targetSlot: finalSlot,
      done: false,
      multiplier: mult,
    };

    setBalls((prev) => [...prev, ball]);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= path.length) {
        clearInterval(interval);
        setBalls((prev) =>
          prev.map((b) => (b.id === id ? { ...b, done: true, x: path[path.length - 1].x, y: rows } : b))
        );
        const payout = bet * mult;
        setDemoBalance((v) => v + payout);
        setLastWin({ amount: payout, multiplier: mult });
        setTotalWin((v) => v + payout);
      } else {
        setBalls((prev) =>
          prev.map((b) => (b.id === id ? { ...b, x: path[step].x, y: step } : b))
        );
      }
    }, 80);

    return () => clearInterval(interval);
  }, [bet, multipliers, rows, setDemoBalance, slots]);

  const handleDrop = () => {
    if (!canDrop) return;
    setIsDropping(true);
    setTotalWin(0);
    setLastWin(null);
    setBalls([]);

    const totalCost = bet * ballCount;
    setDemoBalance((v) => v - totalCost);

    for (let i = 0; i < ballCount; i++) {
      setTimeout(() => {
        dropBall();
      }, i * 150);
    }

    setTimeout(() => {
      setIsDropping(false);
    }, ballCount * 150 + rows * 80 + 200);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBalls((prev) => prev.filter((b) => !b.done || Date.now() % 10000 < 5000));
    }, 3000);
    return () => clearTimeout(timeout);
  }, [balls]);

  const pegRows = useMemo(() => {
    const result: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const pegsInRow = r + 3;
      result.push(Array.from({ length: pegsInRow }, (_, i) => i));
    }
    return result;
  }, [rows]);

  const getMultiplierColor = (mult: number) => {
    if (mult >= 10) return 'from-yellow-400 to-orange-500';
    if (mult >= 3) return 'from-green-400 to-emerald-500';
    if (mult >= 1) return 'from-blue-400 to-cyan-500';
    return 'from-gray-500 to-gray-600';
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest opacity-60">Demo Balance</div>
          <div className="text-2xl font-black">{demoBalance.toFixed(4)} SOL</div>
        </div>
        <button
          onClick={() => setDemoBalance(() => 5)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold text-sm transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Last Win Display */}
      <AnimatePresence>
        {lastWin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center py-3 rounded-2xl border border-white/10"
            style={{ background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}10)` }}
          >
            <div className="text-xs font-bold uppercase tracking-widest opacity-60">Last Win</div>
            <div className="text-3xl font-black" style={{ color: colors.accent }}>
              +{lastWin.amount.toFixed(4)} SOL
            </div>
            <div className="text-sm font-bold opacity-70">{lastWin.multiplier.toFixed(2)}x</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plinko Board */}
      <div
        ref={boardRef}
        className="relative rounded-3xl border border-white/10 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${colors.surface}, ${colors.background})`,
          height: Math.max(320, rows * 24 + 120),
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${colors.glow}, transparent 60%)`,
          }}
        />

        {/* Pegs */}
        <div className="absolute inset-x-0 top-8 flex flex-col items-center gap-1" style={{ paddingBottom: 60 }}>
          {pegRows.map((pegs, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-2" style={{ width: '100%' }}>
              {pegs.map((_, pegIdx) => (
                <motion.div
                  key={pegIdx}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors.textMuted, opacity: 0.5 }}
                  whileHover={{ scale: 1.5, opacity: 1 }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Balls */}
        <AnimatePresence>
          {balls.map((ball) => {
            const slotWidth = 100 / slots;
            const xPos = (ball.x + 0.5) * slotWidth;
            const yPos = 8 + (ball.y / rows) * (rows * 20);

            return (
              <motion.div
                key={ball.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  left: `${xPos}%`,
                  top: yPos,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="absolute w-4 h-4 -ml-2 rounded-full z-10"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${colors.accent}, ${colors.primary})`,
                  boxShadow: `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow}`,
                }}
              />
            );
          })}
        </AnimatePresence>

        {/* Multiplier Slots */}
        <div
          className="absolute bottom-0 left-0 right-0 flex"
          style={{ padding: '0 8px 8px 8px' }}
        >
          {multipliers.map((mult, i) => (
            <motion.div
              key={i}
              className={`flex-1 mx-0.5 py-2 rounded-lg text-center text-xs font-black bg-gradient-to-b ${getMultiplierColor(mult)} shadow-lg`}
              whileHover={{ scale: 1.05, y: -2 }}
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {mult}x
            </motion.div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Bet Amount */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Bet Amount</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBet((v) => Math.max(0.01, v / 2))}
                className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-bold"
              >
                ½
              </button>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(0.01, Number(e.target.value)))}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-center font-bold"
                step={0.01}
                min={0.01}
              />
              <button
                onClick={() => setBet((v) => Math.min(demoBalance / ballCount, v * 2))}
                className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 font-bold"
              >
                2x
              </button>
            </div>
          </div>
        </div>

        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold text-sm transition-all"
        >
          <span>Game Settings</span>
          {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Expandable Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Risk Level */}
              <div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Risk Level</div>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRisk(r)}
                      className={`flex-1 px-4 py-2 rounded-xl border font-bold text-sm uppercase tracking-wider transition-all ${
                        risk === r
                          ? 'border-white/30 bg-white/15'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                      style={risk === r ? { color: colors.accent } : {}}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Rows</div>
                <div className="flex gap-2">
                  {([8, 12, 16] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRows(r)}
                      className={`flex-1 px-4 py-2 rounded-xl border font-bold text-sm transition-all ${
                        rows === r
                          ? 'border-white/30 bg-white/15'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                      style={rows === r ? { color: colors.accent } : {}}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ball Count */}
              <div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">
                  Balls per Drop: {ballCount}
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={ballCount}
                  onChange={(e) => setBallCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop Button */}
        <motion.button
          onClick={handleDrop}
          disabled={!canDrop}
          whileTap={{ scale: 0.97 }}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-lg flex items-center justify-center gap-3 transition-all ${
            canDrop
              ? 'text-white shadow-lg'
              : 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
          }`}
          style={
            canDrop
              ? {
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  boxShadow: `0 8px 32px ${colors.glow}`,
                }
              : {}
          }
        >
          <Zap className="w-5 h-5" />
          Drop {ballCount > 1 ? `${ballCount} Balls` : 'Ball'}
          <span className="text-sm opacity-70">({(bet * ballCount).toFixed(3)} SOL)</span>
        </motion.button>
      </div>
    </div>
  );
};

export default AdvancedPlinko;
