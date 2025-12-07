import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

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
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label="Toggle theme"
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'hover:bg-gray-100 dark:hover:bg-[#0F0F0F]'
      )}
      title={`נושא: ${getLabel()}`}
    >
      <span className="relative z-10">{getIcon()}</span>
    </Button>
  );
}
