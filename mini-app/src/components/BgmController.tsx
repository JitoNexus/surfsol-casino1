import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Howl } from 'howler';
import { Volume2, VolumeX } from 'lucide-react';

type Props = {
  bgmUrl?: string;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const BgmController: React.FC<Props> = ({ bgmUrl }) => {
  const url = useMemo(() => {
    const fromEnv = (import.meta.env.VITE_BGM_URL as string | undefined) || undefined;
    return bgmUrl || fromEnv || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  }, [bgmUrl]);

  const [enabled, setEnabled] = useState<boolean>(() => localStorage.getItem('surfsol_music') === '1');
  const [volume, setVolume] = useState<number>(() => {
    const v = Number(localStorage.getItem('surfsol_music_volume') || '0.25');
    return clamp01(Number.isFinite(v) ? v : 0.25);
  });

  const howlRef = useRef<Howl | null>(null);

  useEffect(() => {
    localStorage.setItem('surfsol_music', enabled ? '1' : '0');
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem('surfsol_music_volume', String(volume));
    if (howlRef.current) howlRef.current.volume(volume);
  }, [volume]);

  useEffect(() => {
    if (!enabled) {
      if (howlRef.current) {
        howlRef.current.stop();
        howlRef.current.unload();
        howlRef.current = null;
      }
      return;
    }

    if (!howlRef.current) {
      howlRef.current = new Howl({
        src: [url],
        loop: true,
        volume,
        html5: true,
      });
      howlRef.current.play();
    }

    return () => {
      if (howlRef.current) {
        howlRef.current.stop();
        howlRef.current.unload();
        howlRef.current = null;
      }
    };
  }, [enabled, url, volume]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setEnabled(v => !v)}
        className="bg-surfsol-darker/50 hover:bg-surfsol-darker/70 px-3 py-2 rounded-full border border-white/10"
        aria-label={enabled ? 'Disable music' : 'Enable music'}
      >
        {enabled ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white" />}
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setVolume(clamp01(Number(e.target.value)))}
        className="w-20"
        aria-label="Music volume"
      />
    </div>
  );
};

export default BgmController;
