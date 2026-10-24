'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const subscribe = (callback: () => void) => {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'data-theme') {
        callback();
      }
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  window.addEventListener('storage', callback);
  return () => {
    observer.disconnect();
    window.removeEventListener('storage', callback);
  };
};

const getSnapshot = (): 'light' | 'dark' => {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark' ? 'dark' : 'light';
};

const getServerSnapshot = (): 'light' | 'dark' => 'light';

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
    try {
      localStorage.setItem('terrapulse-theme', nextTheme);
    } catch {
      // storage disabled or unavailable
    }
  };

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center gap-2 rounded-[2px] transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer select-none ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-navbar-text hover:text-navbar-link-hover transition-colors" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 text-navbar-text hover:text-navbar-link-hover transition-colors" aria-hidden="true" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold text-navbar-text">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;

