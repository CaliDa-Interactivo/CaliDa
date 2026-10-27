// ============================================================
// paisaje.js — ilustración de paisaje por capas (estilo plano, como
// la referencia del equipo): cielo, sol, colinas salvia, pinos y dos
// casitas (centros de acopio, con techo rojo y amarillo) o, con
// centro: 'cajas', cajas con donaciones (tarjeta del administrador).
// Se usa en la bienvenida y en el login. Solo decoración.
// ============================================================

let contador = 0;

function pino(x, y, s, color) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-1.5" y="-6" width="3" height="8" fill="#6E5440"/>
    <path d="M0 -40 L13 -14 L-13 -14 Z M0 -30 L16 -4 L-16 -4 Z M0 -20 L19 6 L-19 6 Z" transform="translate(0 -6)" fill="${color}"/>
  </g>`;
}

function casita(x, y, techo) {
  return `<g transform="translate(${x} ${y})">
    <rect x="-13" y="-16" width="26" height="18" fill="#FFF8ED"/>
    <path d="M-17 -15 L0 -30 L17 -15 Z" fill="${techo}"/>
    <rect x="-4" y="-8" width="8" height="10" fill="#8A6A4B"/>
  </g>`;
}

// Caja de cartón abierta (estilo plano, como las casitas), con lo que
// lleva asomándose por arriba. "contenido" son formas SVG ya ubicadas.
function caja(x, y, ancho, alto, contenido = '', cruz = false) {
  const m = ancho / 2;
  return `<g transform="translate(${x} ${y})">
    ${contenido}
    <rect x="${-m}" y="${-alto}" width="${ancho}" height="${alto}" rx="2" fill="#C98A55"/>
    <rect x="${-m}" y="${-alto}" width="${ancho}" height="5" fill="#B07A47"/>
    <path d="M${-m} ${-alto} l-8 -9 h${m - 4} l4 9 Z" fill="#D9A06B"/>
    <path d="M${m} ${-alto} l8 -9 h${-(m - 4)} l-4 9 Z" fill="#D9A06B"/>
    ${cruz ? `<rect x="-6" y="${-alto / 2 - 8}" width="12" height="16" rx="2" fill="#FFF8ED"/>
      <rect x="-1.6" y="${-alto / 2 - 5}" width="3.2" height="10" fill="#CC0100"/>
      <rect x="-5" y="${-alto / 2 - 1.6}" width="10" height="3.2" fill="#CC0100"/>` : ''}
  </g>`;
}

// Donaciones que se asoman de las cajas: agua, camisa, medicamento,
// papel higiénico y una lata.
const DONACIONES = {
  agua: (x, y) => `<g transform="translate(${x} ${y})">
    <rect x="-4.5" y="-30" width="9" height="26" rx="3" fill="#8FD0F2"/>
    <rect x="-2.5" y="-34" width="5" height="5" rx="1" fill="#1E6FD9"/>
    <rect x="-4.5" y="-21" width="9" height="6" fill="#FFF8ED"/></g>`,
  camisa: (x, y) => `<g transform="translate(${x} ${y})">
    <path d="M-9 -24 l-7 5 3 6 4 -2 v11 h18 v-11 l4 2 3 -6 -7 -5 q-3 3 -9 3 q-6 0 -9 -3 Z" fill="#5B8DB8"/></g>`,
  medicina: (x, y) => `<g transform="translate(${x} ${y})">
    <rect x="-6" y="-24" width="12" height="20" rx="2" fill="#FFF8ED"/>
    <rect x="-6" y="-26" width="12" height="5" rx="1.5" fill="#CC0100"/>
    <rect x="-6" y="-15" width="12" height="4" fill="#CC0100"/></g>`,
  papel: (x, y) => `<g transform="translate(${x} ${y})">
    <rect x="-7" y="-20" width="14" height="16" rx="3" fill="#FFFFFF"/>
    <ellipse cx="0" cy="-20" rx="7" ry="2.5" fill="#E8E1D5"/>
    <ellipse cx="0" cy="-20" rx="2" ry="1" fill="#B07A47"/></g>`,
  lata: (x, y) => `<g transform="translate(${x} ${y})">
    <rect x="-6" y="-18" width="12" height="14" rx="2" fill="#86B5A9"/>
    <rect x="-6" y="-14" width="12" height="5" fill="#FDD794"/></g>`,
};

export function renderPaisaje({ clase = '', etiqueta = '', centro = 'casas' } = {}) {
  const id = `paisaje${++contador}`;
  const pinosFondo = [40, 70, 95, 300, 330, 355, 380]
    .map((x, i) => pino(x, 182 - (i % 2) * 4, 0.75, '#6FA393'))
    .join('');
  const pinosFrente = [12, 34, 58, 250, 282, 312, 344, 372, 396]
    .map((x, i) => pino(x, 236 + (i % 3) * 3, 1 + (i % 2) * 0.15, i % 2 ? '#3E7A6C' : '#2F6457'))
    .join('');
  return `
    <svg class="paisaje ${clase}" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice"
         ${etiqueta ? `role="img" aria-label="${etiqueta}"` : 'aria-hidden="true"'} focusable="false">
      <defs>
        <linearGradient id="${id}-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#E3EFEA"/>
          <stop offset="1" stop-color="#FFF8ED"/>
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#${id}-cielo)"/>
      <circle cx="300" cy="62" r="26" fill="#FDD794"/>
      <path d="M0 150 C60 110 120 120 170 140 C230 100 300 105 400 135 L400 260 L0 260 Z" fill="#C9E0D7"/>
      <path d="M0 185 C70 150 140 160 200 178 C270 150 330 152 400 172 L400 260 L0 260 Z" fill="#A2CABB"/>
      ${pinosFondo}
      <path d="M0 215 C90 190 160 196 230 210 C300 194 350 196 400 206 L400 260 L0 260 Z" fill="#86B5A9"/>
      ${
        centro === 'cajas'
          ? // Cajas con distintos tipos de donaciones (tarjeta del administrador)
            caja(136, 222, 34, 22, DONACIONES.agua(-8, -20) + DONACIONES.camisa(8, -18), true) +
            caja(180, 226, 40, 26, DONACIONES.medicina(-10, -24) + DONACIONES.papel(4, -24) + DONACIONES.lata(15, -24)) +
            caja(223, 222, 30, 20, DONACIONES.lata(-5, -18) + DONACIONES.agua(6, -18), true)
          : casita(160, 214, '#CC0100') + casita(205, 220, '#F2C14E')
      }
      <path d="M0 240 C100 225 220 230 400 238 L400 260 L0 260 Z" fill="#3E7A6C"/>
      ${pinosFrente}
    </svg>`;
}
