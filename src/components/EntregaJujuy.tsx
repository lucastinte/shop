import { useState, type ReactNode } from 'react';
import { Bike, Check, Copy, MapPin, Store } from 'lucide-react';
import { RETIRO_JUJUY, normKey, type Sede } from '../config/storeConfig';

/* ─────────────────────────────────────────────────────────────
   EXPERIMENTAL: entrega para productos de San Salvador de Jujuy.
   - Retiro en el local, en el horario de atención.
   - Cadete o Uber: lo manda el cliente (nosotros no hacemos el
     envío). Le damos la dirección, elige la franja y nos avisa por
     WhatsApp cuando el cadete está en camino.
   ───────────────────────────────────────────────────────────── */

export type EntregaModo = 'local' | 'cadete';

export interface Entrega {
    modo: EntregaModo;
    franja: string;
}

export const ENTREGA_INICIAL: Entrega = {
    modo: 'local',
    franja: RETIRO_JUJUY.franjas[0] ?? '',
};

const direccionCompleta = `${RETIRO_JUJUY.direccion}, ${RETIRO_JUJUY.ciudad}`;

const normalizar = normKey;

/** ¿El producto está en la sede de San Salvador de Jujuy? */
export function esDeSedeJujuy(location?: string): boolean {
    if (!RETIRO_JUJUY.activo || !location) return false;
    const loc = normalizar(location);
    return loc.includes('san salvador') || /\bs\.?\s?s\.?\s?(de\s)?jujuy\b/.test(loc);
}

/** Líneas para el mensaje de WhatsApp */
export function entregaMensaje(e: Entrega, alcance?: string): string {
    const para = alcance ? ` (${alcance})` : '';
    if (e.modo === 'local') {
        return `🏪 *Entrega${para}:* Retiro en el local\n   ${direccionCompleta}\n   Horario: ${RETIRO_JUJUY.franjas.join(' o ')}\n`;
    }
    return (
        `🛵 *Entrega${para}:* Mando yo un cadete/Uber a retirar\n` +
        `   Retira en: ${direccionCompleta}\n` +
        `   Franja: ${e.franja}\n` +
        `   Te aviso por acá cuando el cadete esté en camino.\n`
    );
}

/** Aviso a mostrar junto al botón de enviar, según la opción elegida */
export function entregaAviso(e: Entrega): string | null {
    if (e.modo !== 'cadete') return null;
    return `Mandá el cadete dentro de la franja de ${e.franja} y avisanos por el mismo chat cuando esté en camino.`;
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
                    ¿Cómo lo retirás?{alcance ? ` · ${alcance}` : ''}
                </span>
                <span className="label-mono px-1.5 py-0.5 border border-line text-muted">Beta</span>
            </div>

            {/* Dirección del local: lo único que necesita el cliente o su cadete */}
            <div className="flex items-center gap-2 min-h-11 py-1 pl-3 pr-1 bg-bg border border-line rounded-[2px] min-w-0">
                <MapPin className="w-4 h-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="font-mono text-xs text-ink flex-1 break-words">{direccionCompleta}</span>
                <button
                    type="button"
                    onClick={copiar}
                    className="w-9 h-9 shrink-0 inline-flex items-center justify-center text-ink cursor-pointer"
                    aria-label={copiado ? 'Dirección copiada' : 'Copiar dirección'}
                >
                    {copiado ? <Check className="w-4 h-4 text-signal-ink" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>

            <Opcion
                id={`${idPrefix}-local`}
                name={`${idPrefix}-modo`}
                checked={value.modo === 'local'}
                onSelect={() => set({ modo: 'local' })}
                icon={<Store className="w-5 h-5" aria-hidden="true" />}
                titulo="Paso a retirarlo"
                detalle={`En el local · ${RETIRO_JUJUY.franjas.join(' y ')}`}
            />
            <Opcion
                id={`${idPrefix}-cadete`}
                name={`${idPrefix}-modo`}
                checked={value.modo === 'cadete'}
                onSelect={() => set({ modo: 'cadete' })}
                icon={<Bike className="w-5 h-5" aria-hidden="true" />}
                titulo="Mando un cadete o Uber"
                detalle="Lo pedís vos, desde esta dirección hasta la tuya. Nosotros no hacemos el envío."
            />

            {value.modo === 'cadete' && (
                <div className="flex flex-col gap-3 pt-3 border-t border-dashed border-line">
                    <span className="text-sm font-semibold text-ink" id={`${idPrefix}-franja-label`}>
                        ¿En qué franja pasa el cadete?
                    </span>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${idPrefix}-franja-label`}>
                        {RETIRO_JUJUY.franjas.map(f => (
                            <Pill key={f} checked={value.franja === f} onClick={() => set({ franja: f })}>
                                {f}
                            </Pill>
                        ))}
                    </div>
                    <p className="m-0 text-sm text-ink-2 bg-sunken px-3 py-2.5 rounded-[2px]">{entregaAviso(value)}</p>
                </div>
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

/* ─────────────────────────────────────────────────────────────
   Retiro simple en una sede sin opciones (ej. Abra Pampa):
   solo dirección y horario de atención.
   ───────────────────────────────────────────────────────────── */

export function retiroSedeMensaje(sede: Sede, alcance?: string): string {
    const para = alcance ? ` (${alcance})` : '';
    const dir = sede.direccion ? `${sede.direccion}, ${sede.nombre}` : sede.nombre;
    return `🏪 *Retiro${para}:* ${dir}\n   Horario: ${sede.horario}\n`;
}

export function RetiroSede({ sede, alcance }: { sede: Sede; alcance?: string }) {
    const [copiado, setCopiado] = useState(false);
    const dir = sede.direccion ? `${sede.direccion}, ${sede.nombre}` : sede.nombre;
    const copiar = () => {
        navigator.clipboard?.writeText(dir).then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        });
    };
    return (
        <div className="p-4 bg-surface border border-line rounded-[2px] flex flex-col gap-3 min-w-0">
            <span className="label-mono text-muted">Retiro en {sede.nombre}{alcance ? ` · ${alcance}` : ''}</span>
            <div className="flex items-center gap-2 min-h-11 py-1 pl-3 pr-1 bg-bg border border-line rounded-[2px] min-w-0">
                <MapPin className="w-4 h-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="font-mono text-xs text-ink flex-1 break-words">{dir}</span>
                <button
                    type="button"
                    onClick={copiar}
                    className="w-9 h-9 shrink-0 inline-flex items-center justify-center text-ink cursor-pointer"
                    aria-label={copiado ? 'Dirección copiada' : 'Copiar dirección'}
                >
                    {copiado ? <Check className="w-4 h-4 text-signal-ink" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            <p className="m-0 text-sm text-ink-2 flex items-start gap-2">
                <Store className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Pasás a retirarlo · Horario de atención: <strong className="font-semibold text-ink">{sede.horario}</strong></span>
            </p>
        </div>
    );
}
