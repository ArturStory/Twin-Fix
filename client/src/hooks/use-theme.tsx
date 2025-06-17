import { useTheme as useNextTheme } from 'next-themes';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useNextTheme();
  
  return { 
    theme: theme as Theme, 
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    systemTheme,
    resolvedTheme
  };
}