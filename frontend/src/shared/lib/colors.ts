/**
 * Smart Color System with Presets
 * Provides efficient color management with semantic naming and presets
 */

export type ColorPreset = 'default' | 'high-contrast' | 'warm' | 'cool' | 'oled';

export interface ColorScheme {
  // Background colors
  background: string;
  surface: string;
  surfaceElevated: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Border colors
  border: string;
  borderSubtle: string;
  
  // Interactive colors
  primary: string;
  primaryHover: string;
  secondary: string;
  secondaryHover: string;
  
  // State colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Input colors
  input: string;
  inputFocus: string;
  
  // Muted colors
  muted: string;
  mutedForeground: string;
  
  // Accent colors
  accent: string;
  accentForeground: string;
}

/**
 * Light mode color presets
 */
export const lightColorPresets: Record<ColorPreset, ColorScheme> = {
  default: {
    background: '0 0% 100%', // Pure white
    surface: '0 0% 98%', // Very light gray
    surfaceElevated: '0 0% 100%', // White
    textPrimary: '0 0% 0%', // Black
    textSecondary: '0 0% 20%', // Dark gray
    textMuted: '0 0% 40%', // Medium gray
    border: '0 0% 90%', // Light gray
    borderSubtle: '0 0% 95%', // Very light gray
    primary: '0 0% 0%', // Black
    primaryHover: '0 0% 10%', // Dark gray
    secondary: '0 0% 96%', // Very light gray
    secondaryHover: '0 0% 90%', // Light gray
    success: '142 76% 36%', // Green
    warning: '38 92% 50%', // Orange
    error: '0 84% 60%', // Red
    info: '217 91% 60%', // Blue
    input: '0 0% 90%', // Light gray
    inputFocus: '0 0% 0%', // Black
    muted: '0 0% 96%', // Very light gray
    mutedForeground: '0 0% 40%', // Medium gray
    accent: '0 0% 96%', // Very light gray
    accentForeground: '0 0% 0%', // Black
  },
  'high-contrast': {
    background: '0 0% 100%',
    surface: '0 0% 98%',
    surfaceElevated: '0 0% 100%',
    textPrimary: '0 0% 0%',
    textSecondary: '0 0% 10%',
    textMuted: '0 0% 30%',
    border: '0 0% 85%',
    borderSubtle: '0 0% 92%',
    primary: '0 0% 0%',
    primaryHover: '0 0% 5%',
    secondary: '0 0% 94%',
    secondaryHover: '0 0% 88%',
    success: '142 76% 30%',
    warning: '38 92% 45%',
    error: '0 84% 55%',
    info: '217 91% 55%',
    input: '0 0% 88%',
    inputFocus: '0 0% 0%',
    muted: '0 0% 94%',
    mutedForeground: '0 0% 30%',
    accent: '0 0% 94%',
    accentForeground: '0 0% 0%',
  },
  warm: {
    background: '0 0% 100%',
    surface: '30 10% 98%',
    surfaceElevated: '0 0% 100%',
    textPrimary: '0 0% 5%',
    textSecondary: '30 5% 20%',
    textMuted: '30 5% 40%',
    border: '30 10% 88%',
    borderSubtle: '30 10% 94%',
    primary: '30 80% 50%',
    primaryHover: '30 80% 45%',
    secondary: '30 10% 96%',
    secondaryHover: '30 10% 90%',
    success: '142 60% 40%',
    warning: '38 85% 55%',
    error: '0 75% 55%',
    info: '217 80% 55%',
    input: '30 10% 90%',
    inputFocus: '30 80% 50%',
    muted: '30 10% 96%',
    mutedForeground: '30 5% 40%',
    accent: '30 20% 95%',
    accentForeground: '30 80% 50%',
  },
  cool: {
    background: '0 0% 100%',
    surface: '220 10% 98%',
    surfaceElevated: '0 0% 100%',
    textPrimary: '220 20% 5%',
    textSecondary: '220 10% 20%',
    textMuted: '220 10% 40%',
    border: '220 10% 88%',
    borderSubtle: '220 10% 94%',
    primary: '220 80% 50%',
    primaryHover: '220 80% 45%',
    secondary: '220 10% 96%',
    secondaryHover: '220 10% 90%',
    success: '142 60% 40%',
    warning: '38 85% 55%',
    error: '0 75% 55%',
    info: '217 80% 55%',
    input: '220 10% 90%',
    inputFocus: '220 80% 50%',
    muted: '220 10% 96%',
    mutedForeground: '220 10% 40%',
    accent: '220 20% 95%',
    accentForeground: '220 80% 50%',
  },
  oled: {
    background: '0 0% 100%',
    surface: '0 0% 98%',
    surfaceElevated: '0 0% 100%',
    textPrimary: '0 0% 0%',
    textSecondary: '0 0% 20%',
    textMuted: '0 0% 40%',
    border: '0 0% 90%',
    borderSubtle: '0 0% 95%',
    primary: '0 0% 0%',
    primaryHover: '0 0% 10%',
    secondary: '0 0% 96%',
    secondaryHover: '0 0% 90%',
    success: '142 76% 36%',
    warning: '38 92% 50%',
    error: '0 84% 60%',
    info: '217 91% 60%',
    input: '0 0% 90%',
    inputFocus: '0 0% 0%',
    muted: '0 0% 96%',
    mutedForeground: '0 0% 40%',
    accent: '0 0% 96%',
    accentForeground: '0 0% 0%',
  },
};

