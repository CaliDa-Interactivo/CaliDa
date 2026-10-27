// ============================================================
// ficha.js — D5 · Información del centro de acopio.
// Muestra el recuadro de la estantería con la cantidad (0 a 5) de
// la subcategoría elegida y el botón de pre-registro. "Cómo llegar"
// NO va aquí: está en la pantalla que se abre después del pre-registro
// (llegar.js).
// ============================================================

import { getCentro, getNecesidades } from '../store.js';
import {
  obtenerSubcategoria,
  obtenerCategoriaPorSubcategoria,
  estadoDeNivel,
  ETIQUETA_ESTADO,
  NIVEL_MAX,
} from '../data.js';
import { renderGato } from '../gato.js';
import { renderBotonInicio } from '../boton-inicio.js?v=20261027f';
import { renderRepisaNivel, cargarMiniaturas } from '../ilustraciones.js';
import { urlEmoji, EMOJI_CENTRO } from '../iconos.js';
import { prerregistroVigente, horaVencimiento } from './prerregistro-sesion.js';

export function renderNivel(subcategoria, nivel, { tamano = 52 } = {}) {
  const estado = estadoDeNivel(nivel);
  return `
    <div class="nivel ${nivel === 0 ? 'nivel--vacio' : ''}">
      <div class="nivel__repisa">${renderRepisaNivel(subcategoria.id, nivel, { tamano })}</div>
    </div>
  `;
}

// Etiqueta grande del estado: solo "Urgente" o "Desabastecido" (el mapa
// solo lleva a centros que necesitan la subcategoría).
const ETIQUETA_GRANDE = { urgente: '⚠ Urgente', desabastecido: 'Desabastecido' };

function renderEstadoGrande(nivel) {
  const estado = estadoDeNivel(nivel);
  if (!ETIQUETA_GRANDE[estado]) return '';
  return `<p class="estado-grande estado-grande--${estado}">${ETIQUETA_GRANDE[estado]}</p>`;
}

const escaparHTML = (t) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Elementos específicos que pidió el centro (los escribe el administrador).
function renderNecesidades(lista, subcategoria) {
  if (!lista.length) return '';
  return `
    <div class="necesidades">
      <h2 class="necesidades__titulo">Lo que necesitan de ${subcategoria.nombre.toLowerCase()}</h2>
      <ul class="necesidades__lista">
        ${lista.map((p) => `<li>${escaparHTML(p)}</li>`).join('')}
      </ul>
    </div>
  `;
}

export function render({ centroId, subcategoriaId }) {
  const centro = getCentro(centroId);
  const subcategoria = obtenerSubcategoria(subcategoriaId);
  const volverAtras = `#/donante/mapa/${subcategoriaId}`;

  if (!centro || !subcategoria) {
    return `
      <section class="vista">
        <a class="boton-atras" href="#/donante/estanteria">← Volver</a>
        <h1>Centro no encontrado</h1>
      </section>
    `;
  }

  const nivel = centro.insumos[subcategoriaId];
  const estado = estadoDeNivel(nivel);
  const categoria = obtenerCategoriaPorSubcategoria(subcategoriaId);
  const pre = prerregistroVigente(centroId, subcategoriaId);
  const nombreSub = subcategoria.nombre.toLowerCase();

  const acciones = pre
    ? `
      <button class="boton boton--grande" type="button"
              data-navegar="#/donante/llegar/${centro.id}/${subcategoria.id}">
        Continuar
      </button>
      <p class="ficha-prerregistro-ok" role="status">
        <strong>✓ Ya hiciste tu pre-registro.</strong> Lleva tu donación antes del ${horaVencimiento(pre)}
      </p>`
    : `
      <button class="boton boton--grande" type="button"
              data-navegar="#/donante/prerregistro/${centro.id}/${subcategoria.id}">
        Pre-registrar mi donación
      </button>
      <a class="boton boton--azul" href="${volverAtras}">Ver otros centros</a>
      <p class="ficha-centro__nota">Toma un minuto y avisa al centro que vas en camino.</p>`;

  // Lo que dice el gato: título corto (en rojo) y una frase de ánimo.
  const mensaje = pre
    ? `<span class="gato-mapa__principal">¡Ya te esperan!</span>
       <span class="gato-mapa__detalle">Cuando quieras, te muestro cómo llegar.</span>`
    : estado === 'urgente'
      ? `<span class="gato-mapa__principal">¡Este centro se quedó sin ${nombreSub}!</span>
         <span class="gato-mapa__detalle">Tu donación llega justo a tiempo.</span>`
      : `<span class="gato-mapa__principal">A este centro le queda poco de ${nombreSub}.</span>
         <span class="gato-mapa__detalle">Con tu ayuda no se queda sin nada.</span>`;

  return {
    html: `
    <section class="vista vista-ficha vista-columnas">
      <header class="mapa3d__encabezado">
        <a class="boton-atras" href="${volverAtras}">← Volver</a>
        <p class="mapa__indicador">${categoria ? `${categoria.nombre} › ` : ''}${subcategoria.nombre}</p>
        ${renderBotonInicio()}
        <a class="boton boton--secundario boton-estanteria" href="#/donante/estanteria">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M4 9h16M4 15h16M12 3v6" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          Ir a la estantería
        </a>
      </header>

      <div class="mapa-envoltura">
        <div class="mapa3d__gato gato-asoma gato-asoma--lado${estado === 'urgente' && !pre ? ' mapa3d__gato--urgente' : ''}">
          ${renderGato(mensaje, { tamano: 'lado', manoQuieta: true })}
        </div>
        <div class="pantalla-panel ficha-centro">
          <div class="ficha-centro__datos">
            <div class="ficha-centro__foto ficha-centro__foto--casa ficha-centro__foto--${estado}"
                 ${['urgente', 'desabastecido'].includes(estado) ? `data-mini-casa="${estado}"` : ''}>
              <img src="${urlEmoji(EMOJI_CENTRO)}" alt="" width="64" height="64" />
            </div>
            <h1 class="ficha__nombre">${centro.nombre}</h1>
            <ul class="ficha-centro__chips">
              <li><strong>Zona</strong> ${centro.zona}</li>
              <li><strong>Horario</strong> ${centro.horario}</li>
              <li><strong>Teléfono</strong> ${centro.telefono}</li>
            </ul>
          </div>
          <div class="ficha-centro__inventario">
            ${renderEstadoGrande(nivel)}
            ${renderNivel(subcategoria, nivel)}
            ${renderNecesidades(getNecesidades(centro.id, subcategoria.id), subcategoria)}
          </div>
        </div>
      </div>

      <div class="mapa3d__barra">
        <div class="mapa3d__ubicacion pantalla-acciones">${acciones}</div>
      </div>
    </section>
  `,
    // La repisa de cantidad muestra los mismos productos 3D de la estantería.
    init(contenedor) {
      cargarMiniaturas(contenedor);
    },
  };
}
