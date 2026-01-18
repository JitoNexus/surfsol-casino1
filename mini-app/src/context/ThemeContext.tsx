import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName = 'dark' | 'surf' | 'cyber' | 'gamble';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  gradient: string;
  glow: string;
}

const themes: Record<ThemeName, ThemeColors> = {
  dark: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#22d3ee',
    background: '#0a0a0f',
    surface: '#1a1a2e',
    text: '#ffffff',
    textMuted: '#9ca3af',
    gradient: 'from-indigo-600/20 via-purple-600/10 to-transparent',
    glow: 'rgba(99, 102, 241, 0.4)',
  },
  surf: {
    primary: '#0891b2',
    secondary: '#06b6d4',
    accent: '#64ffda',
    background: '#0c1929',
    surface: '#162d50',
    text: '#ffffff',
    textMuted: '#94a3b8',
    gradient: 'from-cyan-600/20 via-teal-600/10 to-transparent',
    glow: 'rgba(100, 255, 218, 0.4)',
  },
  cyber: {
    primary: '#f43f5e',
    secondary: '#ec4899',
    accent: '#fbbf24',
    background: '#0f0515',
    surface: '#1f0a2e',
    text: '#ffffff',
    textMuted: '#a78bfa',
    gradient: 'from-rose-600/20 via-pink-600/10 to-transparent',
    glow: 'rgba(244, 63, 94, 0.4)',
  },
  gamble: {
    primary: '#16a34a',
    secondary: '#22c55e',
    accent: '#fbbf24',
    background: '#0a1a0f',
    surface: '#1a2f1f',
    text: '#ffffff',
    textMuted: '#86efac',
    gradient: 'from-green-600/20 via-emerald-600/10 to-transparent',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
};

interface ThemeContextType {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('surfsol_theme') as ThemeName | null;
    return saved && themes[saved] ? saved : 'surf';
  });

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem('surfsol_theme', t);
  };

  useEffect(() => {
    const root = document.documentElement;
    const c = themes[theme];
    root.style.setProperty('--color-primary', c.primary);
    root.style.setProperty('--color-secondary', c.secondary);
    root.style.setProperty('--color-accent', c.accent);
    root.style.setProperty('--color-background', c.background);
    root.style.setProperty('--color-surface', c.surface);
    root.style.setProperty('--color-text', c.text);
    root.style.setProperty('--color-text-muted', c.textMuted);
    root.style.setProperty('--color-glow', c.glow);
    document.body.style.backgroundColor = c.background;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, colors: themes[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export { themes };
