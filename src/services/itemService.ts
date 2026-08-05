import { supabase } from '../lib/supabase';
import type { Item, ItemCondition, ItemStatus, ItemType, WithdrawalReason } from '../types';

// Helper to map DB columns (snake_case) to application model (camelCase)
const mapFromDb = (dbItem: any): Item => ({
    id: dbItem.id,
    productName: dbItem.product_name,
    purchasePrice: Number(dbItem.purchase_price),
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

export const itemService = {
    async getPublicItemById(id: string): Promise<Item | null> {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('id', id)
            .eq('public_in_store', true)
            .single();
        if (error) return null;
        return mapFromDb(data);
    },

    async getPublicItems(): Promise<Item[]> {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('status', 'in_stock')
            .eq('public_in_store', true)
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapFromDb);
    },

    async getPublicItemsByGroup(group: string): Promise<Item[]> {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('status', 'in_stock')
            .eq('public_in_store', true)
            .eq('store_group', group)
            .order('product_name', { ascending: true });

        if (error) return [];
        return (data || []).map(mapFromDb);
    }
};
