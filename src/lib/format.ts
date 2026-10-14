import type { Item } from '../types';

export const conditionLabel: Record<string, string> = {
    nuevo: 'Nuevo',
    semi_uso: 'Semi uso',
    usado: 'Usado',
};

export function formatPrice(n: number): string {
    return `$${n.toLocaleString('es-AR')}`;
}

/** Precio publicado de un item (venta, o estimado si todavía no tiene). */
export function priceOf(item: Pick<Item, 'salePrice' | 'estimatedSalePrice'>): number {
    return item.salePrice || item.estimatedSalePrice || 0;
}

export function capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
