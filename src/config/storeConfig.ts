export const STORE_CONFIG = {
  storeName: 'Starlinkers',
  defaultWhatsApp: '5493885925942', // Código de país 549 + área 388 + 5925942
  /** Puntos de retiro y horario de atención (franja superior, portada, pie y ficha) */
  sedes: [
    { nombre: 'San Salvador de Jujuy', horario: '10 a 12 hs y 19 a 22 hs', direccion: 'Calle 7 de Agosto 350' },
    { nombre: 'Abra Pampa', horario: 'Por la tarde' },
  ] as Sede[],
};

export interface Sede {
  nombre: string;
  horario: string;
  direccion?: string;
}

/**
 * EXPERIMENTAL — Retiro en San Salvador de Jujuy.
 * Para productos de esa sede, el cliente elige pasar a retirar o mandar su
 * propio cadete/Uber (nosotros no hacemos el envío): ve la dirección, elige la
 * franja y avisa por WhatsApp cuando el cadete está en camino.
 * Poné `activo: false` para apagarlo.
 */
export const RETIRO_JUJUY = {
  activo: true,
  sede: 'San Salvador de Jujuy',
  direccion: 'Calle 7 de Agosto 350',
  ciudad: 'San Salvador de Jujuy',
  franjas: ['10 a 12 hs', '19 a 22 hs'],
};

/** Texto corto con las sedes: "San Salvador de Jujuy y Abra Pampa" */
export const SEDES_TEXT = STORE_CONFIG.sedes.map(s => s.nombre).join(' y ');

export type HeroArt = 'dish' | 'car';

export interface HeroBanner {
  id: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  /** Búsqueda que se aplica al tocar el botón (si no hay resultados, solo baja al catálogo) */
  query: string;
  art: HeroArt;
}

/** Banners rotativos de la portada. Para agregar uno, sumá un objeto acá. */
export const HERO_BANNERS: HeroBanner[] = [
  {
    id: 'mini-x',
    kicker: 'Starlink',
    title: 'Starlink Mini X',
    text: 'Internet satelital compacta para llevar a donde vayas. Precio y stock a la vista.',
    cta: 'Ver Starlink Mini X',
    query: 'mini x',
    art: 'dish',
  },
  {
    id: 'car-pack',
    kicker: 'Car Pack',
    title: 'Conexión en el auto',
    text: 'Tu Starlink en el vehículo, con su adaptador para enchufarla al auto y salir a la ruta conectado.',
    cta: 'Ver Car Pack',
    query: 'car pack',
    art: 'car',
  },
];

/**
 * Genera un enlace a WhatsApp limpio.
 * @param text Mensaje a pre-escribir.
 * @param phone Número de teléfono destino (opcional, usa el predeterminado si no se pasa).
 */
export function getWhatsAppUrl(text: string, phone: string = STORE_CONFIG.defaultWhatsApp): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
