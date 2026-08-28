import { useState, useEffect, useMemo } from 'react';
import { itemService } from '../services/itemService';
import type { Item } from '../types';
import { useCart } from '../contexts/CartContext';
import { getWhatsAppUrl, STORE_CONFIG } from '../config/storeConfig';
import { 
    ShoppingCart, 
    Search, 
    X, 
    Trash2, 
    Plus, 
    Minus, 
    Sun, 
    Moon, 
    ShoppingBag, 
    Eye, 
    SlidersHorizontal,
    ArrowUpDown,
    MapPin,
    Layers,
    Sparkles,
    Tag,
    RotateCcw,
    MessageCircle
} from 'lucide-react';

const conditionLabel: Record<string, string> = {
    nuevo: 'Nuevo',
    semi_uso: 'Semi uso',
    usado: 'Usado',
};

const conditionColor: Record<string, string> = {
    nuevo: 'bg-emerald-500 text-white',
    semi_uso: 'bg-amber-500 text-white',
    usado: 'bg-slate-600 text-white',
};

// Un "producto" en la tienda puede ser un grupo de variantes (mismo storeGroup)
export interface StoreEntry {
    rep: Item;          // item representativo (el que tiene título/desc/fotos)
    variants: Item[];   // todas las variantes (incluye al rep)
}

/** Agrupa items publicados por storeGroup; sin grupo → agrupa por título */
export function groupPublicItems(items: Item[]): StoreEntry[] {
    const byGroup = new Map<string, Item[]>();
    for (const it of items) {
        let g = (it.storeGroup || '').trim();
        if (!g) {
            g = `_TITLE_${(it.storeTitle || it.productName || '').trim().toLowerCase()}`;
        }
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g)!.push(it);
    }
    const score = (i: Item) => (i.storeTitle ? 4 : 0) + (i.description ? 2 : 0) + (i.storeImages?.length ? 1 : 0) + (i.imageUrl ? 1 : 0);
    const entries: StoreEntry[] = [];
    for (const variants of byGroup.values()) {
        const rep = [...variants].sort((a, b) => score(b) - score(a))[0];
        entries.push({ rep, variants });
    }
    return entries;
}

/** Limpia y extrae un preview legible de la descripción para la tarjeta */
function cleanDescriptionPreview(desc?: string): string {
    if (!desc) return '';
    return desc
        .replace(/^[-*•✓✔+→▪]\s*/gm, '') // Quitar viñetas
        .replace(/\n+/g, ' ')            // Reemplazar saltos por espacios
        .trim();
}

