import { useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink, MapPin, Store, Truck } from 'lucide-react';
import { RETIRO_JUJUY } from '../config/storeConfig';

/* ─────────────────────────────────────────────────────────────
   EXPERIMENTAL: entrega para productos de San Salvador de Jujuy.
   - Retiro en el local, en la franja horaria.
   - Envío por Uber o moto: el cliente lo cotiza en su app desde
     el local hasta su casa y, o lo pide él (dentro de la franja,
     avisando por WhatsApp), o nos manda la cotización.
   ───────────────────────────────────────────────────────────── */

export type EntregaModo = 'local' | 'envio';
export type EnvioQuien = 'cliente' | 'cotizacion';

export interface Entrega {
    modo: EntregaModo;
    quien: EnvioQuien;
    franja: string;
}

export const ENTREGA_INICIAL: Entrega = {
    modo: 'local',
    quien: 'cliente',
    franja: RETIRO_JUJUY.franjas[0] ?? '',
};

const direccionCompleta = `${RETIRO_JUJUY.direccion}, ${RETIRO_JUJUY.ciudad}`;

function normalizar(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** ¿El producto está en la sede de San Salvador de Jujuy? */
export function esDeSedeJujuy(location?: string): boolean {
    if (!RETIRO_JUJUY.activo || !location) return false;
    const loc = normalizar(location);
    return loc.includes('san salvador') || /\bs\.?\s?s\.?\s?(de\s)?jujuy\b/.test(loc);
}

export function mapsUrl(): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionCompleta)}`;
}

/** Abre Uber; si hay coordenadas del local, con el punto de retiro ya cargado */
export function uberUrl(): string {
    const { lat, lng } = RETIRO_JUJUY;
    if (lat == null || lng == null) return 'https://m.uber.com/ul/';
    const p = new URLSearchParams({
        action: 'setPickup',
        'pickup[latitude]': String(lat),
        'pickup[longitude]': String(lng),
        'pickup[nickname]': 'Starlinkers',
        'pickup[formatted_address]': direccionCompleta,
    });
    return `https://m.uber.com/ul/?${p.toString()}`;
}

/** Líneas para el mensaje de WhatsApp */
export function entregaMensaje(e: Entrega, alcance?: string): string {
    const para = alcance ? ` (${alcance})` : '';
    if (e.modo === 'local') {
        return `🏪 *Entrega${para}:* Retiro en el local\n   ${direccionCompleta}\n   Horario: ${RETIRO_JUJUY.franjas.join(' o ')}\n`;
    }
    if (e.quien === 'cliente') {
        return (
            `🛵 *Entrega${para}:* Envío por Uber/moto que pido yo\n` +
            `   Retira en: ${direccionCompleta}\n` +
            `   Franja de retiro: ${e.franja}\n` +
            `   Te aviso por acá cuando salga el Uber/moto, con los datos del conductor.\n`
        );
    }
    return (
        `🛵 *Entrega${para}:* Envío por Uber/moto\n` +
        `   Retiro desde: ${direccionCompleta}\n` +
        `   Te adjunto la captura de la cotización del envío para coordinar.\n`
    );
}

/** Aviso a mostrar junto al botón de enviar, según la opción elegida */
export function entregaAviso(e: Entrega): string | null {
    if (e.modo !== 'envio') return null;
    return e.quien === 'cliente'
        ? `Pedí el Uber/moto dentro de la franja de ${e.franja} y avisanos por el mismo chat cuando salga.`
        : 'Después de enviar el pedido, adjuntá en el chat la captura de la cotización.';
}

interface Props {
    value: Entrega;
    onChange: (e: Entrega) => void;
    /** Texto extra en el título, ej. "productos de San Salvador de Jujuy" */
    alcance?: string;
    idPrefix: string;
}

