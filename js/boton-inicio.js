// ============================================================
// boton-inicio.js — botón "Volver a pantalla principal" (#/) o,
// en las funciones del administrador, "Volver al menú".
// main.js lo agrega solo en las pantallas a las que se llega
// después de pasar más de dos pantallas (donante y administrador),
// y en la pantalla de pre-registro.
// ============================================================

export const RUTA_PRINCIPAL = '#/';

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