function ProductCard({ entry }: { entry: StoreEntry }) {
    const { rep: item, variants } = entry;
    const [imgError, setImgError] = useState(false);
    const extraCount = (item.storeImages?.length || 0);
    const firstImage = [item.imageUrl, ...(item.storeImages || []), ...variants.map(v => v.imageUrl)].find(u => !!u) ?? null;
    
    // Calcular precios mínimos y máximos
    const maxByKey = new Map<string, number>();
    for (const v of variants) {
        const key = `${(v.storeVariantName || '').trim().toLowerCase()}|${(v.location || '').trim().toLowerCase()}`;
        const p = v.salePrice || v.estimatedSalePrice || 0;
        maxByKey.set(key, Math.max(maxByKey.get(key) || 0, p));
    }
    const prices = Array.from(maxByKey.values());
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const totalStock = variants.reduce((acc, v) => acc + v.quantity, 0);
    const locMap = new Map<string, string>();
    variants.forEach(v => {
        const loc = (v.location || '').trim();
        if (loc) {
            const key = loc.toLowerCase();
            if (!locMap.has(key)) {
                locMap.set(key, loc.charAt(0).toUpperCase() + loc.slice(1));
            }
        }
    });
    const locations = Array.from(locMap.values()).join(' · ');
    const variantCount = maxByKey.size;
    const descPreview = cleanDescriptionPreview(item.description);

    return (
        <a
            href={`/producto/${item.id}`}
            className="group bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-xl border border-gray-150 dark:border-slate-800/80 flex flex-col hover:-translate-y-1 transition-all duration-300 relative"
        >
            {/* Imagen del Producto */}
            <div className="aspect-square bg-gray-50 dark:bg-slate-950 overflow-hidden relative">
                {/* Badge de Condición */}
                <span className={`absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm ${conditionColor[item.condition] || conditionColor.nuevo}`}>
                    {conditionLabel[item.condition] || item.condition}
                </span>
                
                {/* Contador de Fotos */}
                {extraCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <ShoppingBag className="w-3 h-3" />
                        {extraCount + (item.imageUrl ? 1 : 0)}
                    </span>
                )}
                
                {/* Badge de Video */}
                {item.storeVideoUrl && (
                    <span className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-10 bg-red-600/90 backdrop-blur-md text-white text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Video
                    </span>
                )}
                
                {firstImage && !imgError ? (
                    <img
                        src={firstImage}
                        alt={item.productName}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-slate-700">
                        <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 stroke-[1.5]" />
                        <span className="text-[10px] uppercase font-bold mt-2 tracking-wider">Sin Imagen</span>
                    </div>
                )}
            </div>

            {/* Info del Producto */}
            <div className="p-3 sm:p-4.5 flex flex-col gap-1.5 flex-1">
                {/* Categoría */}
                {item.category && (
                    <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none truncate">
                        {item.category}
                    </span>
                )}
                
                {/* Título */}
                <h3 className="font-bold text-gray-900 dark:text-white leading-snug text-xs sm:text-sm line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.storeTitle || item.productName}
                </h3>

                {/* Badge de Variantes si tiene */}
                {variantCount > 1 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full self-start">
                        <Layers className="w-3 h-3" />
                        {variantCount} opciones
                    </span>
                )}

                {/* Descripción / Preview */}
                {descPreview && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                        {descPreview}
                    </p>
                )}

                {/* Ubicación */}
                {locations && (
                    <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-indigo-500" />
                        <span className="truncate">{locations}</span>
                    </p>
                )}

                {/* Footer de la tarjeta: Precio y Botón */}
                <div className="mt-auto pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-end justify-between gap-1">
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Precio</p>
                        <div className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white leading-none mt-0.5">
                            {minPrice !== maxPrice && <span className="text-[10px] font-bold text-gray-400 mr-1 uppercase">desde</span>}
                            ${minPrice.toLocaleString('es-AR')}
                        </div>
                        {totalStock > 0 ? (
                            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {totalStock} disp.
                            </p>
                        ) : (
                            <p className="text-[10px] font-semibold text-rose-500 mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Sin stock
                            </p>
                        )}
                    </div>

                    <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 transition-all duration-300 shadow-2xs">
                        <Eye className="w-4 h-4" />
                    </span>
                </div>
            </div>
        </a>
    );
}

