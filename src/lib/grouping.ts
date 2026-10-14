import type { Item } from '../types';

/** Igual que en el dashboard: sin espacios extra ni mayúsculas */
export const normalizeText = (value: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Agrupa los registros que son el mismo producto: comparten nombre (como los
 * agrupa el dashboard), grupo de tienda o título de tienda. Así las tandas
 * cargadas en distintas sedes se ven como un solo producto con varias sedes.
 * Mantiene el orden de aparición.
 */
export function groupSameProduct(items: Item[]): Item[][] {
    const parent = items.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent[rb] = ra;
    };

    const firstByKey = new Map<string, number>();
    items.forEach((it, i) => {
        const keys = [`n:${normalizeText(it.productName)}`];
        if (it.storeGroup?.trim()) keys.push(`g:${normalizeText(it.storeGroup)}`);
        if (it.storeTitle?.trim()) keys.push(`t:${normalizeText(it.storeTitle)}`);
        for (const k of keys) {
            const j = firstByKey.get(k);
            if (j === undefined) firstByKey.set(k, i);
            else union(i, j);
        }
    });

    const groups = new Map<number, Item[]>();
    items.forEach((it, i) => {
        const r = find(i);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r)!.push(it);
    });
    return Array.from(groups.values());
}

/** Registro que representa al grupo: el que tiene más datos de tienda (y está publicado) */
export function pickRep(variants: Item[]): Item {
    const score = (i: Item) =>
        (i.publicInStore ? 8 : 0) + (i.storeTitle ? 4 : 0) + (i.description ? 2 : 0) + (i.storeImages?.length ? 1 : 0) + (i.imageUrl ? 1 : 0);
    return [...variants].sort((a, b) => score(b) - score(a))[0];
}
