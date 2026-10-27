// ============================================================
// admin/menu.js — A3. Menú principal. Todas las confirmaciones
// vuelven aquí. Cada tarea tiene su color y un ícono 3D mate, hecho
// con el mismo material que los productos de la estantería.
// ============================================================

import { logout } from '../store.js';
import { MINIATURAS } from '../cache-miniaturas.js';
import { conSesion, renderEncabezado } from './comun.js';

const OPCIONES = [
  {
    ruta: '#/admin/insumos',
    clave: 'insumos',
    icono: '📦',
    titulo: 'Gestionar insumos',
    texto: 'Cambia el estado de lo que tiene tu centro.',
  },
  {
    ruta: '#/admin/donacion',
    clave: 'donacion',
    icono: '❤️',
    titulo: 'Registrar donación',
    texto: 'Anota a quien acaba de entregar en el centro.',
  },
  {
    ruta: '#/admin/despacho',
    clave: 'despacho',
    icono: '🚚',
    titulo: 'Registrar despacho',
    texto: 'Registra el camión que sale con el lote de la semana.',
  },
];

// Si la "foto" 3D ya está hecha se usa; si no, el emoji mientras carga.
function icono(o) {
  const foto = MINIATURAS.get(`menu-${o.clave}`);
  return foto ? `<img src="${foto}" alt="" width="72" height="72" />` : o.icono;
}

export const render = conSesion((_params, centro) => ({
  html: `
    <section class="vista vista-admin vista-menu-admin">
      ${renderEncabezado({ titulo: 'Menú principal', centro })}
      <nav class="menu-admin" aria-label="Tareas del administrador">
        ${OPCIONES.map(
          (o) => `
            <button type="button" class="menu-admin__opcion menu-admin__opcion--${o.clave}" data-navegar="${o.ruta}">
              <span class="menu-admin__icono" data-icono-menu="${o.clave}" aria-hidden="true">${icono(o)}</span>
              <span class="menu-admin__texto">
                <span class="menu-admin__titulo">${o.titulo}</span>
                <span class="menu-admin__descripcion">${o.texto}</span>
              </span>
              <span class="menu-admin__flecha" aria-hidden="true">›</span>
            </button>`
        ).join('')}
      </nav>
      <div class="menu-admin__pie">
        <a class="boton-texto" href="#/correos-enviados">Bandeja de correos (prueba)</a>
        <button type="button" class="boton-texto" data-cerrar-sesion>Cerrar sesión</button>
      </div>
    </section>
  `,
  init(contenedor) {
    contenedor.querySelector('[data-cerrar-sesion]').addEventListener('click', () => {
      logout();
      location.hash = '#/entrar';
    });

    // Íconos 3D (si three.js no carga, se quedan los emojis).
    import('../miniaturas3d.js')
      .then(({ generarIconoMenu }) =>
        Promise.all(
          OPCIONES.map((o) =>
            generarIconoMenu(o.clave).then((foto) => {
              const el = contenedor.querySelector(`[data-icono-menu="${o.clave}"]`);
              if (foto && el) el.innerHTML = `<img src="${foto}" alt="" width="72" height="72" />`;
            })
          )
        )
      )
      .catch(() => {});
  },
}));