export default function Store() {
    const { cart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
    
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
    
    // Control del Carrito (Drawer)
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');

    // Control del Tema (Modo Oscuro)
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('dashboard_theme');
        return saved === 'dark' ? 'dark' : 'light';
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('dashboard_theme', theme);
    }, [theme]);

    useEffect(() => {
        itemService.getPublicItems()
            .then(data => {
                setItems(data);
                const prices = data.map(i => i.salePrice || i.estimatedSalePrice || 0);
                const max = prices.length ? Math.max(...prices) : 0;
                setMaxPriceLimit(max);
                setPriceRange(max);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    // Listas únicas de categorías y condiciones con conteos
    const categories = useMemo(() => {
        const cats = Array.from(new Set(items.map(i => i.category).filter((c): c is string => !!c)));
        return ['todos', ...cats];
    }, [items]);

    const conditions = useMemo(() => {
        const conds = Array.from(new Set(items.map(i => i.condition).filter(Boolean)));
        return ['todos', ...conds];
    }, [items]);

    // Filtrar y ordenar productos
    const filtered = useMemo(() => {
        return items.filter(item => {
            const q = search.toLowerCase().trim();
            const matchSearch = !q || 
                item.productName.toLowerCase().includes(q) ||
                (item.storeTitle || '').toLowerCase().includes(q) ||
                (item.location || '').toLowerCase().includes(q) ||
                (item.description || '').toLowerCase().includes(q);
                
            const matchCond = condFilter === 'todos' || item.condition === condFilter;
            const matchCat = catFilter === 'todos' || item.category === catFilter;
            
            const price = item.salePrice || item.estimatedSalePrice || 0;
            const matchPrice = priceRange === 0 || price <= priceRange;

            return matchSearch && matchCond && matchCat && matchPrice;
        });
    }, [items, search, condFilter, catFilter, priceRange]);

    // Ordenar los items filtrados
    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const priceA = a.salePrice || a.estimatedSalePrice || 0;
            const priceB = b.salePrice || b.estimatedSalePrice || 0;
            
            if (orderBy === 'price_asc') return priceA - priceB;
            if (orderBy === 'price_desc') return priceB - priceA;
            if (orderBy === 'name_asc') return (a.storeTitle || a.productName).localeCompare(b.storeTitle || b.productName);
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [filtered, orderBy]);

    const entries = useMemo(() => groupPublicItems(sorted), [sorted]);

    // Resetear todos los filtros
    const handleResetFilters = () => {
        setSearch('');
        setCondFilter('todos');
        setCatFilter('todos');
        setOrderBy('newest');
        setPriceRange(maxPriceLimit);
    };

    const hasActiveFilters = search !== '' || condFilter !== 'todos' || catFilter !== 'todos' || (maxPriceLimit > 0 && priceRange < maxPriceLimit);

    // Enviar pedido por WhatsApp
    const handleCheckout = () => {
        if (cart.length === 0) return;
        
        let text = `🛒 *Nuevo Pedido - ${STORE_CONFIG.storeName}*\n`;
        text += `=====================================\n`;
        if (customerName.trim()) {
            text += `*Cliente:* ${customerName.trim()}\n`;
            text += `=====================================\n\n`;
        }
        
        cart.forEach((item, index) => {
            const variantDesc = item.variantName ? ` (${item.variantName})` : '';
            const locationDesc = item.location ? `\n   📍 Ubicación: ${item.location}` : '';
            const condDesc = conditionLabel[item.condition] || item.condition;
            
            text += `*${index + 1}. ${item.storeTitle || item.productName}*${variantDesc}\n`;
            text += `   Condición: ${condDesc}${locationDesc}\n`;
            text += `   Cantidad: ${item.quantity} x $${item.price.toLocaleString('es-AR')}\n`;
            text += `   Subtotal: $${(item.quantity * item.price).toLocaleString('es-AR')}\n\n`;
        });
        
        text += `=====================================\n`;
        text += `*Total del Pedido:* $${totalPrice.toLocaleString('es-AR')}\n\n`;
        text += `¡Hola! Me interesa coordinar la compra de estos productos de la tienda.`;
        
        const url = getWhatsAppUrl(text);
        window.open(url, '_blank');
        clearCart();
        setIsCartOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50/80 dark:bg-[#0b1220] text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Header / Barra de Navegación */}
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800/80 shadow-xs transition-colors duration-300">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    {/* Logo/Nombre */}
                    <a href="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <span className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight">
                            {STORE_CONFIG.storeName}
                        </span>
                    </a>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2.5">
                        {/* Botón WhatsApp Directo */}
                        <a
                            href={getWhatsAppUrl(`¡Hola! Tengo una consulta sobre los productos de la tienda.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 transition-all"
                        >
                            <MessageCircle className="w-4 h-4 text-emerald-500" />
                            <span>Contacto</span>
                        </a>

                        {/* Botón de Modo Oscuro */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:scale-105 transition-all shadow-xs"
                            aria-label="Alternar tema"
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>

                        {/* Botón del Carrito */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all hover:scale-[1.02] shadow-md shadow-indigo-600/15 cursor-pointer"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden sm:inline text-xs font-bold">Carrito</span>
                            {totalItems > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Banner de Bienvenida / Hero */}
            <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-12 sm:py-16 px-4 shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_800px_350px_at_50%_-20%,rgba(99,102,241,0.25),transparent)] pointer-events-none" />
                <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-200 mb-4 backdrop-blur-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                        Catálogo Online Actualizado
                    </span>
                    
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent leading-tight">
                        Encontrá lo que estás buscando
                    </h1>
                    
                    <p className="text-slate-300 text-sm sm:text-base mt-3 max-w-xl leading-relaxed">
                        Stock real disponible para entrega inmediata o envío. Elegí tus productos y coordiná directo por WhatsApp.
                    </p>

                    {!loading && !error && (
                        <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
                            <span className="px-3.5 py-1.5 text-xs font-bold bg-white/10 backdrop-blur-md rounded-xl text-white border border-white/10">
                                ✨ {items.length} artículo{items.length !== 1 ? 's' : ''} en stock
                            </span>
                            <span className="px-3.5 py-1.5 text-xs font-bold bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
                                💬 Compra 100% directa
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* BARRA DE CONTROLES: BÚSQUEDA Y FILTROS */}
            <section className="sticky top-16 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 space-y-3">
                    {/* Fila 1: Buscador + Botón Filtros + Orden */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                            <input
                                type="search"
                                placeholder="Buscar por nombre, descripción o ubicación..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-950 text-sm outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-2xs text-gray-900 dark:text-white placeholder:text-gray-400"
                            />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1"
                                    aria-label="Limpiar búsqueda"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Botón Filtros Avanzados */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-2xl border font-bold text-xs transition-all shadow-xs cursor-pointer ${
                                    showFilters || hasActiveFilters
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20' 
                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Filtros</span>
                                {hasActiveFilters && (
                                    <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                )}
                            </button>

                            {/* Ordenamiento */}
                            <div className="relative flex items-center gap-1.5 px-3 py-2.5 sm:py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
                                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <select
                                    value={orderBy}
                                    onChange={e => setOrderBy(e.target.value)}
                                    className="text-xs font-bold bg-transparent border-none outline-none pr-5 text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                    <option value="newest">Más recientes</option>
                                    <option value="price_asc">Menor precio</option>
                                    <option value="price_desc">Mayor precio</option>
                                    <option value="name_asc">Nombre (A-Z)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Fila 2: Chips de Categorías con Scroll Horizontal Instantáneo */}
                    {categories.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                Categorías:
                            </span>
                            {categories.map(c => {
                                const isSelected = catFilter === c;
                                return (
                                    <button
                                        key={c}
                                        onClick={() => setCatFilter(c)}
                                        className={`shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer capitalize shadow-2xs ${
                                            isSelected
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                                            : 'bg-gray-100/90 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {c === 'todos' ? 'Todas' : c}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Filtros Colapsables Avanzados */}
                    {showFilters && (
                        <div className="pt-3 pb-1 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-3 duration-200">
                            {/* Filtro Rango de Precio */}
                            {maxPriceLimit > 0 && (
                                <div className="space-y-1.5 p-3.5 rounded-2xl bg-gray-50/70 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800/80">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Precio máximo</label>
                                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">${priceRange.toLocaleString('es-AR')}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max={maxPriceLimit} 
                                        value={priceRange} 
                                        onChange={e => setPriceRange(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                                        <span>$0</span>
                                        <span>${maxPriceLimit.toLocaleString('es-AR')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Filtro por Condición */}
                            {conditions.length > 1 && (
                                <div className="space-y-2 p-3.5 rounded-2xl bg-gray-50/70 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800/80">
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">Estado del Ítem</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {conditions.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setCondFilter(c)}
                                                className={`text-xs font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                                    condFilter === c
                                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-950 shadow-xs'
                                                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                {c === 'todos' ? 'Todos' : conditionLabel[c] || c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Botón Restablecer Filtros */}
                            <div className="flex items-end">
                                <button
                                    onClick={handleResetFilters}
                                    disabled={!hasActiveFilters}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Limpiar todos los filtros</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* CATÁLOGO DE PRODUCTOS */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">
                {/* Cargando */}
                {loading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 animate-pulse">
                                <div className="aspect-square bg-gray-100 dark:bg-slate-800/60" />
                                <div className="p-4 space-y-3">
                                    <div className="h-3.5 bg-gray-100 dark:bg-slate-800 rounded-full w-4/5" />
                                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full w-3/5" />
                                    <div className="h-6 bg-gray-100 dark:bg-slate-800 rounded-full w-2/5 mt-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 rounded-3xl border border-red-200/50 dark:border-red-900/30 max-w-md mx-auto my-12 space-y-3">
                        <p className="font-bold text-red-600 dark:text-red-400">Hubo un problema al cargar los productos</p>
                        <p className="text-xs text-gray-500">Por favor revisá tu conexión a internet o intentá nuevamente más tarde.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all cursor-pointer shadow-sm"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reintentar</span>
                        </button>
                    </div>
                )}

                {/* Catálogo Vacío / Sin Resultados */}
                {!loading && !error && entries.length === 0 && (
                    <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
                        <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto text-gray-400 dark:text-slate-600">
                            <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No encontramos productos coincidentes</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                            Probá buscando con otras palabras clave o restablecé los filtros activos.
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/15 transition-all"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restablecer filtros</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Grid de Productos */}
                {!loading && !error && entries.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500 font-semibold px-1">
                            <span>Mostrando {entries.length} producto{entries.length !== 1 ? 's' : ''}</span>
                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetFilters}
                                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-6">
                            {entries.map(entry => (
                                <ProductCard key={entry.rep.id} entry={entry} />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* SIDEBAR DRAWER DEL CARRITO */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                        onClick={() => setIsCartOpen(false)}
                    />
                    
                    {/* Panel del Drawer */}
                    <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
                        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            
                            {/* Cabecera del Carrito */}
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mi Carrito</h2>
                                        <span className="text-xs text-gray-400 dark:text-slate-500">{totalItems} producto{totalItems !== 1 ? 's' : ''} agregado{totalItems !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    aria-label="Cerrar carrito"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Contenido / Items */}
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-slate-500 py-16">
                                        <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-slate-800/40 flex items-center justify-center mb-4 text-gray-300 dark:text-slate-600">
                                            <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
                                        </div>
                                        <p className="font-bold text-gray-800 dark:text-slate-200 text-base">Tu carrito está vacío</p>
                                        <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                                            Agregá productos desde el catálogo para coordinar la compra fácilmente por WhatsApp.
                                        </p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div 
                                            key={item.id} 
                                            className="flex gap-3.5 bg-gray-50/80 dark:bg-slate-950/50 rounded-2xl p-3.5 border border-gray-100 dark:border-slate-800/80 shadow-2xs"
                                        >
                                            {/* Imagen del Item */}
                                            <div className="w-18 h-18 bg-white dark:bg-slate-900 border border-gray-200/70 dark:border-slate-800 rounded-xl overflow-hidden shrink-0">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Detalles del Item */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-start justify-between gap-1">
                                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                                            {item.storeTitle || item.productName}
                                                        </h4>
                                                        <button 
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-gray-400 hover:text-rose-500 p-1 cursor-pointer transition-colors shrink-0"
                                                            title="Eliminar del carrito"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    {item.variantName && (
                                                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 block">
                                                            {item.variantName}
                                                        </span>
                                                    )}
                                                    {item.location && (
                                                        <span className="text-[10px] text-gray-400 block mt-0.5">
                                                            📍 {item.location}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* Controles de Cantidad */}
                                                <div className="flex items-center justify-between gap-2 mt-2">
                                                    <div className="flex items-center gap-1 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 px-1 py-0.5">
                                                        <button 
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                                            aria-label="Menos"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-xs font-bold px-1.5 min-w-[1.25rem] text-center text-gray-900 dark:text-white">
                                                            {item.quantity}
                                                        </span>
                                                        <button 
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer disabled:opacity-30"
                                                            disabled={item.quantity >= item.maxQuantity}
                                                            aria-label="Más"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                            ${(item.price * item.quantity).toLocaleString('es-AR')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Resumen y Envío del Pedido */}
                            {cart.length > 0 && (
                                <div className="border-t border-gray-150 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-950 p-6 space-y-4 safe-bottom">
                                    {/* Nombre del cliente */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                                            Tu Nombre (Opcional)
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej. Lucas Pérez"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-indigo-500 transition-all shadow-2xs text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    {/* Subtotal / Total */}
                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                                            <span>Subtotal</span>
                                            <span>${totalPrice.toLocaleString('es-AR')}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-800">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
                                            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                                                ${totalPrice.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Botón Finalizar */}
                                    <button
                                        onClick={handleCheckout}
                                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold transition-all shadow-lg shadow-emerald-600/20 text-sm cursor-pointer"
                                    >
                                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.977 14.113.953 11.483.951c-5.44 0-9.866 4.369-9.87 9.8-.001 1.702.463 3.364 1.34 4.825l-.93 3.398 3.484-.903-.002-.002z" />
                                        </svg>
                                        <span>Enviar Pedido por WhatsApp</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
