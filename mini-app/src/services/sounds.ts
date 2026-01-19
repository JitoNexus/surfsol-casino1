import { Howl, Howler } from 'howler';

// Sound effects for Plinko
const sounds = {
  drop: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'],
    volume: 0.3,
  }),
  peg: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3'],
    volume: 0.15,
    rate: 1.5,
  }),
  win: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'],
    volume: 0.75,
  }),
  bigWin: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'],
    volume: 0.85,
  }),
  lose: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2656/2656-preview.mp3'],
    volume: 0.25,
  }),
  click: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'],
    volume: 0.2,
  }),
};

// Theme-specific background music
const themeMusicUrls: Record<string, string> = {
  dark: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
  surf: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3',
  cyber: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
  gamble: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3',
};

let currentBgMusic: Howl | null = null;
let currentTheme: string = '';

let audioUnlocked = false;
let sfxEnabled = true;

export const unlockAudio = async (): Promise<boolean> => {
  try {
    if (audioUnlocked) return true;
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    audioUnlocked = true;
    return true;
  } catch (e) {
    console.warn('Audio unlock failed:', e);
    return false;
  }
};

export const setSfxEnabled = (enabled: boolean) => {
  sfxEnabled = enabled;
};

export const playSound = (name: keyof typeof sounds) => {
  if (!sfxEnabled) return;
  try {
    sounds[name].play();
  } catch (e) {
    console.warn('Sound play failed:', e);
  }
};

export const playPegHit = () => {
  if (!sfxEnabled) return;
  // Randomize pitch slightly for variety
  sounds.peg.rate(1.3 + Math.random() * 0.4);
  sounds.peg.play();
};

export const playResult = (multiplier: number) => {
  if (!sfxEnabled) return;
  if (multiplier >= 10) {
    sounds.bigWin.play();
  } else if (multiplier >= 1) {
    sounds.win.play();
  } else {
    sounds.lose.play();
  }
};

export const startThemeMusic = (theme: string, volume: number = 0.15) => {
  // Don't restart if same theme
  if (currentTheme === theme && currentBgMusic) {
    return;
  }

  void unlockAudio();

  // Stop current music
  if (currentBgMusic) {
    currentBgMusic.fade(currentBgMusic.volume(), 0, 500);
    setTimeout(() => {
      currentBgMusic?.stop();
      currentBgMusic = null;
    }, 500);
  }

  const url = themeMusicUrls[theme];
  if (!url) return;

  currentTheme = theme;
  currentBgMusic = new Howl({
    src: [url],
    volume: 0,
    loop: true,
    html5: true,
  });

  try {
    currentBgMusic.play();
  } catch (e) {
    console.warn('Music play failed:', e);
  }
  currentBgMusic.fade(0, volume, 1000);
};

export const stopThemeMusic = () => {
  if (currentBgMusic) {
    currentBgMusic.fade(currentBgMusic.volume(), 0, 500);
    setTimeout(() => {
      currentBgMusic?.stop();
      currentBgMusic = null;
      currentTheme = '';
    }, 500);
  }
};

export const setMusicVolume = (volume: number) => {
  if (currentBgMusic) {
    currentBgMusic.volume(volume);
  }
};

export const isMusicPlaying = () => {
  return currentBgMusic?.playing() ?? false;
};
