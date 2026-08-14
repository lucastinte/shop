import { useState, useEffect } from 'react';
import { itemService } from '../services/itemService';
import type { Item } from '../types';
import { useCart } from '../contexts/CartContext';
import { getWhatsAppUrl, STORE_CONFIG } from '../config/storeConfig';
import FormattedDescription from './FormattedDescription';
import {
    X,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    ShoppingCart,
    ShoppingBag,
    ArrowLeft,
    Plus,
    Minus,
    Sun,
    Moon,
    Trash2,
    Share2,
    MessageCircle,
    MapPin,
    Tag,
    ChevronRight as BreadcrumbSeparator,
    ShieldCheck,
    Truck,
    HelpCircle,
    Layers,
    Play
} from 'lucide-react';

const conditionLabel: Record<string, string> = {
    nuevo: 'Nuevo',
    semi_uso: 'Semi uso',
    usado: 'Usado',
};

const conditionColor: Record<string, string> = {
    nuevo: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40',
    semi_uso: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40',
    usado: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
};

function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
}

function VideoPlayer({ url }: { url: string }) {
    const ytId = getYouTubeId(url);
    if (ytId) {
        return (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-slate-800">
                <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    title="Video del producto"
                />
            </div>
        );
    }
    return (
        <video
            src={url}
            controls
            className="w-full rounded-2xl bg-black shadow-md border border-slate-800"
            style={{ maxHeight: '480px' }}
        />
    );
}

function ImagePlaceholder() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 text-gray-300 dark:text-slate-700">
            <ShoppingBag className="w-16 h-16 stroke-[1.5]" />
            <span className="text-xs uppercase font-bold mt-3 tracking-wider">Sin Imagen</span>
        </div>
    );
}

