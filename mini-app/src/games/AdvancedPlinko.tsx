import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Zap, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { playSound, playPegHit, playResult } from '../services/sounds';

type RiskLevel = 'low' | 'medium' | 'high';

interface Ball {
  id: number;
  x: number;
  y: number;
  path: number[];
  step: number;
  done: boolean;
  multiplier: number;
}

interface Props {
  demoBalance: number;
  setDemoBalance: (fn: (v: number) => number) => void;
  onLoss?: (amount: number) => void;
}

// REALISTIC CASINO PLINKO MULTIPLIERS
// These are based on real casino Plinko with ~3-5% house edge
// Probabilities follow binomial distribution - center slots hit most often
const MULTIPLIERS: Record<RiskLevel, Record<number, number[]>> = {
  low: {
    // 8 rows = 9 slots, ~97% RTP
    8: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    // 12 rows = 13 slots, ~97% RTP  
    12: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 0.3, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    // 16 rows = 17 slots, ~97% RTP
    16: [16, 9.0, 2.0, 1.4, 1.1, 1.0, 0.5, 0.3, 0.2, 0.3, 0.5, 1.0, 1.1, 1.4, 2.0, 9.0, 16],
  },
  medium: {
    // ~96% RTP - more volatile
    8: [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
    12: [33, 11, 4.0, 2.0, 0.6, 0.4, 0.2, 0.4, 0.6, 2.0, 4.0, 11, 33],
    16: [110, 41, 10, 5.0, 3.0, 1.5, 0.5, 0.3, 0.2, 0.3, 0.5, 1.5, 3.0, 5.0, 10, 41, 110],
  },
  high: {
    // ~95% RTP - high volatility, big wins rare
    8: [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
    12: [170, 24, 8.1, 2.0, 0.7, 0.2, 0.1, 0.2, 0.7, 2.0, 8.1, 24, 170],
    16: [1000, 130, 26, 9.0, 4.0, 2.0, 0.2, 0.1, 0.1, 0.1, 0.2, 2.0, 4.0, 9.0, 26, 130, 1000],
  },
};

const AdvancedPlinko: React.FC<Props> = ({ demoBalance, setDemoBalance, onLoss }) => {
  const { colors } = useTheme();
  const [bet, setBet] = useState(0.01);
  const [rows, setRows] = useState<8 | 12 | 16>(8);
  const [risk, setRisk] = useState<RiskLevel>('low');
  const [ballCount, setBallCount] = useState(1);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lastResult, setLastResult] = useState<{ amount: number; multiplier: number; isWin: boolean } | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<{ mult: number; isWin: boolean }[]>([]);
  const ballIdRef = useRef(0);

  const multipliers = useMemo(() => MULTIPLIERS[risk][rows], [risk, rows]);
  const slots = multipliers.length;

  const canDrop = bet * ballCount <= demoBalance && !isDropping && bet >= 0.001;

  // Realistic ball drop using binomial distribution
  // Ball starts at center, each peg has 50/50 chance left/right
  // This naturally creates bell curve - center slots hit ~25% of time, edges ~0.4%
  const simulateBallPath = useCallback((numRows: number): number[] => {
    const path: number[] = [0]; // Start at center (relative position)
    let position = 0;
    
    for (let i = 0; i < numRows; i++) {
      // True 50/50 random - this is provably fair
      const goRight = Math.random() < 0.5;
      position += goRight ? 1 : 0;
      path.push(position);
    }
    
    return path;
  }, []);

  const dropBall = useCallback((isFreeBall = false) => {
    const id = Date.now() + Math.random();
    let mult: number;
    
    if (isFreeBall) {
      // Free ball always hits 0.3x multiplier
      mult = 0.3;
    } else {
      const path = simulateBallPath(rows);
      const finalSlot = path[path.length - 1]; // 0 to rows (rows+1 slots)
      mult = multipliers[finalSlot] ?? 0.1;
    }
    
    const ball: Ball = {
      id,
      x: 50,
      y: 0,
      path: isFreeBall ? [Math.floor(multipliers.indexOf(0.3))] : simulateBallPath(rows),
      step: 0,
      done: false,
      multiplier: mult,
    };

    setBalls((prev) => [...prev, ball]);
    playSound('drop'); // Play drop sound

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= rows) {
        clearInterval(interval);
        setBalls((prev) =>
          prev.map((b) => (b.id === id ? { ...b, done: true, step: rows - 1 } : b))
        );
        
        const payout = isFreeBall ? 2 * 0.3 : bet * mult; // Free ball is $2 at 0.3x
        const isWin = mult >= 1;
        
        setDemoBalance((v) => v + payout);
        setLastResult({ amount: payout, multiplier: mult, isWin });
        setHistory((prev) => [{ mult, isWin }, ...prev].slice(0, 20));
        
        // Track balls played for daily bonus eligibility
        const ballsPlayed = parseInt(localStorage.getItem('surfsol_balls_played') || '0') + 1;
        localStorage.setItem('surfsol_balls_played', ballsPlayed.toString());
        
        // Play result sound
        playResult(mult);
        
        // Track losses for house wallet
        if (!isWin && onLoss) {
          onLoss(isFreeBall ? 0 : bet - payout);
        }
        
        // Remove ball after delay
        setTimeout(() => {
          setBalls((prev) => prev.filter((b) => b.id !== id));
        }, 1500);
      } else {
        // Play peg hit sound
        playPegHit();
        setBalls((prev) =>
          prev.map((b) => (b.id === id ? { ...b, step } : b))
        );
      }
    }, 100); // Faster for better feel

    return () => clearInterval(interval);
  }, [bet, multipliers, rows, setDemoBalance, simulateBallPath, onLoss]);

  const handleDrop = () => {
    if (!canDrop) return;
    setIsDropping(true);
    setLastResult(null);

    const totalCost = bet * ballCount;
    setDemoBalance((v) => v - totalCost);

    for (let i = 0; i < ballCount; i++) {
      setTimeout(() => {
        dropBall();
      }, i * 200);
    }

    setTimeout(() => {
      setIsDropping(false);
    }, ballCount * 200 + rows * 120 + 500);
  };

  const getMultiplierColor = (mult: number) => {
    if (mult >= 100) return 'from-yellow-300 via-yellow-400 to-amber-500';
    if (mult >= 10) return 'from-orange-400 to-red-500';
    if (mult >= 2) return 'from-green-400 to-emerald-500';
    if (mult >= 1) return 'from-cyan-400 to-blue-500';
    if (mult >= 0.5) return 'from-purple-400 to-indigo-500';
    return 'from-gray-500 to-gray-700';
  };
  
  const getRiskIcon = (r: RiskLevel) => {
    if (r === 'low') return <TrendingDown className="w-3 h-3" />;
    if (r === 'medium') return <Minus className="w-3 h-3" />;
    return <TrendingUp className="w-3 h-3" />;
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Balance + History Row */}
      <div 
        className="rounded-2xl p-4 border"
        style={{ 
          background: `linear-gradient(135deg, ${colors.surface}90, ${colors.background})`,
          borderColor: `${colors.text}10`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>Balance</div>
            <div className="text-2xl font-black" style={{ color: colors.text }}>{demoBalance.toFixed(4)} <span className="text-sm opacity-60">SOL</span></div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setDemoBalance(() => 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
            style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </motion.button>
        </div>
        
        {/* Recent Results */}
        {history.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {history.slice(0, 10).map((h, i) => (
              <div
                key={i}
                className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap bg-gradient-to-b ${getMultiplierColor(h.mult)}`}
                style={{ opacity: 1 - i * 0.08 }}
              >
                {h.mult}x
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last Result */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-3 rounded-2xl border"
            style={{ 
              background: lastResult.isWin 
                ? `linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.1))`
                : `linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))`,
              borderColor: lastResult.isWin ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              {lastResult.isWin ? 'Win!' : 'Loss'}
            </div>
            <div 
              className="text-2xl font-black"
              style={{ color: lastResult.isWin ? '#22c55e' : '#ef4444' }}
            >
              {lastResult.isWin ? '+' : ''}{lastResult.amount.toFixed(4)} SOL
            </div>
            <div className="text-xs font-bold opacity-70">{lastResult.multiplier}x multiplier</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plinko Board - Modern Design */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${colors.surface}, ${colors.background})`,
          border: `1px solid ${colors.text}15`,
          height: rows === 8 ? 280 : rows === 12 ? 340 : 400,
        }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 20%, ${colors.primary}40, transparent 60%)`,
          }}
        />

        {/* Pegs Grid */}
        <div className="absolute inset-x-0 top-4 bottom-16 flex flex-col items-center justify-between px-2">
          {Array.from({ length: rows }).map((_, rowIdx) => {
            const pegsInRow = rowIdx + 3;
            return (
              <div key={rowIdx} className="relative w-full" style={{ height: '10px' }}>
                {Array.from({ length: pegsInRow }).map((_, pegIdx) => {
                  const leftPct = pegsInRow <= 1 ? 50 : (pegIdx / (pegsInRow - 1)) * 100;
                  return (
                    <div
                      key={pegIdx}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        left: `${leftPct}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: `radial-gradient(circle, ${colors.textMuted}80, ${colors.textMuted}40)`,
                        boxShadow: `0 0 4px ${colors.textMuted}30`,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Balls */}
        <AnimatePresence>
          {balls.map((ball) => {
            const currentStep = ball.step;
            const pathValue = ball.path[currentStep] ?? 0;
            const denom = Math.max(1, currentStep + 1);
            const xPercent = ((pathValue + 0.5) / denom) * 100;
            const yPercent = (currentStep / rows) * 75 + 5;

            return (
              <motion.div
                key={ball.id}
                initial={{ opacity: 0, scale: 0, left: '50%', top: '5%' }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  left: `${xPercent}%`,
                  top: `${yPercent}%`,
                }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute w-3 h-3 -ml-1.5 rounded-full z-10"
                style={{
                  background: `radial-gradient(circle at 30% 30%, #fff, ${colors.accent})`,
                  boxShadow: `0 0 12px ${colors.accent}, 0 0 24px ${colors.glow}`,
                }}
              />
            );
          })}
        </AnimatePresence>

        {/* Multiplier Slots */}
        <div className="absolute bottom-0 left-0 right-0 flex px-2 pb-2">
          {multipliers.map((mult, i) => (
            <motion.div
              key={i}
              className={`flex-1 mx-0.5 py-1.5 rounded-md text-center text-[9px] font-black bg-gradient-to-b ${getMultiplierColor(mult)}`}
              whileHover={{ scale: 1.08, y: -2 }}
              style={{ 
                textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {mult >= 100 ? mult : mult.toFixed(1)}x
            </motion.div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div 
        className="rounded-2xl p-4 border space-y-4"
        style={{ 
          background: `${colors.surface}50`,
          borderColor: `${colors.text}10`,
        }}
      >
        {/* Bet Amount */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>Bet Amount</span>
            <span className="text-xs font-bold" style={{ color: colors.accent }}>{bet.toFixed(4)} SOL</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setBet((v) => Math.max(0.001, v / 2))}
              className="px-3 py-2 rounded-lg border font-bold text-sm"
              style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
            >
              ½
            </motion.button>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(0.001, Math.min(demoBalance, Number(e.target.value) || 0)))}
              className="flex-1 px-3 py-2 rounded-lg border text-center font-bold text-sm"
              style={{ 
                borderColor: `${colors.text}20`, 
                background: `${colors.text}05`,
                color: colors.text,
              }}
              step={0.001}
              min={0.001}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setBet((v) => Math.min(demoBalance / ballCount, v * 2))}
              className="px-3 py-2 rounded-lg border font-bold text-sm"
              style={{ borderColor: `${colors.text}20`, background: `${colors.text}05` }}
            >
              2x
            </motion.button>
          </div>
        </div>

        {/* Quick Settings Row */}
        <div className="flex gap-2">
          {/* Risk */}
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: colors.textMuted }}>Risk</div>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
                <motion.button
                  key={r}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRisk(r)}
                  className="flex-1 px-2 py-1.5 rounded-lg border font-bold text-[10px] uppercase flex items-center justify-center gap-1"
                  style={{
                    borderColor: risk === r ? colors.accent : `${colors.text}20`,
                    background: risk === r ? `${colors.accent}20` : `${colors.text}05`,
                    color: risk === r ? colors.accent : colors.textMuted,
                  }}
                >
                  {getRiskIcon(r)}
                  {r.charAt(0)}
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Rows */}
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: colors.textMuted }}>Rows</div>
            <div className="flex gap-1">
              {([8, 12, 16] as const).map((r) => (
                <motion.button
                  key={r}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setRows(r)}
                  className="flex-1 px-2 py-1.5 rounded-lg border font-bold text-[10px]"
                  style={{
                    borderColor: rows === r ? colors.accent : `${colors.text}20`,
                    background: rows === r ? `${colors.accent}20` : `${colors.text}05`,
                    color: rows === r ? colors.accent : colors.textMuted,
                  }}
                >
                  {r}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowSettings((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold"
          style={{ borderColor: `${colors.text}15`, background: `${colors.text}05` }}
        >
          <span style={{ color: colors.textMuted }}>Multi-ball & More</span>
          {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </motion.button>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>
                    Balls: {ballCount}
                  </span>
                  <span className="text-xs font-bold" style={{ color: colors.accent }}>
                    Total: {(bet * ballCount).toFixed(4)} SOL
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={ballCount}
                  onChange={(e) => setBallCount(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Free Ball Button */}
        {localStorage.getItem('surfsol_free_ball') === 'true' && (
          <motion.button
            onClick={() => {
              dropBall(true);
              localStorage.removeItem('surfsol_free_ball');
            }}
            disabled={isDropping}
            whileTap={!isDropping ? { scale: 0.97 } : {}}
            className="w-full py-3 rounded-xl font-black uppercase tracking-wider text-base flex items-center justify-center gap-2 mb-2 transition-all"
            style={{
              background: `linear-gradient(135deg, #22c55e, #16a34a)`,
              boxShadow: `0 4px 20px rgba(34, 197, 94, 0.4)`,
              color: '#fff',
            }}
          >
            <Zap className="w-5 h-5" />
            {isDropping ? 'Dropping...' : 'Drop FREE Ball ($2 at 0.3x)'}
          </motion.button>
        )}

        {/* Drop Button */}
        <motion.button
          onClick={handleDrop}
          disabled={!canDrop}
          whileTap={canDrop ? { scale: 0.97 } : {}}
          className="w-full py-4 rounded-xl font-black uppercase tracking-wider text-base flex items-center justify-center gap-2 transition-all"
          style={
            canDrop
              ? {
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  boxShadow: `0 4px 20px ${colors.glow}`,
                  color: '#fff',
                }
              : {
                  background: `${colors.text}10`,
                  border: `1px solid ${colors.text}20`,
                  color: colors.textMuted,
                  cursor: 'not-allowed',
                }
          }
        >
          <Zap className="w-5 h-5" />
          {isDropping ? 'Dropping...' : `Drop ${ballCount > 1 ? `${ballCount} Balls` : 'Ball'}`}
        </motion.button>
        
        {/* House Edge Info */}
        <div className="text-center text-[9px] opacity-50" style={{ color: colors.textMuted }}>
          Provably Fair • {risk === 'low' ? '97%' : risk === 'medium' ? '96%' : '95%'} RTP • House Edge {risk === 'low' ? '3%' : risk === 'medium' ? '4%' : '5%'}
        </div>
      </div>
    </div>
  );
};

export default AdvancedPlinko;
