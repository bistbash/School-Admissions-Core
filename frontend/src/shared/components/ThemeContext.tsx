import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ColorPreset } from '../lib/colors';
import { getColorScheme, generateCSSVariables } from '../lib/colors';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  colorPreset: ColorPreset;
  setColorPreset: (preset: ColorPreset) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });

  const [colorPreset, setColorPresetState] = useState<ColorPreset>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('colorPreset') as ColorPreset) || 'default';
    }
    return 'default';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') return 'dark';
      if (stored === 'light') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Apply color scheme based on theme and preset
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let currentTheme: 'light' | 'dark';
    if (theme === 'system') {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(currentTheme);
      setResolvedTheme(currentTheme);
    } else {
      currentTheme = theme;
      root.classList.add(theme);
      setResolvedTheme(theme);
    }

    // Apply color scheme CSS variables
    const colorScheme = getColorScheme(currentTheme, colorPreset);
    const cssVars = generateCSSVariables(colorScheme);
    
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme, colorPreset]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(systemTheme);
        setResolvedTheme(systemTheme);
        
        // Reapply color scheme
        const colorScheme = getColorScheme(systemTheme, colorPreset);
        const cssVars = generateCSSVariables(colorScheme);
        Object.entries(cssVars).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
        });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, colorPreset]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  const setColorPreset = (preset: ColorPreset) => {
    setColorPresetState(preset);
    if (typeof window !== 'undefined') {
      localStorage.setItem('colorPreset', preset);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, colorPreset, setColorPreset }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
