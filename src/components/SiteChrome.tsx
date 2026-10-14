import type { ReactNode } from 'react';
import { MessageCircle, Moon, ShoppingCart, Sun } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../hooks/useTheme';
import { getWhatsAppUrl, STORE_CONFIG } from '../config/storeConfig';

/** Marca: antena apuntando al satélite (punto Señal) */
export function BrandMark({ className = 'w-7 h-7' }: { className?: string }) {
    return (
        <svg viewBox="0 0 30 30" fill="none" className={className} aria-hidden="true">
            <path d="M4 26 L12 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="9" y="6" width="16" height="10" rx="1" transform="rotate(-35 17 11)" fill="currentColor" />
            <circle cx="26" cy="4" r="3" className="fill-signal" />
        </svg>
    );
}

export function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.977 14.113.953 11.483.951c-5.44 0-9.866 4.369-9.87 9.8-.001 1.702.463 3.364 1.34 4.825l-.93 3.398 3.484-.903-.002-.002z" />
        </svg>
    );
}

/** Franja superior tipo "lectura de instrumento" */
export function TopStrip() {
    return (
        <div className="bg-night text-on-night label-mono">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-x-6 gap-y-1">
                <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-signal" aria-hidden="true" />
                    {STORE_CONFIG.sedes.map(s => s.nombre).join(' · ')}
                </span>
                {/* Desde lg: en tablet los tres textos sin corte no entran y la página se desplazaba de costado */}
                <span className="hidden lg:inline whitespace-nowrap">Retiro en ambas sedes o envío coordinado</span>
                <span className="ml-auto whitespace-nowrap hidden sm:inline">Precios y stock al día</span>
            </div>
        </div>
    );
}

interface SiteHeaderProps {
    onOpenCart: () => void;
    /** Va antes de la marca (ej. volver al catálogo) */
    leading?: ReactNode;
    /** Centro del header (ej. buscador). En móvil baja a una segunda fila. */
    middle?: ReactNode;
    /** Botones extra antes del tema (ej. compartir) */
    extraActions?: ReactNode;
    /** Fila inferior (ej. categorías) */
    subnav?: ReactNode;
}

export function SiteHeader({ onOpenCart, leading, middle, extraActions, subnav }: SiteHeaderProps) {
    const { totalItems } = useCart();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md border-b border-line">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-3">
                {leading}
                <a href="/" className="flex items-center gap-2.5 text-ink no-underline shrink-0 min-h-11">
                    <BrandMark />
                    <span className="font-display font-black text-[23px] sm:text-[28px] leading-none tracking-[0.03em] uppercase">
                        {STORE_CONFIG.storeName}
                    </span>
                </a>

                {middle && <div className="order-last w-full md:order-none md:w-auto md:flex-1 min-w-0">{middle}</div>}

                <div className={`flex items-center gap-2 ml-auto ${middle ? 'md:ml-0' : ''}`}>
                    <a
                        href={getWhatsAppUrl('¡Hola! Tengo una consulta sobre los productos de la tienda.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-2 min-h-11 px-3 font-medium text-ink hover:text-sky dark:hover:text-on-sky transition-colors"
                    >
                        <MessageCircle className="w-4 h-4" aria-hidden="true" />
                        Consultas
                    </a>
                    {extraActions}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-11 h-11 inline-flex items-center justify-center rounded-[2px] border border-line text-ink hover:border-ink transition-colors cursor-pointer"
                        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={onOpenCart}
                        className="inline-flex items-center gap-2 min-h-11 px-3 sm:px-4 rounded-[2px] bg-signal text-on-signal font-semibold hover:brightness-95 transition cursor-pointer"
                        aria-label={`Abrir carrito, ${totalItems} producto${totalItems !== 1 ? 's' : ''}`}
                    >
                        <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                        <span className="hidden sm:inline">Carrito</span>
                        <span className="min-w-6 h-6 px-1.5 rounded-full bg-night text-on-night font-mono text-xs inline-flex items-center justify-center">
                            {totalItems}
                        </span>
                    </button>
                </div>
            </div>
            {subnav}
        </header>
    );
}

export function SiteFooter() {
    return (
        <footer className="bg-night text-night-muted">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
                <div className="flex flex-col gap-3">
                    <span className="flex items-center gap-2.5 text-on-night">
                        <BrandMark className="w-8 h-8" />
                        <span className="font-display font-black text-4xl leading-none uppercase tracking-[0.03em]">
                            {STORE_CONFIG.storeName}
                        </span>
                    </span>
                    <SedesList tone="night" />
                    <a
                        href={getWhatsAppUrl('¡Hola! Tengo una consulta sobre los productos de la tienda.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 self-start min-h-11 font-medium text-on-night hover:text-signal transition-colors"
                    >
                        <WhatsAppIcon />
                        Escribinos por WhatsApp
                    </a>
                </div>
                <p className="label-mono max-w-sm leading-relaxed">
                    Revendedor independiente. Starlink es marca de SpaceX; no estamos afiliados.
                </p>
            </div>
        </footer>
    );
}

/** Sedes con su horario de atención */
export function SedesList({ tone = 'night' }: { tone?: 'night' | 'light' }) {
    const nameCls = tone === 'night' ? 'text-on-night' : 'text-ink';
    const hourCls = tone === 'night' ? 'text-night-muted' : 'text-muted';
    return (
        <dl className="m-0 flex flex-col gap-1.5">
            {STORE_CONFIG.sedes.map(s => (
                <div key={s.nombre} className="flex flex-wrap items-baseline gap-x-3">
                    <dt className={`label-mono ${nameCls}`}>{s.nombre}</dt>
                    <dd className={`m-0 font-mono text-xs ${hourCls}`}>{s.direccion ? `${s.direccion} · ` : ''}{s.horario}</dd>
                </div>
            ))}
        </dl>
    );
}
