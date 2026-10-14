import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dashboard_theme';

export type Theme = 'light' | 'dark';

function readSaved(): Theme {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

/** Tema claro/oscuro persistido; aplica la clase .dark en <html>. */
export function useTheme() {
    const [theme, setTheme] = useState<Theme>(readSaved);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // almacenamiento bloqueado: el tema vale solo para esta visita
        }
    }, [theme]);

    const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

    return { theme, toggleTheme };
}
