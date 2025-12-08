import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { Button } from './Button';
import { cn } from '../lib/utils';
import type { ColorPreset } from '../lib/colors';
import { useState } from 'react';

const presetLabels: Record<ColorPreset, string> = {
  default: 'ברירת מחדל',
  'high-contrast': 'ניגודיות גבוהה',
  warm: 'חם',
  cool: 'קר',
  oled: 'OLED',
};

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme, colorPreset, setColorPreset } = useTheme();
  const [showPresets, setShowPresets] = useState(false);

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />;
    }
    return resolvedTheme === 'dark' ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );
  };

  const getLabel = () => {
    if (theme === 'system') return 'מערכת';
    return resolvedTheme === 'dark' ? 'כהה' : 'בהיר';
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          aria-label="Toggle theme"
          className={cn(
            'relative overflow-hidden transition-all duration-200',
            'hover:bg-gray-100 dark:hover:bg-[hsl(var(--secondary))]'
          )}
          title={`נושא: ${getLabel()}`}
        >
          <span className="relative z-10">{getIcon()}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowPresets(!showPresets)}
          aria-label="Color preset"
          className={cn(
            'relative overflow-hidden transition-all duration-200',
            'hover:bg-gray-100 dark:hover:bg-[hsl(var(--secondary))]',
            showPresets && 'bg-gray-100 dark:bg-[hsl(var(--secondary))]'
          )}
          title={`Preset: ${presetLabels[colorPreset]}`}
        >
          <Palette className="h-4 w-4" />
        </Button>
      </div>
      
      {showPresets && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPresets(false)}
          />
          <div className="absolute left-0 top-full mt-2 z-50 w-48 rounded-lg border border-gray-200 dark:border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--card))] shadow-lg p-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
              Preset צבעים
            </div>
            {(['default', 'high-contrast', 'warm', 'cool', 'oled'] as ColorPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setColorPreset(preset);
                  setShowPresets(false);
                }}
                className={cn(
                  'w-full text-right px-3 py-2 rounded-md text-sm transition-colors',
                  colorPreset === preset
                    ? 'bg-gray-100 dark:bg-[hsl(var(--secondary))] text-black dark:text-white font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[hsl(var(--muted))]'
                )}
              >
                {presetLabels[preset]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