export default function StoreProduct({ id }: { id: string }) {
    const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
    
    const [item, setItem] = useState<Item | null>(null);
    const [variants, setVariants] = useState<Item[]>([]);
    const [related, setRelated] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    
    // Galería
    const [activeIdx, setActiveIdx] = useState(0);
    const [isVideoActive, setIsVideoActive] = useState(false);
    const [mainImgError, setMainImgError] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);
    
    // Variantes y Cantidades
    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [buyQty, setBuyQty] = useState(1);
    
    const [copied, setCopied] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);

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
        setLoading(true);
        itemService.getPublicItemById(id)
            .then(async data => {
                if (!data) { setNotFound(true); return; }
                setItem(data);
                setSelectedVariantId(data.id);
                
                // Cargar variantes si pertenece a un grupo
                if (data.storeGroup) {
                    const groupItems = await itemService.getPublicItemsByGroup(data.storeGroup);
                    if (groupItems.length > 1) {
                        setVariants(groupItems);
                    }
                }
                
                // Cargar relacionados
                const allPublic = await itemService.getPublicItems();
                const filtered = allPublic.filter(i => i.id !== data.id && (data.storeGroup ? i.storeGroup !== data.storeGroup : true));
                
                let matches = filtered.filter(i => i.category && i.category === data.category);
                if (matches.length < 4) {
                    const rest = filtered.filter(i => !matches.find(m => m.id === i.id));
                    matches = [...matches, ...rest];
                }
                
                const groupedMap = new Map<string, Item>();
                for (const m of matches) {
                    const groupKey = m.storeGroup ? m.storeGroup.trim().toLowerCase() : m.id;
                    if (!groupedMap.has(groupKey)) {
                        groupedMap.set(groupKey, m);
                    }
                }
                
                setRelated(Array.from(groupedMap.values()).slice(0, 4));
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    // Fusionar variantes: nombre + ubicación
    const mergedVariants = (() => {
        const map = new Map<string, { ids: string[]; variantName: string; condition: string; quantity: number; price: number; location: string; repItem: Item }>();
        for (const v of variants) {
            const variantName = (v.storeVariantName || '').trim();
            const location = (v.location || '').trim();
            const key = `${variantName.toLowerCase()}|${location.toLowerCase()}`;
            const price = v.salePrice || v.estimatedSalePrice || 0;
            const ex = map.get(key);
            if (ex) {
                ex.quantity += v.quantity;
                ex.price = Math.max(ex.price, price);
                ex.ids.push(v.id);
            } else {
                map.set(key, { ids: [v.id], variantName, condition: v.condition, quantity: v.quantity, price, location, repItem: v });
            }
        }
        return Array.from(map.values());
    })();

    const hasOptions = mergedVariants.length > 1;

    // Obtener la variante seleccionada actual
    const activeSelectedVariant = (() => {
        if (!hasOptions) return null;
        return mergedVariants.find(v => v.ids.includes(selectedVariantId)) || mergedVariants[0] || null;
    })();

    // Información de precio y stock en base a la selección
    const currentPrice = activeSelectedVariant ? activeSelectedVariant.price : (item ? (item.salePrice || item.estimatedSalePrice || 0) : 0);
    const currentStock = activeSelectedVariant ? activeSelectedVariant.quantity : (item?.quantity ?? 0);
    const currentLocation = activeSelectedVariant ? activeSelectedVariant.location : (item?.location ?? '');
    const currentCondition = activeSelectedVariant ? activeSelectedVariant.condition : (item?.condition ?? 'nuevo');

    useEffect(() => {
        setBuyQty(1);
    }, [selectedVariantId]);

    // Recolectar imágenes del producto y de sus variantes
    const allImages = item
        ? Array.from(new Set([
            item.imageUrl,
            ...(item.storeImages || []),
            ...variants.flatMap(v => [v.imageUrl, ...(v.storeImages || [])]),
        ].filter((u): u is string => !!u)))
        : [];

    const activeUrl = allImages[activeIdx] ?? null;

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleNextImage = () => {
        setIsVideoActive(false);
        setActiveIdx(prev => (prev + 1) % allImages.length);
        setMainImgError(false);
    };

    const handlePrevImage = () => {
        setIsVideoActive(false);
        setActiveIdx(prev => (prev - 1 + allImages.length) % allImages.length);
        setMainImgError(false);
    };

    // Añadir al Carrito
    const handleAddToCart = () => {
        if (!item || currentStock <= 0) return;
        
        const itemId = selectedVariantId || item.id;
        const variantName = activeSelectedVariant?.variantName || item.storeVariantName;
        const image = allImages[0] || item.imageUrl;

        const success = addToCart({
            id: itemId,
            productName: item.productName,
            storeTitle: item.storeTitle || item.productName,
            variantName,
            imageUrl: image,
            price: currentPrice,
            maxQuantity: currentStock,
            location: currentLocation,
            condition: currentCondition,
            storeGroup: item.storeGroup
        }, buyQty);

        if (success) {
            setIsCartOpen(true);
        }
    };

    // Compra Directa por WhatsApp
    const handleDirectBuy = () => {
        if (!item) return;

        const variantDesc = activeSelectedVariant?.variantName ? ` (${activeSelectedVariant.variantName})` : '';
        const locDesc = currentLocation ? `\n   📍 Ubicación: ${currentLocation}` : '';
        const condDesc = conditionLabel[currentCondition] || currentCondition;

        let text = `🛒 *Compra Directa - ${STORE_CONFIG.storeName}*\n`;
        text += `=====================================\n`;
        text += `Me interesa comprar el siguiente artículo:\n\n`;
        text += `*${item.storeTitle || item.productName}*${variantDesc}\n`;
        text += `   Condición: ${condDesc}${locDesc}\n`;
        text += `   Cantidad: ${buyQty} x $${currentPrice.toLocaleString('es-AR')}\n`;
        text += `   Total: $${(buyQty * currentPrice).toLocaleString('es-AR')}\n\n`;
        text += `🔗 Enlace: ${window.location.href}\n`;
        text += `=====================================\n`;
        text += `¡Hola! Me gustaría coordinar la compra de este producto de la tienda.`;

        const url = getWhatsAppUrl(text);
        window.open(url, '_blank');
    };

    // Consulta de Dudas por WhatsApp
    const handleInquiryWhatsApp = () => {
        if (!item) return;
        const variantDesc = activeSelectedVariant?.variantName ? ` (${activeSelectedVariant.variantName})` : '';
        let text = `👋 *Consulta de Producto - ${STORE_CONFIG.storeName}*\n`;
        text += `=====================================\n`;
        text += `Hola Lucas, tengo una consulta sobre:\n`;
        text += `*${item.storeTitle || item.productName}*${variantDesc}\n`;
        text += `🔗 ${window.location.href}\n\n`;
        text += `¿Me podrías brindar más información? ¡Gracias!`;

        const url = getWhatsAppUrl(text);
        window.open(url, '_blank');
    };

    // Compartir por WhatsApp
    const handleShareWhatsApp = () => {
        if (!item) return;
        const title = item.storeTitle || item.productName;
        const price = `$${currentPrice.toLocaleString('es-AR')}`;
        const text = `Mirá este producto en ${STORE_CONFIG.storeName}: *${title}* (${price})\n${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Enviar pedido por WhatsApp desde el Carrito
    const handleCartCheckout = () => {
        if (cart.length === 0) return;
        
        let text = `🛒 *Nuevo Pedido - ${STORE_CONFIG.storeName}*\n`;
        text += `=====================================\n`;
        if (customerName.trim()) {
            text += `*Cliente:* ${customerName.trim()}\n`;
            text += `=====================================\n\n`;
        }
        
        cart.forEach((cItem, index) => {
            const variantDesc = cItem.variantName ? ` (${cItem.variantName})` : '';
            const locationDesc = cItem.location ? `\n   📍 Ubicación: ${cItem.location}` : '';
            const condDesc = conditionLabel[cItem.condition] || cItem.condition;
            
            text += `*${index + 1}. ${cItem.storeTitle || cItem.productName}*${variantDesc}\n`;
            text += `   Condición: ${condDesc}${locationDesc}\n`;
            text += `   Cantidad: ${cItem.quantity} x $${cItem.price.toLocaleString('es-AR')}\n`;
            text += `   Subtotal: $${(cItem.quantity * cItem.price).toLocaleString('es-AR')}\n\n`;
        });
        
        text += `=====================================\n`;
        text += `*Total del Pedido:* $${totalPrice.toLocaleString('es-AR')}\n\n`;
        text += `¡Hola! Me interesa coordinar la compra de estos productos de la tienda.`;
        
        const url = getWhatsAppUrl(text);
        window.open(url, '_blank');
        clearCart();
        setIsCartOpen(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0b1220] transition-colors duration-300">
                <div className="w-12 h-12 border-4 border-gray-200 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-4 font-semibold uppercase tracking-wider">Cargando producto...</p>
            </div>
        );
    }

    if (notFound || !item) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0b1220] flex flex-col items-center justify-center gap-4 text-center px-4 transition-colors duration-300">
                <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center shadow-inner mb-2">
                    <X className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Producto no disponible</h1>
                <p className="text-gray-500 dark:text-slate-400 max-w-xs text-sm">El artículo que estás buscando no existe o ya no se encuentra publicado en la tienda.</p>
                <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a la tienda</span>
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/80 dark:bg-[#0b1220] text-gray-900 dark:text-gray-100 transition-colors duration-300 pb-28 md:pb-16">
            {/* Header / Barra de Navegación */}
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800/80 shadow-xs">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    {/* Botón Volver */}
                    <a 
                        href="/" 
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Catálogo</span>
                    </a>

                    {/* Botones de acción Header */}
                    <div className="flex items-center gap-2">
                        {/* Botón Compartir Rápido */}
                        <button
                            onClick={handleShareWhatsApp}
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:scale-105 transition-all shadow-xs"
                            title="Compartir por WhatsApp"
                        >
                            <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </button>

                        {/* Botón Modo Oscuro */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:scale-105 transition-all shadow-xs"
                            title="Cambiar tema"
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

            {/* Breadcrumb Navigation Bar */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-2">
                <nav className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <a href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        Inicio
                    </a>
                    <BreadcrumbSeparator className="w-3.5 h-3.5 shrink-0" />
                    {item.category ? (
                        <>
                            <span className="text-gray-600 dark:text-slate-300 font-medium">
                                {item.category}
                            </span>
                            <BreadcrumbSeparator className="w-3.5 h-3.5 shrink-0" />
                        </>
                    ) : null}
                    <span className="text-gray-900 dark:text-white font-semibold truncate max-w-[200px] sm:max-w-xs">
                        {item.storeTitle || item.productName}
                    </span>
                </nav>
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-10">
                {/* CAJA PRINCIPAL DEL PRODUCTO */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-150 dark:border-slate-800 overflow-hidden transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-4">
                        
                        {/* SECCIÓN IZQUIERDA: GALERÍA DE IMÁGENES & MEDIA */}
                        <div className="md:col-span-6 p-4 sm:p-6 lg:p-8">
                            <div className="md:sticky md:top-24 space-y-3.5 self-start">
                                
                                {/* Visualizador Principal (Foto o Video) */}
                                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-950 border border-gray-200/80 dark:border-slate-800 relative group/viewer shadow-xs">
                                    {/* Badges Flotantes sobre la Imagen */}
                                    <div className="absolute top-3.5 left-3.5 z-10 flex flex-wrap gap-2 pointer-events-none">
                                        <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm ${conditionColor[currentCondition] || conditionColor.nuevo}`}>
                                            {conditionLabel[currentCondition] || currentCondition}
                                        </span>
                                        {currentStock > 0 ? (
                                            <span className="bg-emerald-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                                                En stock ({currentStock})
                                            </span>
                                        ) : (
                                            <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                                                Sin stock
                                            </span>
                                        )}
                                    </div>

                                    {/* Si el video está activo en el visor principal */}
                                    {isVideoActive && item.storeVideoUrl ? (
                                        <div className="w-full h-full flex items-center justify-center bg-black">
                                            <VideoPlayer url={item.storeVideoUrl} />
                                        </div>
                                    ) : activeUrl && !mainImgError ? (
                                        <>
                                            <img
                                                key={activeUrl}
                                                src={activeUrl}
                                                alt={item.productName}
                                                className="w-full h-full object-cover select-none transition-transform duration-500 md:group-hover/viewer:scale-105"
                                                onError={() => setMainImgError(true)}
                                            />
                                            
                                            {/* Botones de navegación sobre imagen (Desktop & Mobile) */}
                                            {allImages.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={handlePrevImage}
                                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center opacity-80 md:opacity-0 md:group-hover/viewer:opacity-100 transition-all cursor-pointer shadow-md"
                                                        aria-label="Imagen anterior"
                                                    >
                                                        <ChevronLeft className="w-6 h-6" />
                                                    </button>
                                                    <button
                                                        onClick={handleNextImage}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center opacity-80 md:opacity-0 md:group-hover/viewer:opacity-100 transition-all cursor-pointer shadow-md"
                                                        aria-label="Imagen siguiente"
                                                    >
                                                        <ChevronRight className="w-6 h-6" />
                                                    </button>
                                                </>
                                            )}
                                            
                                            {/* Botón de Zoom Modal */}
                                            <button
                                                onClick={() => setShowLightbox(true)}
                                                className="absolute bottom-3.5 right-3.5 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center opacity-90 md:opacity-0 md:group-hover/viewer:opacity-100 transition-all cursor-pointer shadow-md"
                                                title="Expandir imagen a pantalla completa"
                                            >
                                                <Maximize2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <ImagePlaceholder />
                                    )}
                                </div>

                                {/* Indicadores de Puntos para Mobile */}
                                {allImages.length > 1 && !isVideoActive && (
                                    <div className="flex items-center justify-center gap-1.5 md:hidden py-1">
                                        {allImages.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setIsVideoActive(false); setActiveIdx(i); setMainImgError(false); }}
                                                className={`h-1.5 rounded-full transition-all ${
                                                    i === activeIdx 
                                                    ? 'w-6 bg-indigo-600 dark:bg-indigo-400' 
                                                    : 'w-1.5 bg-gray-300 dark:bg-slate-700'
                                                }`}
                                                aria-label={`Ver imagen ${i + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Tira de Miniaturas de imágenes y botón de Video */}
                                {(allImages.length > 1 || item.storeVideoUrl) && (
                                    <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar pt-1">
                                        {/* Miniaturas de Fotos */}
                                        {allImages.map((url, i) => (
                                            <button
                                                key={url}
                                                onClick={() => { setIsVideoActive(false); setActiveIdx(i); setMainImgError(false); }}
                                                className={`shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer bg-white dark:bg-slate-900 ${
                                                    !isVideoActive && i === activeIdx 
                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 scale-[1.02] shadow-sm' 
                                                    : 'border-gray-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}

                                        {/* Botón de Miniatura para Video */}
                                        {item.storeVideoUrl && (
                                            <button
                                                onClick={() => setIsVideoActive(true)}
                                                className={`shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                                                    isVideoActive
                                                    ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 ring-2 ring-red-500/20 scale-[1.02]'
                                                    : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 text-gray-500 dark:text-slate-400 opacity-70 hover:opacity-100'
                                                }`}
                                                title="Ver video del producto"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center">
                                                    <Play className="w-3 h-3 fill-current ml-0.5" />
                                                </div>
                                                <span className="text-[10px] font-bold">Video</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECCIÓN DERECHA: INFORMACIÓN, OPCIONES Y COMPRA */}
                        <div className="md:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col gap-6">
                            
                            {/* Encabezado: Categoría + Ubicación + Título */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {item.category && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full uppercase tracking-wider">
                                            <Tag className="w-3 h-3" />
                                            {item.category}
                                        </span>
                                    )}
                                    {currentLocation && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                            <MapPin className="w-3 h-3 text-indigo-500" />
                                            {currentLocation}
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
                                    {item.storeTitle || item.productName}
                                </h1>
                            </div>

                            {/* Tarjeta de Precio y Disponibilidad */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-pink-50/30 dark:from-slate-800/50 dark:via-slate-800/30 dark:to-slate-800/20 border border-indigo-100/80 dark:border-slate-800 flex items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">Precio</span>
                                    <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight mt-0.5">
                                        ${currentPrice.toLocaleString('es-AR')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                        currentStock > 0 
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${currentStock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        {currentStock > 0 ? `${currentStock} en stock` : 'Agotado'}
                                    </span>
                                </div>
                            </div>

                            {/* Variantes (Opciones del grupo) */}
                            {hasOptions && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                                                Seleccionar Opción
                                            </h3>
                                        </div>
                                        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400 px-2.5 py-0.5 rounded-full">
                                            {mergedVariants.length} opciones disponibles
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5">
                                        {mergedVariants.map(v => {
                                            const isSelected = v.ids.includes(selectedVariantId);
                                            return (
                                                <button
                                                    key={v.ids[0]}
                                                    onClick={() => setSelectedVariantId(v.ids[0])}
                                                    disabled={v.quantity <= 0}
                                                    className={`w-full flex items-center justify-between gap-3 text-left rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer ${
                                                        v.quantity <= 0 
                                                        ? 'opacity-40 border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-400 cursor-not-allowed'
                                                        : isSelected
                                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30 shadow-xs'
                                                        : 'border-gray-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-slate-600'
                                                            }`}>
                                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                            </div>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                                {v.variantName || 'Opción principal'}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 pl-6">
                                                            Condición: <strong className="font-semibold text-gray-700 dark:text-slate-300">{conditionLabel[v.condition] || v.condition}</strong>
                                                            {v.location ? ` · 📍 ${v.location}` : ''}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                                                            ${v.price.toLocaleString('es-AR')}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            v.quantity > 0 
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                                                            : 'bg-rose-50 text-rose-500'
                                                        }`}>
                                                            {v.quantity > 0 ? `${v.quantity} disp.` : 'Agotado'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Selector de Cantidad a Comprar */}
                            {currentStock > 0 && (
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/70 dark:bg-slate-950/40 border border-gray-200/70 dark:border-slate-800/80">
                                    <div>
                                        <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">Cantidad</span>
                                        <span className="text-[11px] text-gray-400 dark:text-slate-500">{currentStock} unidades disponibles</span>
                                    </div>
                                    <div className="flex items-center gap-1 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 p-1 shadow-2xs">
                                        <button
                                            onClick={() => setBuyQty(prev => Math.max(1, prev - 1))}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 cursor-pointer disabled:opacity-30"
                                            disabled={buyQty <= 1}
                                            aria-label="Disminuir cantidad"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-9 text-center text-sm font-bold text-gray-900 dark:text-white select-none">
                                            {buyQty}
                                        </span>
                                        <button
                                            onClick={() => setBuyQty(prev => Math.min(currentStock, prev + 1))}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 cursor-pointer disabled:opacity-30"
                                            disabled={buyQty >= currentStock}
                                            aria-label="Aumentar cantidad"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Acciones Principales de Compra (Desktop y Tablets) */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                {currentStock > 0 ? (
                                    <>
                                        {/* Botón Carrito */}
                                        <button
                                            onClick={handleAddToCart}
                                            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/60 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-sm font-bold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                            <span>Agregar al Carrito</span>
                                        </button>

                                        {/* Botón Compra Directa por WhatsApp */}
                                        <button
                                            onClick={handleDirectBuy}
                                            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-emerald-600/20"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.977 14.113.953 11.483.951c-5.44 0-9.866 4.369-9.87 9.8-.001 1.702.463 3.364 1.34 4.825l-.93 3.398 3.484-.903-.002-.002z" />
                                            </svg>
                                            <span>Comprar por WhatsApp</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full py-4 px-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 rounded-2xl text-center">
                                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Sin stock disponible</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Este producto/opción se encuentra agotado momentáneamente.</p>
                                    </div>
                                )}
                            </div>

                            {/* Botón de Consulta / Dudas */}
                            <button
                                onClick={handleInquiryWhatsApp}
                                type="button"
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-300 transition-all cursor-pointer"
                            >
                                <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                                <span>¿Tenés dudas? Consultanos directo por WhatsApp</span>
                            </button>

                            {/* Enlace para compartir */}
                            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
                                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Compartir Producto</span>
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 px-3 py-2">
                                    <p className="text-xs text-gray-500 dark:text-slate-400 flex-1 truncate select-all">{window.location.href}</p>
                                    <button
                                        onClick={copyLink}
                                        className="shrink-0 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:scale-105 transition-all p-1 cursor-pointer"
                                        title="Copiar link"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN DEDICADA DE DESCRIPCIÓN Y ESPECIFICACIONES (Ancho Completo, Sin Huecos) */}
                {item.description && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 lg:p-10 border border-gray-150 dark:border-slate-800 shadow-xs">
                        <FormattedDescription 
                            description={item.description} 
                            maxInitialLines={15}
                        />
                    </div>
                )}


                {/* SECCIÓN DEDICADA DE VIDEO DE DEMOSTRACIÓN (Si el producto tiene video) */}
                {item.storeVideoUrl && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-150 dark:border-slate-800 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    Video de Demostración
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                    Mirá el producto en funcionamiento real
                                </p>
                            </div>
                        </div>
                        <div className="max-w-3xl mx-auto pt-2">
                            <VideoPlayer url={item.storeVideoUrl} />
                        </div>
                    </div>
                )}

                {/* BENEFICIOS / COMPRA SEGURA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center gap-4 shadow-2xs">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Compra Transparente</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Trato directo con el vendedor sin comisiones ocultas.</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center gap-4 shadow-2xs">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Entrega & Retiro</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Coordiná el punto de entrega o envío a conveniencia.</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center gap-4 shadow-2xs">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Atención Inmediata</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Respuesta rápida por WhatsApp para cualquier consulta.</p>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN: PRODUCTOS RECOMENDADOS */}
                {related.length > 0 && (
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Otros productos recomendados</h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Artículos seleccionados de nuestro catálogo</p>
                            </div>
                            <a href="/" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Ver catálogo completo →</a>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                            {related.map(r => {
                                const rPrice = r.salePrice || r.estimatedSalePrice || 0;
                                return (
                                    <a
                                        key={r.id}
                                        href={`/producto/${r.id}`}
                                        className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs border border-gray-100 dark:border-slate-800 flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                    >
                                        <div className="aspect-square bg-gray-50 dark:bg-slate-950 overflow-hidden relative">
                                            {r.imageUrl ? (
                                                <img src={r.imageUrl} alt={r.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-200 dark:text-slate-800">
                                                    <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3.5 flex flex-col gap-1 flex-1">
                                            <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 min-h-[2rem] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {r.storeTitle || r.productName}
                                            </h4>
                                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50 dark:border-slate-800/80">
                                                <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                    ${rPrice.toLocaleString('es-AR')}
                                                </p>
                                                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">Ver →</span>
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* BARRA DE ACCIÓN FLOTANTE / STICKY EN MOBILE */}
            <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-200/80 dark:border-slate-800 p-3 safe-bottom shadow-2xl transition-transform animate-in slide-in-from-bottom-5">
                <div className="flex items-center gap-3">
                    {/* Precio y Opción */}
                    <div className="min-w-0 shrink-0">
                        <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase font-bold block">
                            {activeSelectedVariant?.variantName || 'Precio'}
                        </span>
                        <div className="text-lg font-extrabold text-gray-900 dark:text-white leading-none">
                            ${currentPrice.toLocaleString('es-AR')}
                        </div>
                    </div>

                    {/* Botones de Acción Mobile */}
                    <div className="flex items-center gap-2 flex-1">
                        {currentStock > 0 ? (
                            <>
                                <button
                                    onClick={handleAddToCart}
                                    className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:scale-105 active:scale-95 transition-all"
                                    title="Agregar al carrito"
                                    aria-label="Agregar al carrito"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDirectBuy}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all truncate"
                                >
                                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.739-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.59 1.977 14.113.953 11.483.951c-5.44 0-9.866 4.369-9.87 9.8-.001 1.702.463 3.364 1.34 4.825l-.93 3.398 3.484-.903-.002-.002z" />
                                    </svg>
                                    <span>Comprar WhatsApp</span>
                                </button>
                            </>
                        ) : (
                            <div className="flex-1 py-2 px-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-center rounded-xl font-bold text-xs">
                                Agotado
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LIGHTBOX MODAL (VISOR FULLSCREEN) */}
            {showLightbox && activeUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-in fade-in duration-300">
                    <button
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
                        aria-label="Cerrar visor"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    {allImages.length > 1 && (
                        <>
                            <button
                                onClick={handlePrevImage}
                                className="absolute left-4 sm:left-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
                                aria-label="Anterior"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={handleNextImage}
                                className="absolute right-4 sm:right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
                                aria-label="Siguiente"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    <div className="max-w-4xl max-h-[85vh] px-4 flex items-center justify-center">
                        <img 
                            src={activeUrl} 
                            alt="" 
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl animate-in zoom-in-95 duration-300 shadow-2xl" 
                        />
                    </div>
                    
                    {/* Contador inferior */}
                    <div className="absolute bottom-6 bg-white/15 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider">
                        {activeIdx + 1} de {allImages.length}
                    </div>
                </div>
            )}

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
                                        onClick={handleCartCheckout}
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
