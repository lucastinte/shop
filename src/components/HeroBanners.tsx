import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { HERO_BANNERS, type HeroArt, type HeroBanner } from '../config/storeConfig';

const ROTATE_MS = 7000;

interface HeroBannersProps {
    onCta: (banner: HeroBanner) => void;
    /** Etiqueta extra bajo el botón (ej. "10 productos en stock") */
    badge?: string;
}

/** Carrusel de banners de la portada (azul cielo + motivo de línea de vista) */
export default function HeroBanners({ onCta, badge }: HeroBannersProps) {
    const banners = HERO_BANNERS;
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const reduceMotion = useRef(
        typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );

    useEffect(() => {
        if (paused || reduceMotion.current || banners.length < 2) return;
        const t = window.setTimeout(() => setIndex(i => (i + 1) % banners.length), ROTATE_MS);
        return () => window.clearTimeout(t);
    }, [index, paused, banners.length]);

    const go = (i: number) => setIndex((i + banners.length) % banners.length);

    return (
        <div
            className="relative flex-[2_1_560px] min-w-0 bg-sky text-on-sky rounded-[2px] overflow-hidden"
            role="region"
            aria-roledescription="carrusel"
            aria-label="Destacados"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            {/* Todos los banners en la misma celda: el alto es el del más alto */}
            <div className="grid">
                {banners.map((b, i) => {
                    const active = i === index;
                    return (
                        <div
                            key={b.id}
                            className={`[grid-area:1/1] relative min-h-[340px] transition-opacity duration-500 motion-reduce:transition-none ${
                                active ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                            role="group"
                            aria-roledescription="banner"
                            aria-label={`${i + 1} de ${banners.length}: ${b.title}`}
                            aria-hidden={!active}
                            inert={!active}
                        >
                            {/* Móvil y tablet: el dibujo va abajo. Escritorio ancho: detrás, a la derecha */}
                            <div className="absolute inset-x-0 bottom-0 h-48 xl:inset-0 xl:h-full pointer-events-none">
                                <BannerArt art={b.art} />
                            </div>
                            <div className="relative p-6 pb-56 sm:p-10 sm:pb-60 xl:pb-10 flex flex-col gap-4 max-w-[30rem]">
                                <span className="label-mono">{b.kicker}</span>
                                {i === 0 ? (
                                    <h1 className="font-display font-black uppercase leading-[0.86] text-[clamp(52px,8vw,88px)]">{b.title}</h1>
                                ) : (
                                    <h2 className="font-display font-black uppercase leading-[0.86] text-[clamp(52px,8vw,88px)]">{b.title}</h2>
                                )}
                                <p className="text-base sm:text-lg max-w-[34ch]">{b.text}</p>
                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => onCta(b)}
                                        className="inline-flex items-center gap-2 min-h-12 px-5 rounded-[2px] bg-signal text-on-signal font-semibold hover:brightness-95 transition cursor-pointer"
                                    >
                                        {b.cta}
                                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    {badge && <span className="label-mono px-2.5 py-1.5 border border-on-sky/40">{badge}</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {banners.length > 1 && (
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => go(index - 1)}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-[2px] border border-on-sky/40 text-on-sky hover:bg-on-sky/10 cursor-pointer"
                        aria-label="Banner anterior"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    {banners.map((b, i) => (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => go(i)}
                            className="w-8 h-10 inline-flex items-center justify-center cursor-pointer"
                            aria-label={`Ver banner ${i + 1}: ${b.title}`}
                            aria-current={i === index}
                        >
                            <span
                                className={`block h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-signal' : 'w-2 bg-on-sky/60'}`}
                                aria-hidden="true"
                            />
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => go(index + 1)}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-[2px] border border-on-sky/40 text-on-sky hover:bg-on-sky/10 cursor-pointer"
                        aria-label="Banner siguiente"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function BannerArt({ art }: { art: HeroArt }) {
    return (
        <svg
            viewBox="0 0 760 340"
            preserveAspectRatio="xMaxYMax meet"
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
        >
            <Stars />
            <path d="M 380 250 Q 590 10 820 170" className="stroke-on-sky" strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" fill="none" opacity="0.5" />
            <path d="M 400 300 Q 610 90 820 240" className="stroke-on-sky" strokeWidth="1.2" strokeDasharray="2 9" strokeLinecap="round" fill="none" opacity="0.28" />
            {art === 'dish' ? <DishScene /> : <CarScene />}
        </svg>
    );
}

function Stars() {
    return (
        <g className="fill-on-sky">
            <circle cx="430" cy="40" r="1.6" opacity="0.8" />
            <circle cx="520" cy="86" r="1.2" opacity="0.6" />
            <circle cx="740" cy="34" r="1.7" opacity="0.85" />
            <circle cx="722" cy="140" r="1.1" opacity="0.5" />
            <circle cx="478" cy="156" r="1" opacity="0.5" />
            <circle cx="590" cy="30" r="1.2" opacity="0.55" />
        </g>
    );
}

function Satellite({ x, y }: { x: number; y: number }) {
    return (
        <g>
            <circle cx={x} cy={y} r="18" className="stroke-signal" strokeWidth="2" fill="none" />
            <rect x={x - 8} y={y - 5} width="16" height="10" className="fill-signal" />
            <line x1={x - 28} y1={y} x2={x - 12} y2={y} className="stroke-on-sky" strokeWidth="3" />
            <line x1={x + 12} y1={y} x2={x + 28} y2={y} className="stroke-on-sky" strokeWidth="3" />
        </g>
    );
}

/** Antena sobre la cordillera apuntando al satélite */
function DishScene() {
    return (
        <g>
            <line x1="512" y1="282" x2="660" y2="84" className="stroke-signal" strokeWidth="2.5" strokeDasharray="8 7" />
            <Satellite x={660} y={84} />
            <polygon points="360,318 420,284 468,300 530,256 590,284 650,242 710,276 760,256 760,340 360,340" className="fill-night" />
            <polyline points="360,318 420,284 468,300 530,256 590,284 650,242 710,276 760,256" className="stroke-on-sky" strokeWidth="1.5" fill="none" opacity="0.6" />
            <rect x="490" y="268" width="40" height="24" className="fill-on-sky" transform="rotate(-32 510 280)" />
        </g>
    );
}

/** Camioneta en la ruta con la antena en el techo y el adaptador al vehículo */
function CarScene() {
    return (
        <g>
            {/* Cerros de fondo */}
            <polyline points="360,262 420,236 470,250 540,214 600,240 660,206 720,232 760,220" className="stroke-on-sky" strokeWidth="1.5" fill="none" opacity="0.35" />

            {/* Señal: de la antena del techo al satélite */}
            <line x1="606" y1="186" x2="676" y2="74" className="stroke-signal" strokeWidth="2.5" strokeDasharray="8 7" />
            <Satellite x={676} y={74} />

            {/* Ruta */}
            <rect x="360" y="296" width="400" height="44" className="fill-night" />
            <line x1="360" y1="318" x2="760" y2="318" className="stroke-on-sky" strokeWidth="2" strokeDasharray="22 16" opacity="0.6" />

            {/* Camioneta */}
            <path
                d="M452,288 L452,252 Q454,240 470,239 L552,236 L576,208 L646,208 L668,236 L738,236 Q744,237 744,246 L744,288 Z"
                className="fill-on-sky"
            />
            <polygon points="562,236 582,214 608,214 608,236" className="fill-sky" />
            <polygon points="614,214 642,214 660,236 614,236" className="fill-sky" />
            <rect x="452" y="258" width="14" height="8" className="fill-signal" />
            <circle cx="500" cy="290" r="20" className="fill-night stroke-on-sky" strokeWidth="3" />
            <circle cx="500" cy="290" r="7" className="fill-on-sky" />
            <circle cx="694" cy="290" r="20" className="fill-night stroke-on-sky" strokeWidth="3" />
            <circle cx="694" cy="290" r="7" className="fill-on-sky" />

            {/* Antena en el techo */}
            <line x1="606" y1="208" x2="606" y2="198" className="stroke-night" strokeWidth="3" />
            <rect x="588" y="186" width="38" height="11" className="fill-night" transform="rotate(-14 607 191)" />

            {/* Cable al adaptador del auto */}
            <path d="M606,200 C 560,170 520,150 506,128" className="stroke-signal" strokeWidth="2" strokeDasharray="3 5" fill="none" />

            {/* Detalle del adaptador */}
            <g transform="translate(436 70)">
                <rect x="0" y="0" width="104" height="60" rx="2" className="fill-night stroke-signal" strokeWidth="2" />
                {/* ficha del encendedor */}
                <rect x="14" y="20" width="34" height="20" rx="3" className="fill-on-sky" />
                <rect x="48" y="25" width="8" height="10" className="fill-on-sky" />
                <rect x="56" y="28.5" width="5" height="3" className="fill-signal" />
                <line x1="20" y1="30" x2="10" y2="30" className="stroke-on-sky" strokeWidth="3" strokeLinecap="round" />
                <text x="68" y="35" className="fill-on-sky" fontFamily="IBM Plex Mono, monospace" fontSize="13" fontWeight="500">12 V</text>
            </g>
        </g>
    );
}