export default function EntregaJujuy({ value, onChange, alcance, idPrefix }: Props) {
    const [copiado, setCopiado] = useState(false);
    const set = (patch: Partial<Entrega>) => onChange({ ...value, ...patch });

    const copiar = () => {
        navigator.clipboard?.writeText(direccionCompleta).then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        });
    };

    return (
        <fieldset className="m-0 p-4 bg-surface border border-line rounded-[2px] flex flex-col gap-3 min-w-0">
            <legend className="sr-only">Entrega en {RETIRO_JUJUY.sede}</legend>
            <div className="flex items-center justify-between gap-3" aria-hidden="true">
                <span className="label-mono text-muted">
                    ¿Cómo lo recibís?{alcance ? ` · ${alcance}` : ''}
                </span>
                <span className="label-mono px-1.5 py-0.5 border border-line text-muted">Beta</span>
            </div>

            <Opcion
                id={`${idPrefix}-local`}
                name={`${idPrefix}-modo`}
                checked={value.modo === 'local'}
                onSelect={() => set({ modo: 'local' })}
                icon={<Store className="w-5 h-5" aria-hidden="true" />}
                titulo="Retiro en el local"
                detalle={`${RETIRO_JUJUY.direccion} · ${RETIRO_JUJUY.franjas.join(' y ')}`}
            />
            <Opcion
                id={`${idPrefix}-envio`}
                name={`${idPrefix}-modo`}
                checked={value.modo === 'envio'}
                onSelect={() => set({ modo: 'envio' })}
                icon={<Truck className="w-5 h-5" aria-hidden="true" />}
                titulo="Envío por Uber o moto"
                detalle="Lo cotizás en tu app, desde el local hasta tu casa."
            />

            {value.modo === 'local' && (
                <a
                    href={mapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start inline-flex items-center gap-1.5 min-h-10 text-sm font-semibold text-ink underline underline-offset-4"
                >
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    Ver en Google Maps
                </a>
            )}

            {value.modo === 'envio' && (
                <ol className="m-0 p-0 list-none flex flex-col gap-4 pt-3 border-t border-dashed border-line">
                    <li className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-ink">1. Cotizá el envío</span>
                        <span className="text-sm text-muted">
                            En Uber elegí <strong className="text-ink font-semibold">Envíos</strong> (o una moto mensajería) y poné este punto de retiro:
                        </span>
                        <div className="flex items-center gap-2 h-11 pl-3 pr-1 bg-bg border border-line rounded-[2px] min-w-0">
                            <MapPin className="w-4 h-4 shrink-0 text-muted" aria-hidden="true" />
                            <span className="font-mono text-xs text-ink flex-1 truncate">{direccionCompleta}</span>
                            <button
                                type="button"
                                onClick={copiar}
                                className="w-9 h-9 shrink-0 inline-flex items-center justify-center text-ink cursor-pointer"
                                aria-label={copiado ? 'Dirección copiada' : 'Copiar dirección'}
                            >
                                {copiado ? <Check className="w-4 h-4 text-signal-ink" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href={uberUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 min-h-11 px-4 rounded-[2px] bg-night text-on-night font-semibold text-sm hover:bg-ink-2 transition-colors"
                            >
                                Abrir Uber
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                            </a>
                            <a
                                href={mapsUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 min-h-11 px-4 rounded-[2px] border border-line text-ink font-semibold text-sm hover:border-ink transition-colors"
                            >
                                Ver en Maps
                            </a>
                        </div>
                    </li>

                    <li className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-ink" id={`${idPrefix}-quien-label`}>2. ¿Quién pide el envío?</span>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${idPrefix}-quien-label`}>
                            <Pill checked={value.quien === 'cliente'} onClick={() => set({ quien: 'cliente' })}>
                                Lo pido yo
                            </Pill>
                            <Pill checked={value.quien === 'cotizacion'} onClick={() => set({ quien: 'cotizacion' })}>
                                Te paso la cotización
                            </Pill>
                        </div>
                    </li>

                    {value.quien === 'cliente' && (
                        <li className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-ink" id={`${idPrefix}-franja-label`}>3. ¿En qué franja pasa a retirar?</span>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${idPrefix}-franja-label`}>
                                {RETIRO_JUJUY.franjas.map(f => (
                                    <Pill key={f} checked={value.franja === f} onClick={() => set({ franja: f })}>
                                        {f}
                                    </Pill>
                                ))}
                            </div>
                        </li>
                    )}

                    <li className="text-sm text-ink-2 bg-sunken px-3 py-2.5 rounded-[2px]">
                        {entregaAviso(value)}
                    </li>
                </ol>
            )}
        </fieldset>
    );
}

function Opcion({
    id, name, checked, onSelect, icon, titulo, detalle,
}: {
    id: string; name: string; checked: boolean; onSelect: () => void; icon: ReactNode; titulo: string; detalle: string;
}) {
    return (
        <label
            htmlFor={id}
            className={`flex items-start gap-3 p-3 rounded-[2px] cursor-pointer transition-colors ${
                checked ? 'border-2 border-ink bg-sunken' : 'border border-line bg-bg hover:border-ink'
            }`}
        >
            <input id={id} type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
            <span
                className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${checked ? 'border-ink' : 'border-muted'}`}
                aria-hidden="true"
            >
                {checked && <span className="w-2 h-2 rounded-full bg-signal" />}
            </span>
            <span className="flex-1 min-w-0 flex flex-col">
                <span className="font-semibold text-ink inline-flex items-center gap-2">{icon}{titulo}</span>
                <span className="text-xs text-muted mt-0.5">{detalle}</span>
            </span>
        </label>
    );
}

function Pill({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={onClick}
            className={`min-h-10 px-3 rounded-[2px] border-2 text-sm font-semibold transition-colors cursor-pointer ${
                checked ? 'bg-ink text-bg border-ink' : 'border-line text-ink hover:border-ink'
            }`}
        >
            {children}
        </button>
    );
}
