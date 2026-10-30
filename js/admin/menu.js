// ============================================================
// admin/menu.js — A3. Menú principal. Todas las confirmaciones
// vuelven aquí. Cada tarea tiene su color y un ícono 3D mate, hecho
// con el mismo material que los productos de la estantería.
// ============================================================

import { logout } from '../store.js';
import { conSesion, renderEncabezado } from './comun.js';
import { renderGato } from '../gato.js';

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

// Íconos 3D mates guardados como imágenes (assets/iconos): se ven siempre,
// sin tener que dibujarlos en 3D al abrir el menú. El de insumos es la caja
// con la cruz roja del archivo del equipo (cajas.glb).
const VERSION_ICONOS = '20261030h';
export const ICONO_MENU = (clave) => `assets/iconos/menu-${clave}.png?v=${VERSION_ICONOS}`;
function icono(o) {
  return `<img src="${ICONO_MENU(o.clave)}" alt="" width="256" height="256" />`;
}

export const render = conSesion((_params, centro) => ({
  html: `
    <section class="vista vista-admin vista-menu-admin">
      ${renderEncabezado({ titulo: 'Menú principal', centro })}
      <!-- Las tareas a la izquierda (hasta la mitad de la pantalla) y el
           gato a la derecha, invitando a elegir (oct 2026). -->
      <div class="menu-admin__cuerpo">
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
      <div class="menu-admin__gato">
        ${renderGato('Selecciona la tarea que deseas realizar.', { tamano: 'lado' })}
      </div>
      </div>
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
    // Mientras se elige la tarea, se preparan en segundo plano los modelos
    // de la estantería y las "fotos" de los productos (eran lo que trababa
    // al abrir Gestionar insumos y Registrar donación). Las fotos se hacen
    // de una en una, cuando el navegador está libre.
    let activo = true;
    const libre = (f) => (window.requestIdleCallback ?? ((g) => setTimeout(g, 30)))(f, { timeout: 800 });
    const temporizador = setTimeout(() => {
      libre(async () => {
        try {
          const [{ precargarEstanteria, MODELOS_SUBCATEGORIA }, { generarMiniatura }] = await Promise.all([
            import('../estanteria3d.js?v=20261030q'),
            import('../miniaturas3d.js'),
          ]);
          precargarEstanteria();
          for (const sub of Object.keys(MODELOS_SUBCATEGORIA)) {
            if (!activo) return;
            await new Promise((ok) => libre(ok));
            await generarMiniatura(sub);
          }
        } catch {
          /* sin 3D: no pasa nada */
        }
      });
    }, 1200);
    return () => {
      activo = false;
      clearTimeout(temporizador);
    };

  },
}));
