import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Toggle dark mode"
      className="relative flex items-center justify-center p-2.5 rounded-2xl bg-stone/10 dark:bg-stone/20 text-deep-forest dark:text-amber-400 hover:bg-stone/20 dark:hover:bg-stone/30 border border-border/50 transition-all duration-200 active:scale-95 shadow-sm"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
      <span className="sr-only">Toggle Theme</span>
    </button>
  );
};

export default ThemeToggle;
