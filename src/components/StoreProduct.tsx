import { useState, useEffect, useRef } from 'react';
import { itemService } from '../services/itemService';
import type { Item } from '../types';
import { useCart } from '../contexts/CartContext';
import { getWhatsAppUrl, STORE_CONFIG } from '../config/storeConfig';
import FormattedDescription from './FormattedDescription';
import { ProductCard } from './ProductCard';
import { SiteFooter, SiteHeader, TopStrip, WhatsAppIcon } from './SiteChrome';
import CartDrawer, { QtyStepper } from './CartDrawer';
import { conditionLabel, formatPrice, priceOf, capitalize } from '../lib/format';
import {
    X,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    ShoppingCart,
    ArrowLeft,
    Share2,
    MessageCircle,
    MapPin,
    Play,
} from 'lucide-react';

const conditionChip: Record<string, string> = {
    nuevo: 'bg-ink text-bg',
    semi_uso: 'bg-surface text-ink border border-ink',
    usado: 'bg-sunken text-ink border border-line',
};

function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
}

const TIKTOK_URL_RE = /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i;

// ID numérico directo desde la URL (www.tiktok.com/@user/video/<id>, /v/<id>, /embed/v2/<id>)
function getTikTokId(url: string): string | null {
    return url.match(/tiktok\.com\/(?:@[^/?#]+\/video\/|v\/|embed\/v2\/)(\d{6,})/i)?.[1] ?? null;
}

// Links cortos (vm./vt.) no traen el ID: se resuelve vía oEmbed, que responde
// con CORS abierto y el HTML del embed contiene data-video-id="<id>".
async function resolveTikTokId(url: string): Promise<string | null> {
    const direct = getTikTokId(url);
    if (direct) return direct;
    try {
        const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
        if (!res.ok) return null;
        const html = String((await res.json()).html || '');
        return html.match(/data-video-id="(\d+)"/)?.[1] ?? html.match(/tiktok\.com\/[^"]*?video\/(\d{6,})/)?.[1] ?? null;
    } catch {
        return null;
    }
}

function TikTokEmbed({ url }: { url: string }) {
    const [videoId, setVideoId] = useState<string | null>(() => getTikTokId(url));

    useEffect(() => {
        let cancelled = false;
        setVideoId(getTikTokId(url));
        resolveTikTokId(url).then(id => { if (!cancelled && id) setVideoId(id); });
        return () => { cancelled = true; };
    }, [url]);

    if (!videoId) {
        // Sin ID (link corto caído o red bloqueada): botón que abre TikTok
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full aspect-video rounded-[2px] bg-night text-on-night hover:bg-ink-2 transition-colors"
            >
                <Play className="w-6 h-6 fill-current" aria-hidden="true" />
                <span className="font-semibold">Ver video en TikTok</span>
            </a>
        );
    }
    // Los TikTok son verticales (9:16): alto por viewport, ancho derivado.
    return (
        <iframe
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            title="Video de TikTok"
            className="mx-auto rounded-[2px] bg-night border border-line"
            style={{ height: 'min(70vh, 620px)', width: 'auto', maxWidth: '100%', aspectRatio: '9 / 16' }}
        />
    );
}

function VideoPlayer({ url }: { url: string }) {
    const ytId = getYouTubeId(url);
    if (ytId) {
        return (
            <div className="relative w-full aspect-video rounded-[2px] overflow-hidden bg-night border border-line">
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
    if (TIKTOK_URL_RE.test(url)) {
        return <TikTokEmbed url={url} />;
    }
    return (
        <video
            src={url}
            controls
            className="w-full rounded-[2px] bg-night border border-line"
            style={{ maxHeight: '480px' }}
        />
    );
}

function ImagePlaceholder() {
    return (
        <div className="w-full h-full flex items-center justify-center hatch">
            <span className="label-mono text-muted">Sin imagen</span>
        </div>
    );
}

export default function StoreProduct({ id }: { id: string }) {
    const { addToCart } = useCart();

    const [item, setItem] = useState<Item | null>(null);
    const [variants, setVariants] = useState<Item[]>([]);
    const [related, setRelated] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Galería
    const [activeIdx, setActiveIdx] = useState(0);
    const videoSectionRef = useRef<HTMLDivElement>(null);
    const [mainImgError, setMainImgError] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);

    // Variantes y Cantidades
    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [buyQty, setBuyQty] = useState(1);

    const [copied, setCopied] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

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

    useEffect(() => {
        if (item) document.title = `${item.storeTitle || item.productName} · ${STORE_CONFIG.storeName}`;
    }, [item]);

    // Fusionar variantes: nombre + ubicación
    const mergedVariants = (() => {
        const map = new Map<string, { ids: string[]; variantName: string; condition: string; quantity: number; price: number; location: string; repItem: Item }>();
        for (const v of variants) {
            const variantName = (v.storeVariantName || '').trim();
            const location = (v.location || '').trim();
            const key = `${variantName.toLowerCase()}|${location.toLowerCase()}`;
            const price = priceOf(v);
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

    const activeSelectedVariant = (() => {
        if (!hasOptions) return null;
        return mergedVariants.find(v => v.ids.includes(selectedVariantId)) || mergedVariants[0] || null;
    })();

    const currentPrice = activeSelectedVariant ? activeSelectedVariant.price : (item ? priceOf(item) : 0);
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
        setActiveIdx(prev => (prev + 1) % allImages.length);
        setMainImgError(false);
    };

    const handlePrevImage = () => {
        setActiveIdx(prev => (prev - 1 + allImages.length) % allImages.length);
        setMainImgError(false);
    };

    // Teclado en el visor: Escape cierra, flechas navegan
    useEffect(() => {
        if (!showLightbox) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowLightbox(false);
            if (allImages.length > 1 && e.key === 'ArrowRight') handleNextImage();
            if (allImages.length > 1 && e.key === 'ArrowLeft') handlePrevImage();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

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

        window.open(getWhatsAppUrl(text), '_blank');
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

        window.open(getWhatsAppUrl(text), '_blank');
    };

    // Compartir por WhatsApp
    const handleShareWhatsApp = () => {
        if (!item) return;
        const title = item.storeTitle || item.productName;
        const text = `Mirá este producto en ${STORE_CONFIG.storeName}: *${title}* (${formatPrice(currentPrice)})\n${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const backLink = (
        <a
            href="/"
            className="inline-flex items-center justify-center w-11 h-11 -ml-2 text-ink hover:text-signal-ink transition-colors"
            aria-label="Volver al catálogo"
        >
            <ArrowLeft className="w-5 h-5" />
        </a>
    );

    const shareButton = item ? (
        <button
            type="button"
            onClick={handleShareWhatsApp}
            className="hidden sm:inline-flex w-11 h-11 items-center justify-center rounded-[2px] border border-line text-ink hover:border-ink transition-colors cursor-pointer"
            aria-label="Compartir por WhatsApp"
            title="Compartir por WhatsApp"
        >
            <Share2 className="w-4 h-4" />
        </button>
    ) : null;

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-bg text-ink" aria-busy="true">
                <div className="w-12 h-12 border-4 border-line border-t-signal rounded-full animate-spin" />
                <p className="label-mono text-muted">Cargando producto…</p>
            </div>
        );
    }

    if (notFound || !item) {
        return (
            <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center gap-4 text-center px-4">
                <p className="label-mono text-muted">Error 404</p>
                <h1 className="font-display font-black uppercase text-5xl leading-[0.9]">Producto no disponible</h1>
                <p className="text-muted max-w-xs">Este artículo no existe o ya no está publicado en la tienda.</p>
                <a href="/" className="inline-flex items-center gap-2 min-h-12 px-6 rounded-[2px] bg-signal text-on-signal font-semibold">
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    Volver a la tienda
                </a>
            </div>
        );
    }

    const title = item.storeTitle || item.productName;

    return (
        <div className="min-h-screen bg-bg text-ink pb-24 md:pb-0">
            <TopStrip />
            <SiteHeader onOpenCart={() => setIsCartOpen(true)} leading={backLink} extraActions={shareButton} />

            <nav aria-label="Ruta" className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
                <ol className="flex items-center gap-2 label-mono text-muted overflow-x-auto no-scrollbar whitespace-nowrap">
                    <li><a href="/" className="hover:text-ink transition-colors">Inicio</a></li>
                    <li aria-hidden="true">/</li>
                    {item.category && (
                        <>
                            <li>{item.category}</li>
                            <li aria-hidden="true">/</li>
                        </>
                    )}
                    <li className="text-ink truncate max-w-[220px] sm:max-w-md" aria-current="page">{title}</li>
                </ol>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-12">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* GALERÍA */}
                    <div className="md:col-span-7 md:sticky md:top-24 flex flex-col gap-3">
                        <div
                            className="relative flex items-center justify-center bg-surface border border-line rounded-[2px] overflow-hidden group/viewer"
                            style={{ minHeight: '280px', maxHeight: '72vh' }}
                        >
                            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-none">
                                <span className={`label-mono px-2 py-1 ${conditionChip[currentCondition] || conditionChip.nuevo}`}>
                                    {conditionLabel[currentCondition] || currentCondition}
                                </span>
                                {currentStock === 1 && (
                                    <span className="label-mono px-2 py-1 bg-signal text-on-signal font-medium">Última unidad</span>
                                )}
                            </div>

                            {activeUrl && !mainImgError ? (
                                <>
                                    <img
                                        key={activeUrl}
                                        src={activeUrl}
                                        alt={title}
                                        className="w-full h-auto max-h-[72vh] object-contain select-none"
                                        onError={() => setMainImgError(true)}
                                    />

                                    {allImages.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handlePrevImage}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-[2px] bg-night/70 hover:bg-night text-on-night flex items-center justify-center md:opacity-0 md:group-hover/viewer:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                                                aria-label="Imagen anterior"
                                            >
                                                <ChevronLeft className="w-6 h-6" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleNextImage}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-[2px] bg-night/70 hover:bg-night text-on-night flex items-center justify-center md:opacity-0 md:group-hover/viewer:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                                                aria-label="Imagen siguiente"
                                            >
                                                <ChevronRight className="w-6 h-6" />
                                            </button>
                                            <span className="absolute bottom-3 left-3 label-mono px-2 py-1 bg-night/70 text-on-night">
                                                {activeIdx + 1} / {allImages.length}
                                            </span>
                                        </>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setShowLightbox(true)}
                                        className="absolute bottom-3 right-3 w-11 h-11 rounded-[2px] bg-night/70 hover:bg-night text-on-night flex items-center justify-center md:opacity-0 md:group-hover/viewer:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                                        aria-label="Ver imagen en pantalla completa"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="w-full aspect-square">
                                    <ImagePlaceholder />
                                </div>
                            )}
                        </div>

                        {(allImages.length > 1 || item.storeVideoUrl) && (
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {allImages.map((url, i) => (
                                    <button
                                        key={url}
                                        type="button"
                                        onClick={() => { setActiveIdx(i); setMainImgError(false); }}
                                        aria-label={`Ver foto ${i + 1}`}
                                        aria-current={i === activeIdx}
                                        className={`shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[2px] overflow-hidden bg-surface cursor-pointer transition ${
                                            i === activeIdx ? 'border-2 border-ink' : 'border border-line opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}

                                {item.storeVideoUrl && (
                                    <button
                                        type="button"
                                        onClick={() => videoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                        className="shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[2px] border border-line bg-night text-on-night flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-ink"
                                        aria-label="Ir al video del producto"
                                    >
                                        <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                                        <span className="label-mono">Video</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* INFORMACIÓN Y COMPRA */}
                    <div className="md:col-span-5 flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                {item.category && <span className="label-mono text-muted">{item.category}</span>}
                                {currentLocation && (
                                    <span className="label-mono text-muted inline-flex items-center gap-1">
                                        <MapPin className="w-3 h-3" aria-hidden="true" />
                                        {capitalize(currentLocation)}
                                    </span>
                                )}
                            </div>
                            <h1 className="font-display font-black uppercase leading-[0.9] text-[clamp(40px,4.6vw,60px)] break-words">
                                {title}
                            </h1>
                        </div>

                        <div className="py-4 border-y border-line flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <span className="label-mono text-muted block">Precio</span>
                                <span className="font-mono font-medium text-[40px] leading-none text-ink">{formatPrice(currentPrice)}</span>
                            </div>
                            <span
                                className={`label-mono px-2.5 py-1.5 ${
                                    currentStock === 1 ? 'bg-signal text-on-signal font-medium' : currentStock > 0 ? 'bg-ink text-bg' : 'border border-line text-muted'
                                }`}
                            >
                                {currentStock === 1 ? 'Última unidad' : currentStock > 0 ? `${currentStock} en stock` : 'Agotado'}
                            </span>
                        </div>

                        {hasOptions && (
                            <fieldset className="flex flex-col gap-2.5">
                                <legend className="label-mono text-muted mb-2.5">
                                    Elegí una opción · {mergedVariants.length} disponibles
                                </legend>
                                {mergedVariants.map(v => {
                                    const isSelected = v.ids.includes(selectedVariantId) || (activeSelectedVariant === v);
                                    const soldOut = v.quantity <= 0;
                                    return (
                                        <button
                                            key={v.ids[0]}
                                            type="button"
                                            onClick={() => setSelectedVariantId(v.ids[0])}
                                            disabled={soldOut}
                                            aria-pressed={isSelected}
                                            className={`w-full flex items-center justify-between gap-3 text-left rounded-[2px] p-3.5 transition-colors cursor-pointer disabled:cursor-not-allowed ${
                                                soldOut
                                                    ? 'opacity-40 border border-line bg-surface'
                                                    : isSelected
                                                    ? 'border-2 border-ink bg-sunken'
                                                    : 'border border-line bg-surface hover:border-ink'
                                            }`}
                                        >
                                            <span className="flex items-start gap-3 min-w-0">
                                                <span
                                                    className={`mt-1 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-ink' : 'border-muted'}`}
                                                    aria-hidden="true"
                                                >
                                                    {isSelected && <span className="w-2 h-2 rounded-full bg-signal" />}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block font-semibold text-ink truncate">{v.variantName || 'Opción principal'}</span>
                                                    <span className="block text-xs text-muted mt-0.5">
                                                        {conditionLabel[v.condition] || v.condition}
                                                        {v.location ? ` · ${capitalize(v.location)}` : ''}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="flex flex-col items-end gap-0.5 shrink-0">
                                                <span className="font-mono font-medium text-ink">{formatPrice(v.price)}</span>
                                                <span className={`text-xs ${v.quantity === 1 ? 'text-signal-ink font-semibold' : 'text-muted'}`}>
                                                    {v.quantity === 1 ? 'Última unidad' : v.quantity > 0 ? `${v.quantity} disp.` : 'Agotado'}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </fieldset>
                        )}

                        {currentStock > 0 ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-4">
                                    <QtyStepper value={buyQty} max={currentStock} onChange={setBuyQty} />
                                    <span className="text-sm text-muted">{currentStock} unidad{currentStock !== 1 ? 'es' : ''} disponible{currentStock !== 1 ? 's' : ''}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddToCart}
                                    className="w-full inline-flex items-center justify-center gap-2 min-h-14 rounded-[2px] bg-signal text-on-signal font-semibold text-base hover:brightness-95 active:translate-y-px transition cursor-pointer"
                                >
                                    <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                                    Agregar al carrito
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDirectBuy}
                                    className="w-full inline-flex items-center justify-center gap-2 min-h-13 rounded-[2px] border-2 border-ink text-ink font-semibold hover:bg-ink hover:text-bg transition-colors cursor-pointer"
                                >
                                    <WhatsAppIcon className="w-4 h-4" />
                                    Comprar directo por WhatsApp
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 border-2 border-ink rounded-[2px]">
                                <p className="font-semibold text-ink">Sin stock por ahora</p>
                                <p className="text-sm text-muted mt-1">Esta opción está agotada. Consultanos si vuelve a entrar.</p>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleInquiryWhatsApp}
                            className="self-start inline-flex items-center gap-2 min-h-11 text-sm font-semibold text-ink underline underline-offset-4 decoration-line hover:decoration-ink cursor-pointer"
                        >
                            <MessageCircle className="w-4 h-4" aria-hidden="true" />
                            ¿Tenés dudas? Consultanos por WhatsApp
                        </button>

                        <dl className="bg-night text-on-night font-mono text-[13px] rounded-[2px]">
                            {[
                                ['Entrega', 'Retiro en el día o envío coordinado'],
                                ['Compra', 'Trato directo, sin comisiones ocultas'],
                                ['Atención', 'Respuesta rápida por WhatsApp'],
                            ].map(([k, v], i) => (
                                <div key={k} className={`flex gap-3 px-4 py-3 ${i > 0 ? 'border-t border-night-line' : ''}`}>
                                    <dt className="w-24 shrink-0 uppercase tracking-[0.08em] text-night-muted">{k}</dt>
                                    <dd className="m-0">{v}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="flex flex-col gap-2">
                            <span className="label-mono text-muted">Compartir producto</span>
                            <div className="flex items-center gap-2 h-11 pl-3 pr-1 bg-surface border border-line rounded-[2px]">
                                <p className="font-mono text-xs text-muted flex-1 truncate select-all">{window.location.href}</p>
                                <button
                                    type="button"
                                    onClick={copyLink}
                                    className="w-9 h-9 shrink-0 inline-flex items-center justify-center text-ink cursor-pointer"
                                    aria-label={copied ? 'Link copiado' : 'Copiar link'}
                                >
                                    {copied ? <Check className="w-4 h-4 text-signal-ink" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {item.description && (
                    <section className="bg-surface border border-line rounded-[2px] p-5 sm:p-8">
                        <FormattedDescription description={item.description} maxInitialLines={15} />
                    </section>
                )}

                {item.storeVideoUrl && (
                    <section ref={videoSectionRef} className="scroll-mt-24 flex flex-col gap-4" aria-labelledby="video-title">
                        <div>
                            <h2 id="video-title" className="font-display font-black uppercase text-4xl leading-none">Video</h2>
                            <p className="text-sm text-muted mt-1">El producto funcionando de verdad.</p>
                        </div>
                        <div className="max-w-3xl w-full">
                            <VideoPlayer url={item.storeVideoUrl} />
                        </div>
                    </section>
                )}

                {related.length > 0 && (
                    <section className="flex flex-col gap-5 pt-2" aria-labelledby="related-title">
                        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
                            <h2 id="related-title" className="font-display font-black uppercase text-4xl sm:text-5xl leading-[0.9]">
                                También te puede servir
                            </h2>
                            <a href="/" className="min-h-11 inline-flex items-center font-semibold text-ink underline underline-offset-4">
                                Ver todo el catálogo →
                            </a>
                        </div>
                        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {related.map(r => (
                                <li key={r.id} className="flex">
                                    <ProductCard entry={{ rep: r, variants: [r] }} />
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>

            <div className="mt-8">
                <SiteFooter />
            </div>

            {/* BARRA FIJA EN MÓVIL */}
            <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-bg border-t border-line px-4 pt-3 safe-bottom">
                <div className="flex items-center gap-3">
                    <div className="min-w-0 shrink-0">
                        <span className="label-mono text-muted block truncate max-w-[9rem]">
                            {activeSelectedVariant?.variantName || 'Precio'}
                        </span>
                        <span className="font-mono font-medium text-xl text-ink leading-none">{formatPrice(currentPrice)}</span>
                    </div>
                    {currentStock > 0 ? (
                        <div className="flex items-center gap-2 flex-1">
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                className="flex-1 inline-flex items-center justify-center gap-2 min-h-12 rounded-[2px] bg-signal text-on-signal font-semibold cursor-pointer"
                            >
                                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                                Agregar
                            </button>
                            <button
                                type="button"
                                onClick={handleDirectBuy}
                                className="w-12 h-12 inline-flex items-center justify-center rounded-[2px] border-2 border-ink text-ink cursor-pointer"
                                aria-label="Comprar directo por WhatsApp"
                            >
                                <WhatsAppIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <span className="flex-1 min-h-12 inline-flex items-center justify-center border border-line text-muted font-semibold rounded-[2px]">
                            Agotado
                        </span>
                    )}
                </div>
            </div>

            {/* VISOR A PANTALLA COMPLETA */}
            {showLightbox && activeUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-night/95 select-none animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Visor de fotos"
                    onClick={e => { if (e.target === e.currentTarget) setShowLightbox(false); }}
                >
                    <button
                        type="button"
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-4 right-4 w-12 h-12 rounded-[2px] border border-night-line text-on-night hover:bg-night-line flex items-center justify-center cursor-pointer"
                        aria-label="Cerrar visor"
                        autoFocus
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {allImages.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={handlePrevImage}
                                className="absolute left-3 sm:left-8 w-12 h-12 rounded-[2px] border border-night-line text-on-night hover:bg-night-line flex items-center justify-center cursor-pointer"
                                aria-label="Anterior"
                            >
                                <ChevronLeft className="w-7 h-7" />
                            </button>
                            <button
                                type="button"
                                onClick={handleNextImage}
                                className="absolute right-3 sm:right-8 w-12 h-12 rounded-[2px] border border-night-line text-on-night hover:bg-night-line flex items-center justify-center cursor-pointer"
                                aria-label="Siguiente"
                            >
                                <ChevronRight className="w-7 h-7" />
                            </button>
                        </>
                    )}

                    <img src={activeUrl} alt={title} className="max-w-[calc(100%-7rem)] max-h-[80vh] object-contain" />

                    <span className="absolute bottom-6 label-mono text-on-night">
                        {activeIdx + 1} / {allImages.length}
                    </span>
                </div>
            )}

            <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
        </div>
    );
}
