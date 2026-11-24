import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode): 'light' | 'dark' {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  if (typeof document !== 'undefined') {
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  return resolved;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = (
    typeof window !== 'undefined'
      ? (localStorage.getItem('teamos_theme') as ThemeMode) || 'system'
      : 'system'
  ) as ThemeMode;

  const initialResolved = applyTheme(initialTheme);

  // Listen for OS system theme changes
  if (typeof window !== 'undefined') {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      const current = get().theme;
      if (current === 'system') {
        const resolved = applyTheme('system');
        set({ resolvedTheme: resolved });
      }
    });
  }

  return {
    theme: initialTheme,
    resolvedTheme: initialResolved,
    setTheme: (theme: ThemeMode) => {
      localStorage.setItem('teamos_theme', theme);
      const resolvedTheme = applyTheme(theme);
      set({ theme, resolvedTheme });
    },
    toggleTheme: () => {
      const current = get().resolvedTheme;
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
  };
});

export function useTheme() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore();
  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme,
    toggleTheme,
  };
}
