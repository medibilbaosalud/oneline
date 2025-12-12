'use client';

import { useEffect, useState, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';

function getResolvedTheme(theme: Theme): 'dark' | 'light' {
    if (theme === 'system') {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        return 'dark'; // SSR fallback
    }
    return theme;
}

function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;
    const resolved = getResolvedTheme(theme);
    document.documentElement.setAttribute('data-theme', resolved);
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    // Load theme from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('oneline-theme') as Theme | null;
        const initial = stored || 'dark';
        setThemeState(initial);
        applyTheme(initial);
        setMounted(true);

        // Listen for system preference changes if using 'system'
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const handleChange = () => {
            const current = localStorage.getItem('oneline-theme') as Theme | null;
            if (current === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        localStorage.setItem('oneline-theme', newTheme);
        setThemeState(newTheme);
        applyTheme(newTheme);
    }, []);

    const resolvedTheme = getResolvedTheme(theme);

    return {
        theme,
        setTheme,
        resolvedTheme,
        mounted, // Use this to prevent hydration mismatch
    };
}
