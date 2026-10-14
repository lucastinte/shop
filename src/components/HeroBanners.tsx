import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { HERO_BANNERS, type HeroArt, type HeroBanner } from '../config/storeConfig';

const ROTATE_MS = 7000;
const SWIPE_PX = 40;
const NARROW_QUERY = '(max-width: 639px)';

/** true en celulares (debajo del breakpoint sm de Tailwind) */
function useIsNarrow() {
    const [narrow, setNarrow] = useState(
        () => typeof window !== 'undefined' && !!window.matchMedia?.(NARROW_QUERY).matches
    );
    useEffect(() => {
        const mq = window.matchMedia?.(NARROW_QUERY);
        if (!mq) return;
        const update = () => setNarrow(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);
    return narrow;
}

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
    const narrow = useIsNarrow();
    const touchX = useRef<number | null>(null);
    const reduceMotion = useRef(
        typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    );

    useEffect(() => {
        if (paused || reduceMotion.current || banners.length < 2) return;
        const t = window.setTimeout(() => setIndex(i => (i + 1) % banners.length), ROTATE_MS);
        return () => window.clearTimeout(t);
    }, [index, paused, banners.length]);

    const go = (i: number) => setIndex((i + banners.length) % banners.length);

    // En el celular se cambia de banner deslizando (las flechas se ocultan)
    const onTouchStart = (e: TouchEvent) => { touchX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
        if (touchX.current === null || banners.length < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) >= SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
    };

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
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
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
                            {/* Celular y tablet: el dibujo va abajo. Escritorio ancho: detrás, a la derecha */}
                            <div className="absolute inset-x-0 bottom-0 h-40 sm:h-48 xl:inset-0 xl:h-full pointer-events-none">
                                <BannerArt art={b.art} narrow={narrow} />
                            </div>
                            <div className="relative p-6 pb-44 sm:p-10 sm:pb-60 xl:pb-10 flex flex-col gap-3 sm:gap-4 max-w-[30rem]">
                                <span className="label-mono">{b.kicker}</span>
                                {i === 0 ? (
                                    <h1 className="font-display font-black uppercase leading-[0.86] text-[clamp(38px,10.5vw,52px)] sm:text-[clamp(52px,8vw,88px)]">{b.title}</h1>
                                ) : (
                                    <h2 className="font-display font-black uppercase leading-[0.86] text-[clamp(38px,10.5vw,52px)] sm:text-[clamp(52px,8vw,88px)]">{b.title}</h2>
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
                // Celular: solo los puntos, a la altura de la etiqueta (no tapan el título;
                // se cambia deslizando). Desde sm: flechas + puntos.
                <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => go(index - 1)}
                        className="hidden sm:inline-flex w-10 h-10 items-center justify-center rounded-[2px] border border-on-sky/40 text-on-sky hover:bg-on-sky/10 cursor-pointer"
                        aria-label="Banner anterior"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    {banners.map((b, i) => (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => go(i)}
                            className="w-8 h-8 sm:h-10 inline-flex items-center justify-center cursor-pointer"
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
                        className="hidden sm:inline-flex w-10 h-10 items-center justify-center rounded-[2px] border border-on-sky/40 text-on-sky hover:bg-on-sky/10 cursor-pointer"
                        aria-label="Banner siguiente"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

/*
 * Animaciones con CSS (clases anim-* en index.css), que funcionan igual en
 * Safari, Chrome y Android. Para girar alrededor de un punto se usa el patrón
 * translate(punto) → rotación CSS con origen 0 0 → translate(-punto), que no
 * depende de cómo cada navegador interpreta transform-origin en SVG.
 * Con "reducir movimiento" activado en el sistema, el dibujo queda quieto.
 */

/** Gira su contenido alrededor de (x, y) con la clase de animación dada */
function Pivot({ x, y, className, style, children }: { x: number; y: number; className: string; style?: CSSProperties; children: ReactNode }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <g className={className} style={style}>
                <g transform={`translate(${-x} ${-y})`}>{children}</g>
            </g>
        </g>
    );
}

function BannerArt({ art, narrow }: { art: HeroArt; narrow: boolean }) {
    // Las escenas ocupan la mitad derecha del lienzo (x 340-760, y 50-340).
    // En el celular el dibujo va solo debajo del texto: se recorta a esa zona y se
    // centra, para que no quede chico en la esquina con media franja vacía.
    return (
        <svg
            viewBox={narrow ? '340 50 420 290' : '0 0 760 340'}
            preserveAspectRatio={narrow ? 'xMidYMax meet' : 'xMaxYMax meet'}
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
    const stars = [
        { cx: 430, cy: 40, r: 1.6, o: 0.8, d: '0s' },
        { cx: 520, cy: 86, r: 1.2, o: 0.6, d: '-1.2s' },
        { cx: 740, cy: 34, r: 1.7, o: 0.85, d: '-2.1s' },
        { cx: 722, cy: 140, r: 1.1, o: 0.5, d: '-0.6s' },
        { cx: 478, cy: 156, r: 1, o: 0.5, d: '-2.8s' },
        { cx: 590, cy: 30, r: 1.2, o: 0.55, d: '-1.7s' },
    ];
    return (
        <g className="fill-on-sky">
            {stars.map(st => (
                <circle key={`${st.cx}-${st.cy}`} cx={st.cx} cy={st.cy} r={st.r} opacity={st.o} className="anim-titila" style={{ animationDelay: st.d }} />
            ))}
        </g>
    );
}

/** Satélite: el anillo late y el cuerpo se mantiene derecho mientras orbita */
function Satellite({ x, y, amp }: { x: number; y: number; amp: string }) {
    return (
        <Pivot x={x} y={y} className="anim-orbita-inv" style={{ '--amp': amp } as CSSProperties}>
            <Pivot x={x} y={y} className="anim-pulso">
                <circle cx={x} cy={y} r="18" className="stroke-signal" strokeWidth="2" fill="none" />
            </Pivot>
            <rect x={x - 8} y={y - 5} width="16" height="10" className="fill-signal" />
            <line x1={x - 28} y1={y} x2={x - 12} y2={y} className="stroke-on-sky" strokeWidth="3" />
            <line x1={x + 12} y1={y} x2={x + 28} y2={y} className="stroke-on-sky" strokeWidth="3" />
        </Pivot>
    );
}

/**
 * Haz de la antena al satélite + satélite, girando juntos alrededor de la
 * antena: el satélite recorre su órbita y el haz siempre lo sigue.
 */
function Orbit({ fromX, fromY, toX, toY, amp }: { fromX: number; fromY: number; toX: number; toY: number; amp: string }) {
    return (
        <Pivot x={fromX} y={fromY} className="anim-orbita" style={{ '--amp': amp } as CSSProperties}>
            <line x1={fromX} y1={fromY} x2={toX} y2={toY} className="stroke-signal anim-senal" strokeWidth="2.5" strokeDasharray="8 7" />
            <Satellite x={toX} y={toY} amp={amp} />
        </Pivot>
    );
}

/** Antena sobre la cordillera apuntando al satélite */
function DishScene() {
    return (
        <g>
            <Orbit fromX={512} fromY={282} toX={660} toY={84} amp="9deg" />
            <polygon points="360,318 420,284 468,300 530,256 590,284 650,242 710,276 760,256 760,340 360,340" className="fill-night" />
            <polyline points="360,318 420,284 468,300 530,256 590,284 650,242 710,276 760,256" className="stroke-on-sky" strokeWidth="1.5" fill="none" opacity="0.6" />
            <rect x="490" y="268" width="40" height="24" className="fill-on-sky" transform="rotate(-32 510 280)" />
        </g>
    );
}

function Wheel({ cx }: { cx: number }) {
    const cy = 290;
    return (
        <g>
            <circle cx={cx} cy={cy} r="20" className="fill-night stroke-on-sky" strokeWidth="3" />
            <Pivot x={cx} y={cy} className="anim-rueda">
                <circle cx={cx} cy={cy} r="7" className="fill-on-sky" />
                <rect x={cx - 1.5} y={cy - 16} width="3" height="9" className="fill-on-sky" />
                <rect x={cx - 1.5} y={cy + 7} width="3" height="9" className="fill-on-sky" />
            </Pivot>
        </g>
    );
}

/** Camioneta en la ruta con la antena en el techo y el adaptador al vehículo */
function CarScene() {
    return (
        <g>
            {/* Cerros de fondo: se desplazan despacio (paralaje) */}
            <g className="anim-cerros">
                <polyline points="320,262 420,236 470,250 540,214 600,240 660,206 720,232 790,220" className="stroke-on-sky" strokeWidth="1.5" fill="none" opacity="0.35" />
            </g>

            {/* Señal: de la antena del techo al satélite */}
            <Orbit fromX={606} fromY={186} toX={676} toY={74} amp="12deg" />

            {/* Ruta: la línea punteada corre para dar sensación de avance */}
            <rect x="360" y="296" width="400" height="44" className="fill-night" />
            <line x1="360" y1="318" x2="760" y2="318" className="stroke-on-sky anim-ruta" strokeWidth="2" strokeDasharray="22 16" opacity="0.6" />

            {/* Camioneta (con un leve rebote) */}
            <g className="anim-rebote">
                <path
                    d="M452,288 L452,252 Q454,240 470,239 L552,236 L576,208 L646,208 L668,236 L738,236 Q744,237 744,246 L744,288 Z"
                    className="fill-on-sky"
                />
                <polygon points="562,236 582,214 608,214 608,236" className="fill-sky" />
                <polygon points="614,214 642,214 660,236 614,236" className="fill-sky" />
                <rect x="452" y="258" width="14" height="8" className="fill-signal anim-luz" />
                {/* Antena en el techo */}
                <line x1="606" y1="208" x2="606" y2="198" className="stroke-night" strokeWidth="3" />
                <rect x="588" y="186" width="38" height="11" className="fill-night" transform="rotate(-14 607 191)" />
            </g>
            <Wheel cx={500} />
            <Wheel cx={694} />

            {/* Cable al adaptador del auto */}
            <path d="M606,200 C 560,170 520,150 506,128" className="stroke-signal anim-cable" strokeWidth="2" strokeDasharray="3 5" fill="none" />

            {/* Detalle del adaptador */}
            <g transform="translate(436 70)">
                <rect x="0" y="0" width="104" height="60" rx="2" className="fill-night stroke-signal" strokeWidth="2" />
                <rect x="14" y="20" width="34" height="20" rx="3" className="fill-on-sky" />
                <rect x="48" y="25" width="8" height="10" className="fill-on-sky" />
                <rect x="56" y="28.5" width="5" height="3" className="fill-signal" />
                <line x1="20" y1="30" x2="10" y2="30" className="stroke-on-sky" strokeWidth="3" strokeLinecap="round" />
                <text x="68" y="35" className="fill-on-sky" fontFamily="IBM Plex Mono, monospace" fontSize="13" fontWeight="500">12 V</text>
            </g>
        </g>
    );
}
