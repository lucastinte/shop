import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { useCart, type CartItem } from '../contexts/CartContext';
import { getWhatsAppUrl, STORE_CONFIG } from '../config/storeConfig';
import { conditionLabel, formatPrice } from '../lib/format';
import { WhatsAppIcon } from './SiteChrome';
import EntregaJujuy, { ENTREGA_INICIAL, entregaAviso, entregaMensaje, esDeSedeJujuy, type Entrega } from './EntregaJujuy';
import { RETIRO_JUJUY } from '../config/storeConfig';

/** Mensaje de pedido para WhatsApp (mismo formato que antes) */
export function buildOrderMessage(cart: CartItem[], totalPrice: number, customerName: string, entrega?: Entrega): string {
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
    if (entrega) {
        const todos = cart.every(i => esDeSedeJujuy(i.location));
        text += entregaMensaje(entrega, todos ? undefined : `productos de ${RETIRO_JUJUY.sede}`) + '\n';
    }
    text += `¡Hola! Me interesa coordinar la compra de estos productos de la tienda.`;
    return text;
}

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { cart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
    const [customerName, setCustomerName] = useState('');
    const [entrega, setEntrega] = useState<Entrega>(ENTREGA_INICIAL);
    const closeRef = useRef<HTMLButtonElement>(null);
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    // Al abrir: bloquea el scroll de fondo, enfoca "cerrar" y escucha Escape
    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        const prevFocus = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCloseRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
            prevFocus?.focus?.();
        };
    }, [open]);

    if (!open) return null;

    const conJujuy = cart.some(i => esDeSedeJujuy(i.location));
    const soloJujuy = conJujuy && cart.every(i => esDeSedeJujuy(i.location));

    const handleCheckout = () => {
        if (cart.length === 0) return;
        window.open(getWhatsAppUrl(buildOrderMessage(cart, totalPrice, customerName, conJujuy ? entrega : undefined)), '_blank');
        clearCart();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <div className="absolute inset-0 bg-night/70 animate-fade-in" onClick={onClose} aria-hidden="true" />

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
                <div className="w-screen max-w-md bg-bg border-l border-line flex flex-col animate-drawer-in">
                    <div className="px-5 sm:px-6 py-4 border-b border-line flex items-center justify-between gap-4">
                        <div>
                            <h2 id="cart-title" className="font-display font-black text-3xl uppercase leading-none">Tu carrito</h2>
                            <span className="label-mono text-muted">
                                {totalItems} producto{totalItems !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            ref={closeRef}
                            type="button"
                            onClick={onClose}
                            className="w-11 h-11 inline-flex items-center justify-center rounded-[2px] border border-line hover:border-ink text-ink transition-colors cursor-pointer"
                            aria-label="Cerrar carrito"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-16 gap-3">
                                <span className="w-16 h-16 inline-flex items-center justify-center bg-sunken text-muted rounded-[2px]">
                                    <ShoppingCart className="w-8 h-8" aria-hidden="true" />
                                </span>
                                <p className="font-semibold text-ink">Tu carrito está vacío</p>
                                <p className="text-sm text-muted max-w-xs">
                                    Agregá productos desde el catálogo y mandanos el pedido por WhatsApp.
                                </p>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-2 min-h-11 px-5 rounded-[2px] border-2 border-ink font-semibold text-ink hover:bg-ink hover:text-bg transition-colors cursor-pointer"
                                >
                                    Seguir mirando
                                </button>
                            </div>
                        ) : (
                            <ul className="flex flex-col divide-y divide-line">
                                {cart.map(item => (
                                    <li key={item.id} className="flex gap-3.5 py-4 first:pt-0">
                                        <div className={`w-20 h-20 shrink-0 border border-line overflow-hidden ${item.imageUrl ? 'bg-white' : 'hatch'}`}>
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                                            ) : null}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-sm text-ink leading-snug line-clamp-2">
                                                    {item.storeTitle || item.productName}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="w-9 h-9 -mt-1.5 -mr-2 shrink-0 inline-flex items-center justify-center text-muted hover:text-signal-ink cursor-pointer transition-colors"
                                                    aria-label={`Quitar ${item.storeTitle || item.productName}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {(item.variantName || item.location) && (
                                                <span className="label-mono text-muted">
                                                    {[item.variantName, item.location].filter(Boolean).join(' · ')}
                                                </span>
                                            )}
                                            <div className="flex items-center justify-between gap-2 mt-auto">
                                                <QtyStepper
                                                    size="sm"
                                                    value={item.quantity}
                                                    max={item.maxQuantity}
                                                    onChange={q => updateQuantity(item.id, q)}
                                                    allowZero
                                                />
                                                <span className="font-mono font-medium text-ink">
                                                    {formatPrice(item.price * item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {conJujuy && (
                            <div className="pt-4 mt-2 border-t border-line">
                                <EntregaJujuy
                                    idPrefix="carrito-entrega"
                                    value={entrega}
                                    onChange={setEntrega}
                                    alcance={soloJujuy ? undefined : `productos de ${RETIRO_JUJUY.sede}`}
                                />
                            </div>
                        )}
                    </div>

                    {cart.length > 0 && (
                        <div className="border-t border-line bg-surface px-5 sm:px-6 pt-5 flex flex-col gap-4 safe-bottom">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="customer-name" className="label-mono text-muted">
                                    Tu nombre (opcional)
                                </label>
                                <input
                                    id="customer-name"
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Ej. Lucas Pérez"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="w-full h-11 px-3 rounded-[2px] border border-line bg-bg text-ink placeholder:text-muted outline-none focus:border-ink"
                                />
                            </div>
                            <div className="flex items-baseline justify-between pt-3 border-t border-dashed border-line">
                                <span className="font-semibold text-ink">Total</span>
                                <span className="font-mono font-medium text-3xl text-ink">{formatPrice(totalPrice)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleCheckout}
                                className="w-full flex items-center justify-center gap-2 min-h-14 rounded-[2px] bg-signal text-on-signal font-semibold text-base hover:brightness-95 active:translate-y-px transition cursor-pointer"
                            >
                                <WhatsAppIcon className="w-5 h-5" />
                                Enviar pedido por WhatsApp
                            </button>
                            <p className="text-xs text-muted text-center -mt-1">
                                {(conJujuy && entregaAviso(entrega)) || 'Se abre WhatsApp con el detalle; ahí coordinamos pago y entrega.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Selector de cantidad con bordes de la marca */
export function QtyStepper({
    value,
    max,
    onChange,
    size = 'md',
    allowZero = false,
}: {
    value: number;
    max: number;
    onChange: (q: number) => void;
    size?: 'sm' | 'md';
    allowZero?: boolean;
}) {
    const btn = size === 'sm' ? 'w-9 h-9' : 'w-12 h-12';
    const min = allowZero ? 0 : 1;
    return (
        <div className="inline-flex items-center border-2 border-ink rounded-[2px]" role="group" aria-label="Cantidad">
            <button
                type="button"
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={value <= min}
                className={`${btn} inline-flex items-center justify-center text-ink disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed`}
                aria-label="Quitar uno"
            >
                <Minus className="w-4 h-4" />
            </button>
            <span className={`${size === 'sm' ? 'w-8 text-sm' : 'w-10 text-lg'} text-center font-mono text-ink select-none`} aria-live="polite">
                {value}
            </span>
            <button
                type="button"
                onClick={() => onChange(Math.min(max, value + 1))}
                disabled={value >= max}
                className={`${btn} inline-flex items-center justify-center text-ink disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed`}
                aria-label="Agregar uno"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
}
