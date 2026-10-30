// ============================================================
// estanteria-vista.js — pantalla completa con la estantería 3D.
// Lo usan el donante (D2) y el administrador (insumos y donación).
//
// Pone el 3D a todo el ancho y alto, con el encabezado, el buscador
// y los botones +, −, ⟲ flotando encima. Si el 3D no puede cargar
// (sin internet o sin WebGL), muestra la estantería 2D de siempre.
// ============================================================

import { CATEGORIAS, coincideBusqueda } from './data.js';

// `ayudaArriba`: el encabezado ya trae el mensaje "Toca un
// compartimiento…" debajo de la pregunta (donante); no se repite abajo.
export const TEXTO_AYUDA_ESTANTERIA = 'Toca un compartimiento para ver sus productos';
// Parte del ancho que se deja a la derecha para el gato (vista general).
const FRACCION_LADO = 0.33;

// `lado`: HTML que va a la derecha del mueble (p. ej. el gato que pregunta);
// el 3D corre el mueble a la izquierda para dejarle ese espacio.
export function renderEscena3D({ encabezado, etiqueta = 'Estantería 3D de CaliDa', ayudaArriba = false, lado = '' }) {
  return `
    <div class="escena3d${lado ? ' escena3d--con-lado' : ''}" data-estado="cargando">
      ${lado ? `<aside class="escena3d__lado">${lado}</aside>` : ''}
      <div class="escena3d__lienzo" role="img" aria-label="${etiqueta}"></div>
      <div class="escena3d__etiquetas"></div>
      <div class="escena3d__arriba">${encabezado}</div>
      ${ayudaArriba ? '' : `<p class="escena3d__ayuda">${TEXTO_AYUDA_ESTANTERIA}</p>`}
      <p class="escena3d__cargando" aria-live="polite">Armando la estantería…</p>
    </div>`;
}

/**
 * Monta el 3D. Devuelve una función de limpieza.
 * @param {HTMLElement} contenedor
 * @param {object} opciones  las de montarEstanteria3D, más:
 *   rutaAbierta(cat), rutaCerrada, alFallar() (mostrar el 2D)
 */
export function montarVistaEstanteria3D(contenedor, opciones) {
  const escena = contenedor.querySelector('.escena3d');
  const vista = contenedor.querySelector('.vista');
  let api = null;
  let destruido = false;

  const fallar = () => {
    if (destruido) return;
    // Se queda el encabezado (con el buscador); se quita lo 3D.
    escena.dataset.estado = 'sin-3d';
    vista.classList.remove('vista-3d');
    opciones.alFallar?.();
  };

  import('./estanteria3d.js?v=20261030l')
    .then(({ montarEstanteria3D }) => {
      if (destruido) return;
      api = montarEstanteria3D({
        ...opciones,
        lienzo: escena.querySelector('.escena3d__lienzo'),
        margenSuperior: () => escena.querySelector('.escena3d__arriba')?.offsetHeight * 0.85 || 0,
        // Con el gato al lado, el mueble se encuadra en el 64 % izquierdo de
        // la pantalla (en celular el gato va arriba: no se reserva nada).
        margenDerecho: () => {
          const lado = escena.querySelector('.escena3d__lado');
          if (!lado || escena.dataset.cerca === 'si' || escena.clientWidth < 760) return 0;
          return escena.clientWidth * FRACCION_LADO;
        },
        // El gato (con su globo) mide lo mismo que el mueble y queda al mismo
        // margen del borde derecho que el mueble del izquierdo.
        alMoverMueble: (rect) => {
          // Dónde queda el mueble: la leyenda de estados del admin va pegada
          // a su lado izquierdo, centrada en su alto (css/tema.css).
          escena.style.setProperty('--mueble-izq', `${Math.round(rect.left)}px`);
          escena.style.setProperty('--mueble-centro-y', `${Math.round((rect.topInterior + rect.bottom) / 2)}px`);
          const lado = escena.querySelector('.escena3d__lado');
          lado?.classList.add('escena3d__lado--puesto'); // ya sabe dónde va: se muestra
          if (!lado || rect.ancho < 760) {
            lado?.style.removeProperty('top');
            lado?.style.removeProperty('height');
            lado?.style.removeProperty('right');
            return;
          }
          // El globo empieza a la altura del borde interno de arriba del
          // mueble y el gato termina a la altura de su base.
          lado.style.top = `${Math.round(rect.topInterior)}px`;
          lado.style.height = `${Math.round(rect.bottom - rect.topInterior)}px`;
          lado.style.right = `${Math.max(16, Math.round(rect.left))}px`;
        },
        capaEtiquetas: escena.querySelector('.escena3d__etiquetas'),
        alCambiarCategoria: (cat) => {
          history.replaceState(null, '', cat ? opciones.rutaAbierta(cat) : opciones.rutaCerrada);
          escena.dataset.cerca = cat ? 'si' : 'no';
          opciones.alCambiarCategoria?.(cat);
        },
        alCargar: (estado) => {
          if (estado === 'error') fallar();
          else escena.dataset.estado = 'listo';
        },
      });
      opciones.alMontar?.(api);
    })
    .catch((e) => {
      console.error('No se pudo cargar three.js:', e);
      fallar();
    });


  // Buscador: atenúa los compartimientos que no coinciden (acepta palabras
  // parecidas y relacionadas: "arroz", "perro", "casco", "camiza"…).
  const buscador = escena.querySelector('input[type="search"]');
  buscador?.addEventListener('input', () => {
    const t = buscador.value;
    api?.filtrar((cat) => coincideBusqueda(CATEGORIAS.find((c) => c.id === cat), t));
  });

  return () => {
    destruido = true;
    api?.destruir();
  };
}
