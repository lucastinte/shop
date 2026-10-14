import { useState, useEffect, useMemo } from 'react';
import { itemService } from '../services/itemService';
import type { Item } from '../types';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard, groupPublicItems, entryStock } from './ProductCard';
import { SiteFooter, SiteHeader, TopStrip, WhatsAppIcon } from './SiteChrome';
import CartDrawer from './CartDrawer';
import { iconForCategory } from '../lib/categoryIcon';
import { capitalize, conditionLabel, formatPrice, priceOf } from '../lib/format';
import { getWhatsAppUrl, SEDES_TEXT, type HeroBanner } from '../config/storeConfig';
import HeroBanners from './HeroBanners';

function scrollToCatalog() {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Store() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Filtros y ordenamiento
    const [search, setSearch] = useState('');
    const [condFilter, setCondFilter] = useState<string>('todos');
    const [catFilter, setCatFilter] = useState<string>('todos');
    const [orderBy, setOrderBy] = useState<string>('newest');
    const [priceRange, setPriceRange] = useState<number>(0);
    const [maxPriceLimit, setMaxPriceLimit] = useState<number>(0);
    const [showFilters, setShowFilters] = useState(false);

    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        itemService.getPublicItems()
            .then(data => {
                setItems(data);
                const prices = data.map(priceOf);
                const max = prices.length ? Math.max(...prices) : 0;
                setMaxPriceLimit(max);
                setPriceRange(max);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    const allEntries = useMemo(() => groupPublicItems(items), [items]);

    // Categorías con cantidad de productos (agrupados)
    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        for (const e of allEntries) {
            const c = e.rep.category;
            if (c) counts.set(c, (counts.get(c) || 0) + 1);
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }, [allEntries]);

    const conditions = useMemo(() => {
        const conds = Array.from(new Set(items.map(i => i.condition).filter(Boolean)));
        return ['todos', ...conds];
    }, [items]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return items.filter(item => {
            const matchSearch = !q ||
                item.productName.toLowerCase().includes(q) ||
                (item.storeTitle || '').toLowerCase().includes(q) ||
                (item.category || '').toLowerCase().includes(q) ||
                (item.location || '').toLowerCase().includes(q) ||
                (item.description || '').toLowerCase().includes(q);
            const matchCond = condFilter === 'todos' || item.condition === condFilter;
            const matchCat = catFilter === 'todos' || item.category === catFilter;
            const matchPrice = priceRange === 0 || priceOf(item) <= priceRange;
            return matchSearch && matchCond && matchCat && matchPrice;
        });
    }, [items, search, condFilter, catFilter, priceRange]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            if (orderBy === 'price_asc') return priceOf(a) - priceOf(b);
            if (orderBy === 'price_desc') return priceOf(b) - priceOf(a);
            if (orderBy === 'name_asc') return (a.storeTitle || a.productName).localeCompare(b.storeTitle || b.productName);
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filtered, orderBy]);

    const entries = useMemo(() => groupPublicItems(sorted), [sorted]);

    const priceFilterActive = maxPriceLimit > 0 && priceRange < maxPriceLimit;
    const advancedActive = condFilter !== 'todos' || priceFilterActive;
    const hasActiveFilters = search !== '' || catFilter !== 'todos' || advancedActive;
    // Sin filtros mostramos la portada; con filtros, los resultados van primero
    const browsing = !hasActiveFilters;

    const handleResetFilters = () => {
        setSearch('');
        setCondFilter('todos');
        setCatFilter('todos');
        setOrderBy('newest');
        setPriceRange(maxPriceLimit);
    };

    const pickCategory = (c: string) => {
        setCatFilter(c);
        requestAnimationFrame(scrollToCatalog);
    };

    const inStockCount = allEntries.filter(e => entryStock(e) > 0).length;

    // Botón del banner: busca el producto; si no hay coincidencias, solo baja al catálogo
    const handleBannerCta = (b: HeroBanner) => {
        const q = b.query.toLowerCase();
        const hasMatch = items.some(i => `${i.productName} ${i.storeTitle || ''}`.toLowerCase().includes(q));
        if (hasMatch) setSearch(b.query);
        requestAnimationFrame(scrollToCatalog);
    };

    const searchBox = (
        <form
            role="search"
            onSubmit={e => { e.preventDefault(); scrollToCatalog(); }}
            className="relative flex items-stretch h-11 border-2 border-ink rounded-[2px] bg-surface focus-within:outline-3 focus-within:outline-ink focus-within:outline-offset-2"
        >
            <label htmlFor="store-search" className="sr-only">Buscar productos</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" aria-hidden="true" />
            <input
                id="store-search"
                type="search"
                placeholder="Buscar: cargador, auriculares, router…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 min-w-0 pl-9 pr-2 bg-transparent text-ink placeholder:text-muted outline-none focus-visible:outline-none text-base [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
                <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="w-10 inline-flex items-center justify-center text-muted hover:text-ink cursor-pointer"
                    aria-label="Limpiar búsqueda"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </form>
    );

    const categoryNav = categories.length > 1 ? (
        <nav aria-label="Categorías" className="border-t border-line">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 overflow-x-auto no-scrollbar">
                {[{ name: 'todos', count: allEntries.length }, ...categories].map(c => {
                    const active = catFilter === c.name;
                    return (
                        <button
                            key={c.name}
                            type="button"
                            onClick={() => pickCategory(c.name)}
                            aria-pressed={active}
                            className={`shrink-0 min-h-11 label-mono text-xs border-b-[3px] transition-colors cursor-pointer ${
                                active ? 'text-ink border-signal font-medium' : 'text-muted border-transparent hover:text-ink'
                            }`}
                        >
                            {c.name === 'todos' ? 'Todo' : c.name}
                        </button>
                    );
                })}
            </div>
        </nav>
    ) : null;

    return (
        <div className="min-h-screen bg-bg text-ink">
            <TopStrip />
            <SiteHeader onOpenCart={() => setIsCartOpen(true)} middle={searchBox} subnav={categoryNav} />

            {browsing && (
                <section aria-label="Portada" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-wrap gap-4">
                    <HeroBanners
                        onCta={handleBannerCta}
                        badge={!loading && !error && inStockCount > 0 ? `${inStockCount} producto${inStockCount !== 1 ? 's' : ''} en stock` : undefined}
                    />

                    <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-4">
                        <a
                            href="#como-comprar"
                            className="flex-1 min-h-[160px] flex flex-col justify-between gap-4 p-6 bg-signal text-on-signal rounded-[2px] hover:brightness-95 transition"
                        >
                            <span className="label-mono">Compra directa</span>
                            <span className="flex flex-col gap-2">
                                <span className="font-display font-black uppercase text-[38px] leading-[0.9]">Armá tu pedido</span>
                                <span className="text-sm font-medium">Elegí, sumá al carrito y mandalo por WhatsApp. Sin registrarte.</span>
                            </span>
                        </a>
                        <a
                            href={getWhatsAppUrl('¡Hola! Quería consultar por retiro o envío a mi zona.')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-h-[160px] flex flex-col justify-between gap-4 p-6 bg-night text-on-night rounded-[2px] dark:border dark:border-line hover:bg-ink-2 dark:hover:bg-sunken transition-colors"
                        >
                            <span className="label-mono text-night-muted">Entrega</span>
                            <span className="flex flex-col gap-2">
                                <span className="font-display font-black uppercase text-[38px] leading-[0.9]">Dos puntos de retiro</span>
                                <span className="text-sm text-night-muted">{SEDES_TEXT}.</span>
                                <span className="text-sm text-night-muted inline-flex items-center gap-2">
                                    <WhatsAppIcon className="w-4 h-4 shrink-0" />
                                    O envío coordinado: consultá tu zona
                                </span>
                            </span>
                        </a>
                    </div>
                </section>
            )}

            {browsing && categories.length > 1 && (
                <section aria-labelledby="cats-title" className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 flex flex-col gap-4">
                    <h2 id="cats-title" className="font-display font-black uppercase text-4xl leading-none">Categorías</h2>
                    <ul className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                        {categories.map(c => {
                            const Icon = iconForCategory(c.name);
                            return (
                                <li key={c.name}>
                                    <button
                                        type="button"
                                        onClick={() => pickCategory(c.name)}
                                        className="w-full h-32 p-4 flex flex-col justify-between text-left bg-surface border border-line rounded-[2px] hover:border-ink transition-colors cursor-pointer group"
                                    >
                                        <Icon className="w-7 h-7 text-ink group-hover:text-signal-ink transition-colors" strokeWidth={1.75} aria-hidden="true" />
                                        <span className="flex flex-col min-w-0">
                                            <span className="font-semibold text-ink truncate">{capitalize(c.name)}</span>
                                            <span className="label-mono text-muted">{c.count} producto{c.count !== 1 ? 's' : ''}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <main id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-20 scroll-mt-32 flex flex-col gap-5">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                        <h2 className="font-display font-black uppercase text-[44px] sm:text-[52px] leading-[0.95] break-words">
                            {catFilter === 'todos' ? 'Catálogo' : capitalize(catFilter)}
                        </h2>
                        {!loading && !error && (
                            <p className="label-mono text-muted mt-1">
                                {entries.length} producto{entries.length !== 1 ? 's' : ''}
                                {search.trim() ? ` para “${search.trim()}”` : ''}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowFilters(s => !s)}
                            aria-expanded={showFilters}
                            aria-controls="filtros-avanzados"
                            className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-[2px] border-2 font-semibold transition-colors cursor-pointer ${
                                showFilters ? 'bg-ink text-bg border-ink' : 'border-ink text-ink hover:bg-sunken'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                            Filtros
                            {advancedActive && <span className="w-2 h-2 rounded-full bg-signal" aria-label="hay filtros activos" />}
                        </button>
                        <label htmlFor="orden" className="sr-only">Ordenar</label>
                        <select
                            id="orden"
                            value={orderBy}
                            onChange={e => setOrderBy(e.target.value)}
                            className="h-11 pl-3 pr-8 rounded-[2px] border-2 border-ink bg-surface text-ink font-medium cursor-pointer"
                        >
                            <option value="newest">Más recientes</option>
                            <option value="price_asc">Menor precio</option>
                            <option value="price_desc">Mayor precio</option>
                            <option value="name_asc">Nombre (A-Z)</option>
                        </select>
                    </div>
                </div>

                {showFilters && (
                    <div id="filtros-avanzados" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
                        {maxPriceLimit > 0 && (
                            <div className="p-4 bg-surface border border-line rounded-[2px] flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="precio-max" className="label-mono text-muted">Precio máximo</label>
                                    <span className="font-mono font-medium text-ink">{formatPrice(priceRange)}</span>
                                </div>
                                <input
                                    id="precio-max"
                                    type="range"
                                    min="0"
                                    max={maxPriceLimit}
                                    value={priceRange}
                                    onChange={e => setPriceRange(Number(e.target.value))}
                                    className="w-full accent-[var(--signal)] cursor-pointer"
                                />
                                <div className="flex justify-between font-mono text-xs text-muted">
                                    <span>$0</span>
                                    <span>{formatPrice(maxPriceLimit)}</span>
                                </div>
                            </div>
                        )}

                        {conditions.length > 1 && (
                            <fieldset className="p-4 bg-surface border border-line rounded-[2px] flex flex-col gap-2.5">
                                <legend className="sr-only">Estado</legend>
                                <span className="label-mono text-muted" aria-hidden="true">Estado</span>
                                <div className="flex flex-wrap gap-2">
                                    {conditions.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setCondFilter(c)}
                                            aria-pressed={condFilter === c}
                                            className={`min-h-10 px-3 rounded-[2px] border-2 text-sm font-semibold transition-colors cursor-pointer ${
                                                condFilter === c ? 'bg-ink text-bg border-ink' : 'border-line text-ink hover:border-ink'
                                            }`}
                                        >
                                            {c === 'todos' ? 'Todos' : conditionLabel[c] || c}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        )}

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                disabled={!hasActiveFilters}
                                className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-[2px] border-2 border-ink text-ink font-semibold hover:bg-sunken disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                Limpiar filtros
                            </button>
                        </div>
                    </div>
                )}

                {hasActiveFilters && !showFilters && (
                    <div className="flex flex-wrap items-center gap-2 -mt-1">
                        {catFilter !== 'todos' && <FilterChip label={capitalize(catFilter)} onClear={() => setCatFilter('todos')} />}
                        {search.trim() && <FilterChip label={`“${search.trim()}”`} onClear={() => setSearch('')} />}
                        {condFilter !== 'todos' && <FilterChip label={conditionLabel[condFilter] || condFilter} onClear={() => setCondFilter('todos')} />}
                        {priceFilterActive && <FilterChip label={`Hasta ${formatPrice(priceRange)}`} onClear={() => setPriceRange(maxPriceLimit)} />}
                        <button type="button" onClick={handleResetFilters} className="min-h-9 px-2 text-sm font-semibold text-ink underline underline-offset-4 cursor-pointer">
                            Limpiar todo
                        </button>
                    </div>
                )}

                <div className="border-t border-line pt-5">
                    {loading && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" aria-busy="true" aria-label="Cargando productos">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="bg-surface border border-line rounded-[2px] animate-pulse">
                                    <div className="aspect-square bg-sunken" />
                                    <div className="p-4 flex flex-col gap-3">
                                        <div className="h-2.5 bg-sunken w-1/3" />
                                        <div className="h-3.5 bg-sunken w-4/5" />
                                        <div className="h-5 bg-sunken w-2/5 mt-3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="max-w-md mx-auto my-12 p-8 text-center border-2 border-ink rounded-[2px] flex flex-col items-center gap-3">
                            <p className="font-display font-black uppercase text-3xl leading-none">Sin señal</p>
                            <p className="text-sm text-muted">No pudimos cargar los productos. Revisá tu conexión e intentá de nuevo.</p>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center gap-2 min-h-11 px-5 rounded-[2px] bg-signal text-on-signal font-semibold cursor-pointer"
                            >
                                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!loading && !error && entries.length === 0 && (
                        <div className="py-16 text-center max-w-md mx-auto flex flex-col items-center gap-3">
                            <p className="font-display font-black uppercase text-3xl leading-none">Nada por acá</p>
                            <p className="text-sm text-muted">Probá con otras palabras o limpiá los filtros.</p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="inline-flex items-center gap-2 min-h-11 px-5 rounded-[2px] bg-signal text-on-signal font-semibold cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && !error && entries.length > 0 && (
                        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {entries.map(entry => (
                                <li key={entry.rep.id} className="flex">
                                    <ProductCard entry={entry} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>

            {browsing && <HowToBuy />}

            <SiteFooter />
            <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 min-h-9 pl-3 pr-1 bg-ink text-bg rounded-[2px] text-sm font-medium">
            {label}
            <button
                type="button"
                onClick={onClear}
                className="w-7 h-7 inline-flex items-center justify-center cursor-pointer"
                aria-label={`Quitar filtro ${label}`}
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </span>
    );
}

function HowToBuy() {
    const steps = [
        { n: '01', t: 'Armá tu carrito', d: 'Precio y stock al día en cada producto.' },
        { n: '02', t: 'Mandá el pedido', d: 'Se abre WhatsApp con el detalle listo para enviar.' },
        { n: '03', t: 'Retirá o recibí', d: `Retiro en ${SEDES_TEXT}, o envío coordinado a tu zona.` },
    ];
    return (
        <section id="como-comprar" aria-labelledby="pasos-title" className="bg-sky text-on-sky scroll-mt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 flex flex-wrap gap-x-12 gap-y-8">
                <h2 id="pasos-title" className="flex-[1_1_240px] font-display font-black uppercase text-5xl leading-[0.9]">
                    Cómo comprar
                </h2>
                <ol className="flex-[3_1_600px] grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {steps.map(s => (
                        <li key={s.n} className="flex flex-col gap-2 pt-4 border-t-[3px] border-signal">
                            <span className="font-mono text-sm">{s.n}</span>
                            <strong className="text-lg font-semibold">{s.t}</strong>
                            <span>{s.d}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
