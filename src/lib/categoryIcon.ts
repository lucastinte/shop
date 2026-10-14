import {
    BatteryCharging,
    Cable,
    Camera,
    Gamepad2,
    Headphones,
    House,
    Laptop,
    Monitor,
    Mouse,
    Package,
    SatelliteDish,
    Smartphone,
    Speaker,
    Watch,
    Wifi,
    Wrench,
    type LucideIcon,
} from 'lucide-react';

// Las categorías se cargan libremente desde el dashboard, así que el ícono
// se elige por palabras clave del nombre. Lo que no coincide usa una caja.
const RULES: Array<[RegExp, LucideIcon]> = [
    [/starlink|antena|satel/i, SatelliteDish],
    [/router|wi-?fi|red(es)?\b|conectiv|internet|modem|módem/i, Wifi],
    [/cargador|energ|bater|power|fuente|pila|solar/i, BatteryCharging],
    [/cable|adaptador|hub|usb|hdmi|extens/i, Cable],
    [/auricular|headphone|audio|sonido/i, Headphones],
    [/parlante|speaker|bocina/i, Speaker],
    [/celular|tel[eé]fono|smartphone|funda|vidrio|templado|iphone|android/i, Smartphone],
    [/mouse|teclado|perif/i, Mouse],
    [/notebook|laptop|compu|pc\b|memoria|pendrive|disco|ssd/i, Laptop],
    [/monitor|tv|televis|pantalla|proyector/i, Monitor],
    [/c[aá]mara|foto|seguridad/i, Camera],
    [/juego|gamer|gaming|consola|joystick/i, Gamepad2],
    [/reloj|smartwatch|watch/i, Watch],
    [/hogar|casa|cocina/i, House],
    [/soporte|montaje|herramient|repuesto/i, Wrench],
];

export function iconForCategory(name: string): LucideIcon {
    for (const [re, icon] of RULES) {
        if (re.test(name)) return icon;
    }
    return Package;
}
