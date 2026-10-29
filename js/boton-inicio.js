// ============================================================
// boton-inicio.js — botón "Volver a pantalla principal" (#/entrar) o,
// en las funciones del administrador, "Volver al menú".
// main.js lo agrega solo en las pantallas a las que se llega
// después de pasar más de dos pantallas (donante y administrador),
// y en la pantalla de pre-registro.
// ============================================================

// La pantalla principal es "Elige tu perfil" (botones de donador y admin),
// no la intro animada.
export const RUTA_PRINCIPAL = '#/entrar';

// En las funciones del administrador (insumos, donación, despacho y la
// bandeja de correos) el botón lleva al menú: "Volver al menú".
export const RUTA_MENU_ADMIN = '#/admin/menu';

const ICONO_CASA = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-5.5h3V20h5V9.5" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
const ICONO_MENU = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <rect x="4" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <rect x="13" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <rect x="4" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <rect x="13" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>`;

export function renderBotonInicio({ alMenu = false } = {}) {
  return `
    <div class="barra-inicio">
      <a class="boton-inicio" href="${alMenu ? RUTA_MENU_ADMIN : RUTA_PRINCIPAL}">
        ${alMenu ? ICONO_MENU : ICONO_CASA}
        ${alMenu ? 'Volver al menú' : 'Volver a pantalla principal'}
      </a>
    </div>`;
}

// Inserta el botón al comienzo de la vista (si no lo tiene ya).
export function agregarBotonInicio(vista, opciones) {
  if (!vista || vista.querySelector('.barra-inicio')) return;
  vista.insertAdjacentHTML('afterbegin', renderBotonInicio(opciones));
}

// --- Botones de navegación solo con ícono (oct 2026) -----------------
// "Volver", "Volver a pantalla principal" / "Volver al menú" e "Ir a la
// estantería" se ven en todas las pantallas como un círculo del mismo
// tamaño con un ícono grande. El texto queda como nombre accesible
// (aria-label) y como globo al pasar el mouse (title).
const ICONOS_NAV = {
  volver: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19 12H5M11 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4"
            stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  inicio: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-5.5h3V20h5V9.5" fill="none" stroke="currentColor"
            stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <rect x="13" y="4" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <rect x="4" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <rect x="13" y="13" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,
  estanteria: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <path d="M4 9h16M4 15h16M12 3v6" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,
};

function tipoDeBoton(boton) {
  if (boton.classList.contains('boton-atras')) return 'volver';
  if (boton.classList.contains('boton-estanteria')) return 'estanteria';
  return boton.getAttribute('href') === RUTA_MENU_ADMIN ? 'menu' : 'inicio';
}

export function botonesNavSoloIcono(raiz) {
  raiz.querySelectorAll('.boton-atras, .boton-inicio, .boton-estanteria').forEach((boton) => {
    if (boton.dataset.soloIcono) return;
    const nombre = boton.textContent.replace('←', '').replace(/\s+/g, ' ').trim();
    if (nombre) {
      boton.setAttribute('aria-label', nombre);
      boton.title = nombre;
    }
    boton.innerHTML = ICONOS_NAV[tipoDeBoton(boton)];
    boton.dataset.soloIcono = '1';
    boton.classList.add('boton-nav');
  });
}
