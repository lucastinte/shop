import { useState } from 'react';
import { ArrowUpRight, Images, Layers, MapPin } from 'lucide-react';
import type { Item } from '../types';
import { conditionLabel, formatPrice, priceOf, capitalize } from '../lib/format';

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

/** Stock total de una entrada (suma de variantes) */
export function entryStock(entry: StoreEntry): number {
    return entry.variants.reduce((acc, v) => acc + v.quantity, 0);
}

/** Limpia y extrae un preview legible de la descripción para la tarjeta */
function cleanDescriptionPreview(desc?: string): string {
    if (!desc) return '';
    return desc
        .replace(/^[-*•✓✔+→▪]\s*/gm, '')
        .replace(/\n+/g, ' ')
        .trim();
}

const conditionChip: Record<string, string> = {
    nuevo: 'bg-ink text-bg',
    semi_uso: 'bg-surface text-ink border border-ink',
    usado: 'bg-sunken text-ink border border-line',
};

export function ProductCard({ entry }: { entry: StoreEntry }) {
    const { rep: item, variants } = entry;
    const [imgError, setImgError] = useState(false);
    const photoCount = (item.storeImages?.length || 0) + (item.imageUrl ? 1 : 0);
    const firstImage = [item.imageUrl, ...(item.storeImages || []), ...variants.map(v => v.imageUrl)].find(u => !!u) ?? null;

    // Precio por variante (nombre + ubicación), igual que en la ficha
    const maxByKey = new Map<string, number>();
    for (const v of variants) {
        const key = `${(v.storeVariantName || '').trim().toLowerCase()}|${(v.location || '').trim().toLowerCase()}`;
        maxByKey.set(key, Math.max(maxByKey.get(key) || 0, priceOf(v)));
    }
    const prices = Array.from(maxByKey.values());
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const totalStock = entryStock(entry);

    const locMap = new Map<string, string>();
    variants.forEach(v => {
        const loc = (v.location || '').trim();
        if (loc && !locMap.has(loc.toLowerCase())) locMap.set(loc.toLowerCase(), capitalize(loc));
    });
    const locations = Array.from(locMap.values()).join(' · ');
    const variantCount = maxByKey.size;
    const descPreview = cleanDescriptionPreview(item.description);
    const title = item.storeTitle || item.productName;

    return (
        <a
            href={`/producto/${item.id}`}
            className="group relative w-full flex flex-col bg-surface border border-line rounded-[2px] hover:border-ink transition-colors min-w-0"
        >
            <div className="relative aspect-square overflow-hidden hatch">
                <span className={`absolute top-2 left-2 z-10 label-mono px-2 py-1 ${conditionChip[item.condition] || conditionChip.nuevo}`}>
                    {conditionLabel[item.condition] || item.condition}
                </span>

                {photoCount > 1 && (
                    <span className="absolute top-2 right-2 z-10 label-mono px-1.5 py-1 bg-night/80 text-on-night flex items-center gap-1">
                        <Images className="w-3 h-3" aria-hidden="true" />
                        {photoCount}
                        <span className="sr-only">fotos</span>
                    </span>
                )}

                {totalStock === 1 && (
                    <span className="absolute bottom-2 left-2 z-10 label-mono px-2 py-1 bg-signal text-on-signal font-medium">
                        Última unidad
                    </span>
                )}

                {item.storeVideoUrl && (
                    <span className="absolute bottom-2 right-2 z-10 label-mono px-2 py-1 bg-night text-on-night flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-signal" aria-hidden="true" />
                        Video
                    </span>
                )}

                {firstImage && !imgError ? (
                    <img
                        src={firstImage}
                        alt={title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 motion-reduce:transition-none"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="label-mono text-muted">Sin imagen</span>
                    </div>
                )}
            </div>

            <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1">
                {item.category && (
                    <span className="label-mono text-muted truncate">{item.category}</span>
                )}

                <h3 className="font-semibold text-ink leading-snug text-sm sm:text-[15px] line-clamp-2 min-h-[2.5rem]">
                    {title}
                </h3>

                {variantCount > 1 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 self-start">
                        <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                        {variantCount} opciones
                    </span>
                )}

                {descPreview && (
                    <p className="hidden sm:block text-xs text-muted leading-relaxed">
                        <span className="line-clamp-2">{descPreview}</span>
                    </p>
                )}

                {locations && (
                    <p className="text-xs text-muted flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{locations}</span>
                    </p>
                )}

                <div className="mt-auto pt-2.5 border-t border-dashed border-line flex items-end justify-between gap-2">
                    <div className="min-w-0">
                        {minPrice !== maxPrice && <span className="label-mono text-muted block">desde</span>}
                        <div className="font-mono font-medium text-lg sm:text-xl text-ink leading-none">
                            {formatPrice(minPrice)}
                        </div>
                        <StockLine stock={totalStock} />
                    </div>
                    <span
                        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-[2px] bg-sunken text-ink group-hover:bg-signal group-hover:text-on-signal transition-colors"
                        aria-hidden="true"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                    </span>
                </div>
            </div>
        </a>
    );
}

export function StockLine({ stock, className = '' }: { stock: number; className?: string }) {
    if (stock === 1) {
        return (
            <p className={`text-xs font-semibold text-signal-ink mt-1.5 flex items-center gap-1.5 ${className}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-signal" aria-hidden="true" />
                Última unidad
            </p>
        );
    }
    if (stock > 0) {
        return (
            <p className={`text-xs text-muted mt-1.5 flex items-center gap-1.5 ${className}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-ink" aria-hidden="true" />
                {stock} disponibles
            </p>
        );
    }
    return (
        <p className={`text-xs text-muted mt-1.5 flex items-center gap-1.5 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full border border-muted" aria-hidden="true" />
            Sin stock
        </p>
    );
}

export default ProductCard;