/**
 * Dark mode color presets
 */
export const darkColorPresets: Record<ColorPreset, ColorScheme> = {
  default: {
    background: '0 0% 0%', // Pure black
    surface: '0 0% 3%', // Very dark, almost black
    surfaceElevated: '0 0% 5%', // Slightly lighter
    textPrimary: '0 0% 98%', // Almost white
    textSecondary: '0 0% 85%', // Light gray
    textMuted: '0 0% 65%', // Medium gray
    border: '0 0% 12%', // Dark gray, visible on black
    borderSubtle: '0 0% 8%', // Very dark gray
    primary: '0 0% 98%', // Almost white
    primaryHover: '0 0% 90%', // Light gray
    secondary: '0 0% 8%', // Very dark
    secondaryHover: '0 0% 12%', // Dark gray
    success: '142 70% 45%', // Green
    warning: '38 85% 55%', // Orange
    error: '0 75% 55%', // Red
    info: '217 85% 60%', // Blue
    input: '0 0% 5%', // Very dark
    inputFocus: '0 0% 98%', // Almost white
    muted: '0 0% 5%', // Very dark
    mutedForeground: '0 0% 65%', // Medium gray
    accent: '0 0% 8%', // Very dark
    accentForeground: '0 0% 98%', // Almost white
  },
  'high-contrast': {
    background: '0 0% 0%',
    surface: '0 0% 2%',
    surfaceElevated: '0 0% 4%',
    textPrimary: '0 0% 100%', // Pure white
    textSecondary: '0 0% 90%', // Very light gray
    textMuted: '0 0% 70%', // Light gray
    border: '0 0% 15%', // Dark gray
    borderSubtle: '0 0% 10%', // Very dark gray
    primary: '0 0% 100%', // Pure white
    primaryHover: '0 0% 95%', // Almost white
    secondary: '0 0% 10%', // Very dark
    secondaryHover: '0 0% 15%', // Dark gray
    success: '142 75% 50%',
    warning: '38 90% 60%',
    error: '0 80% 60%',
    info: '217 90% 65%',
    input: '0 0% 4%',
    inputFocus: '0 0% 100%',
    muted: '0 0% 4%',
    mutedForeground: '0 0% 70%',
    accent: '0 0% 10%',
    accentForeground: '0 0% 100%',
  },
  warm: {
    background: '0 0% 0%',
    surface: '30 5% 3%',
    surfaceElevated: '30 5% 5%',
    textPrimary: '0 0% 98%',
    textSecondary: '30 5% 85%',
    textMuted: '30 5% 65%',
    border: '30 10% 12%',
    borderSubtle: '30 10% 8%',
    primary: '30 80% 60%', // Warm orange
    primaryHover: '30 80% 65%',
    secondary: '30 5% 8%',
    secondaryHover: '30 5% 12%',
    success: '142 65% 50%',
    warning: '38 85% 60%',
    error: '0 75% 60%',
    info: '217 80% 60%',
    input: '30 5% 5%',
    inputFocus: '30 80% 60%',
    muted: '30 5% 5%',
    mutedForeground: '30 5% 65%',
    accent: '30 10% 8%',
    accentForeground: '30 80% 60%',
  },
  cool: {
    background: '0 0% 0%',
    surface: '220 5% 3%',
    surfaceElevated: '220 5% 5%',
    textPrimary: '0 0% 98%',
    textSecondary: '220 5% 85%',
    textMuted: '220 5% 65%',
    border: '220 10% 12%',
    borderSubtle: '220 10% 8%',
    primary: '220 80% 60%', // Cool blue
    primaryHover: '220 80% 65%',
    secondary: '220 5% 8%',
    secondaryHover: '220 5% 12%',
    success: '142 65% 50%',
    warning: '38 85% 60%',
    error: '0 75% 60%',
    info: '217 80% 60%',
    input: '220 5% 5%',
    inputFocus: '220 80% 60%',
    muted: '220 5% 5%',
    mutedForeground: '220 5% 65%',
    accent: '220 10% 8%',
    accentForeground: '220 80% 60%',
  },
  oled: {
    // True black for OLED screens - saves battery
    background: '0 0% 0%', // Pure black
    surface: '0 0% 0%', // Pure black
    surfaceElevated: '0 0% 2%', // Almost black
    textPrimary: '0 0% 98%', // Almost white
    textSecondary: '0 0% 80%', // Light gray
    textMuted: '0 0% 60%', // Medium gray
    border: '0 0% 10%', // Dark gray
    borderSubtle: '0 0% 5%', // Very dark gray
    primary: '0 0% 98%', // Almost white
    primaryHover: '0 0% 95%', // Light gray
    secondary: '0 0% 0%', // Pure black
    secondaryHover: '0 0% 5%', // Very dark
    success: '142 70% 50%',
    warning: '38 85% 58%',
    error: '0 75% 58%',
    info: '217 85% 62%',
    input: '0 0% 0%', // Pure black
    inputFocus: '0 0% 98%', // Almost white
    muted: '0 0% 0%', // Pure black
    mutedForeground: '0 0% 60%', // Medium gray
    accent: '0 0% 0%', // Pure black
    accentForeground: '0 0% 98%', // Almost white
  },
};

