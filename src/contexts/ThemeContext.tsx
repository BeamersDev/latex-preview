import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '@/types';
import { THEMES, getSystemTheme } from '@/themes';

interface ThemeContextType {
  currentTheme: Theme;
  themeName: string;
  setTheme: (name: string) => void;
  followSystem: boolean;
  setFollowSystem: (follow: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyTheme(name: string) {
  // Remove all theme classes
  THEMES.forEach((t) => document.documentElement.classList.remove(`theme-${t.name}`));
  document.documentElement.classList.add(`theme-${name}`);
}

function getStoredTheme(): string {
  try {
    return localStorage.getItem('latex-preview-theme') || '';
  } catch {
    return '';
  }
}

function storeTheme(name: string) {
  try {
    localStorage.setItem('latex-preview-theme', name);
  } catch { /* noop */ }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<string>(() => {
    const stored = getStoredTheme();
    if (stored && THEMES.some((t) => t.name === stored)) return stored;
    return 'dracula';
  });
  const [followSystem, setFollowSystemState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('latex-preview-follow-system') === 'true';
    } catch {
      return false;
    }
  });

  const currentTheme = THEMES.find((t) => t.name === themeName) || THEMES[0];

  const setTheme = (name: string) => {
    setThemeName(name);
    storeTheme(name);
    applyTheme(name);
  };

  const setFollowSystem = (follow: boolean) => {
    setFollowSystemState(follow);
    try {
      localStorage.setItem('latex-preview-follow-system', String(follow));
    } catch { /* noop */ }
  };

  useEffect(() => {
    applyTheme(themeName);
  }, [themeName]);

  useEffect(() => {
    if (!followSystem) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const type = getSystemTheme();
      const t = THEMES.find((th) => th.type === type);
      if (t) setTheme(t.name);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [followSystem]);

  return (
    <ThemeContext.Provider value={{ currentTheme, themeName, setTheme, followSystem, setFollowSystem }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
