export const STORE_CONFIG = {
  storeName: 'Lucas Shop',
  defaultWhatsApp: '5493885925942', // Abra Pampa (número actual)
  jujuyWhatsApp: '5493880000000', // TODO: Reemplazar por el número de San Salvador de Jujuy
};

/**
 * Genera un enlace a WhatsApp limpio.
 * @param text Mensaje a pre-escribir.
 * @param location Ubicación del producto para determinar a qué sucursal contactar.
 */
export function getWhatsAppUrl(text: string, location?: string): string {
  let phone = STORE_CONFIG.defaultWhatsApp;
  if (location) {
      const loc = location.toLowerCase();
      if (loc.includes('san salvador') || (loc.includes('jujuy') && !loc.includes('abra'))) {
          phone = STORE_CONFIG.jujuyWhatsApp;
      }
  }
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
