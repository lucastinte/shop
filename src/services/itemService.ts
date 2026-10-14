import { supabase } from '../lib/supabase';
import { groupSameProduct } from '../lib/grouping';
import type { Item, ItemCondition, ItemStatus, ItemType, WithdrawalReason } from '../types';

// Helper to map DB columns (snake_case) to application model (camelCase)
const mapFromDb = (dbItem: any): Item => ({
    id: dbItem.id,
    productName: dbItem.product_name,
    purchasePrice: Number(dbItem.purchase_price ?? 0), // la tienda no lee costos
    salePrice: dbItem.sale_price ? Number(dbItem.sale_price) : undefined,
    quantity: Number(dbItem.quantity),
    date: dbItem.date || dbItem.created_at,
    saleDate: dbItem.sale_date || undefined,
    status: dbItem.status as ItemStatus,
    condition: (dbItem.item_condition || 'nuevo') as ItemCondition,
    batchRef: dbItem.batch_ref || undefined,
    location: dbItem.location || undefined,
    estimatedSalePrice: dbItem.estimated_sale_price ? Number(dbItem.estimated_sale_price) : undefined,
    publishUrls: dbItem.publish_urls || undefined,
    imageUrl: dbItem.image_url || undefined,
    category: dbItem.category || undefined,
    itemType: (dbItem.item_type || 'resale') as ItemType,
    facturado: dbItem.facturado === true,
    noFacturar: dbItem.no_facturar === true,
    withdrawalReason: (dbItem.withdrawal_reason || undefined) as WithdrawalReason | undefined,
    envioAplica: dbItem.envio_aplica === true,
    envioCosto: dbItem.envio_costo ? Number(dbItem.envio_costo) : undefined,
    envioMetodo: dbItem.envio_metodo || undefined,
    cobrado: dbItem.cobrado !== false,
    vendedor: dbItem.vendedor || undefined,
    formasPago: dbItem.formas_pago || undefined,
    montoEfectivo: dbItem.monto_efectivo != null ? Number(dbItem.monto_efectivo) : undefined,
    montoTransferencia: dbItem.monto_transferencia != null ? Number(dbItem.monto_transferencia) : undefined,
    montoTarjeta: dbItem.monto_tarjeta != null ? Number(dbItem.monto_tarjeta) : undefined,
    montoMercadoPago: dbItem.monto_mercado_pago != null ? Number(dbItem.monto_mercado_pago) : undefined,
    montoOtro: dbItem.monto_otro != null ? Number(dbItem.monto_otro) : undefined,
    publicInStore: dbItem.public_in_store === true,
    storeImages: Array.isArray(dbItem.store_images) ? dbItem.store_images : [],
    storeVideoUrl: dbItem.store_video_url ?? undefined,
    description: dbItem.description ?? undefined,
    storeTitle: dbItem.store_title ?? undefined,
    storeGroup: dbItem.store_group ?? undefined,
    storeVariantName: dbItem.store_variant_name ?? undefined,
});

/**
 * Columnas que la tienda puede leer con la clave pública. No incluye costos,
 * pagos, facturación ni notas internas: Supabase solo deja leer estas a los
 * visitantes (ver supabase/seguridad-tienda.sql). Si agregás una columna acá,
 * agregala también en ese GRANT.
 */
const STORE_COLUMNS = [
    'id', 'created_at', 'date', 'product_name', 'store_title', 'sale_price', 'estimated_sale_price',
    'quantity', 'status', 'item_condition', 'item_type', 'location', 'image_url', 'store_images',
    'store_video_url', 'description', 'category', 'store_group', 'store_variant_name', 'public_in_store',
].join(',');

export const itemService = {
    async getPublicItemById(id: string): Promise<Item | null> {
        const { data, error } = await supabase
            .from('items')
            .select(STORE_COLUMNS)
            .eq('id', id)
            .eq('public_in_store', true)
            .single();
        if (error) return null;
        return mapFromDb(data);
    },

    /**
     * Productos en stock para la tienda. Igual que el dashboard, un producto
     * cuenta como publicado si CUALQUIERA de sus registros lo está: así una
     * tanda nueva cargada en otra sede (que puede quedar sin el tilde de
     * publicar) igual aparece como otra sede del mismo producto.
     */
    async getPublicItems(): Promise<Item[]> {
        const { data, error } = await supabase
            .from('items')
            .select(STORE_COLUMNS)
            .eq('status', 'in_stock')
            .order('date', { ascending: false });

        if (error) throw error;
        const all = (data || [])
            .map(mapFromDb)
            // los "propios" solo si se publicaron explícitamente
            .filter(i => i.itemType !== 'personal' || i.publicInStore);
        const included = new Set<string>();
        for (const g of groupSameProduct(all)) {
            if (g.some(i => i.publicInStore)) g.forEach(i => included.add(i.id));
        }
        return all.filter(i => included.has(i.id));
    },

    async getPublicItemsByGroup(group: string): Promise<Item[]> {
        const { data, error } = await supabase
            .from('items')
            .select(STORE_COLUMNS)
            .eq('status', 'in_stock')
            .eq('public_in_store', true)
            .eq('store_group', group)
            .order('product_name', { ascending: true });

        if (error) return [];
        return (data || []).map(mapFromDb);
    }
};