/**
 * Get color scheme for current theme and preset
 */
export function getColorScheme(theme: 'light' | 'dark', preset: ColorPreset = 'default'): ColorScheme {
  return theme === 'light' ? lightColorPresets[preset] : darkColorPresets[preset];
}

/**
 * Convert HSL color to CSS variable format
 */
export function hslToCSSVar(hsl: string): string {
  return `hsl(${hsl})`;
}

/**
 * Generate CSS variables from color scheme
 * Efficiently maps semantic color scheme to CSS variables
 */
export function generateCSSVariables(scheme: ColorScheme): Record<string, string> {
  return {
    '--background': scheme.background,
    '--foreground': scheme.textPrimary,
    '--card': scheme.surface,
    '--card-foreground': scheme.textPrimary,
    '--border': scheme.border,
    '--input': scheme.input,
    '--primary': scheme.primary,
    '--primary-foreground': scheme.primaryHover,
    '--secondary': scheme.secondary,
    '--secondary-foreground': scheme.textPrimary,
    '--muted': scheme.muted,
    '--muted-foreground': scheme.mutedForeground,
    '--accent': scheme.accent,
    '--accent-foreground': scheme.accentForeground,
    '--destructive': scheme.error,
    '--destructive-foreground': scheme.textPrimary,
    '--ring': scheme.primary,
    // Semantic color tokens for direct use
    '--success': scheme.success,
    '--warning': scheme.warning,
    '--error': scheme.error,
    '--info': scheme.info,
  };
}
