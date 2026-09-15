import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
  setMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('app_theme') as ThemeMode;
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const applyThemeClass = (targetMode: ThemeMode) => {
    const root = document.documentElement;
    if (targetMode === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  };

  const setMode = (newMode: ThemeMode) => {
    try {
      localStorage.setItem('app_theme', newMode);
    } catch {}
    setModeState(newMode);
    applyThemeClass(newMode);
  };

  const toggleTheme = () => {
    setModeState((prev) => {
      const nextMode = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('app_theme', nextMode);
      } catch {}
      applyThemeClass(nextMode);
      return nextMode;
    });
  };

  useEffect(() => {
    applyThemeClass(mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
