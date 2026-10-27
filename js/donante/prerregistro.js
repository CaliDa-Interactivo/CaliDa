// ============================================================
// prerregistro.js — D5b · Pre-registro de la donación.
// Cédula + fecha (hoy). Opcional: compartir la ubicación (para
// el mapa del trayecto en el correo). Al guardar, aviso de que la
// donación debe hacerse válida en las próximas 24 horas; luego se abre
// la pantalla con "Cómo llegar" y "Regresar al mapa" (llegar.js).
// ============================================================

import { getCentro, crearPrerregistro, HORAS_VIGENCIA_PRERREGISTRO } from '../store.js';
import { obtenerSubcategoria, obtenerCategoriaPorSubcategoria, IMPORTANCIA_SUBCATEGORIA } from '../data.js';
import { ilustracion, productoPrincipal, cargarMiniaturas, iconoProducto } from '../ilustraciones.js';
import { renderGato } from '../gato.js';
import { obtenerUbicacion, ubicacionGuardada } from '../ubicacion.js';
import { recordarPrerregistro, horaVencimiento } from './prerregistro-sesion.js';
import { renderBotonInicio } from '../boton-inicio.js?v=20261027f';
import { montarGatos } from '../gatos.js';

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function aDDMMAAAA(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function render({ centroId, subcategoriaId }) {
  const centro = getCentro(centroId);
  const subcategoria = obtenerSubcategoria(subcategoriaId);
  const categoria = obtenerCategoriaPorSubcategoria(subcategoriaId);

  if (!centro || !subcategoria) {
    return `<section class="vista"><a class="boton-atras" href="#/donante/estanteria">← Volver</a><h1>Centro no encontrado</h1></section>`;
  }

  const hoy = hoyISO();
  return {
    html: `
      <section class="vista vista-prerregistro vista-columnas">
        <header class="mapa3d__encabezado">
          <!-- "Volver" lleva a la estantería completa, con todas las categorías -->
          <a class="boton-atras" href="#/donante/estanteria">← Volver</a>
          <p class="mapa__indicador">${subcategoria.nombre} › ${centro.nombre}</p>
          ${renderBotonInicio()}
        </header>

        <div class="mapa-envoltura">
          <!-- El gato, en su columna, explica por qué importa la donación -->
          <div class="mapa3d__gato gato-asoma gato-asoma--lado">
            ${renderGato(
              `<span class="gato-mapa__principal">¡Gracias por ayudar!</span>
               <span class="gato-mapa__detalle">${
                 IMPORTANCIA_SUBCATEGORIA[subcategoriaId] ?? 'Cada donación cuenta.'
               }</span>`,
              { tamano: 'lado' }
            )}
          </div>

        <div class="pantalla-panel prerregistro">
          <h1>Pre-registra tu donación</h1>
          <div class="prerregistro__resumen">
            ${iconoProducto(subcategoriaId, 64)}
            <div>
              <p class="prerregistro__que">${subcategoria.nombre}</p>
              <p class="prerregistro__donde">${centro.nombre} · Zona ${centro.zona}</p>
            </div>
          </div>

          <form class="formulario" id="form-prerregistro" novalidate>
            <div class="campo">
              <label for="pre-cc">Cédula</label>
              <input id="pre-cc" name="cedula" inputmode="numeric" autocomplete="off" minlength="8" maxlength="10"
                     placeholder="Solo números" required aria-describedby="pre-cc-ayuda pre-cc-error" />
              <p class="campo__ayuda" id="pre-cc-ayuda">Entre 8 y 10 números, sin puntos ni espacios.</p>
              <p class="campo__error" id="pre-cc-error" hidden></p>
            </div>

            <div class="campo">
              <label for="pre-fecha">Fecha de tu donación</label>
              <input id="pre-fecha" name="fecha" type="date" value="${hoy}" min="${hoy}" max="${hoy}" readonly
                     aria-describedby="pre-fecha-ayuda" />
              <p class="campo__ayuda" id="pre-fecha-ayuda">Es hoy: el pre-registro vale ${HORAS_VIGENCIA_PRERREGISTRO} horas.</p>
            </div>

            <div class="campo prerregistro__ubicacion">
              <span class="prerregistro__ubicacion-titulo">Tu ubicación <span class="campo__opcional">(opcional)</span></span>
              <p class="campo__ayuda">Con ella te mostraremos en el correo el trayecto de tu donación hasta su destino.</p>
              <button type="button" class="boton boton--azul" data-compartir-ubicacion>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                  <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <circle cx="12" cy="9.8" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span data-texto-ubicacion>Compartir mi ubicación</span>
              </button>
              <p class="prerregistro__ubicacion-estado" aria-live="polite"></p>
            </div>
          </form>
        </div>
        </div>

        <div class="mapa3d__barra">
          <div class="mapa3d__ubicacion pantalla-acciones">
            <button class="boton boton--grande" type="submit" form="form-prerregistro">Hacer pre-registro</button>
          </div>
        </div>
      </section>
    `,
    init(contenedor) {
      const form = contenedor.querySelector('form');
      const cedula = form.cedula;
      const error = contenedor.querySelector('#pre-cc-error');
      const botonUbicacion = contenedor.querySelector('[data-compartir-ubicacion]');
      const estadoUbicacion = contenedor.querySelector('.prerregistro__ubicacion-estado');
      let ubicacion = ubicacionGuardada();

      const mostrarUbicacionLista = () => {
        estadoUbicacion.textContent = '✓ Ubicación compartida.';
        botonUbicacion.querySelector('[data-texto-ubicacion]').textContent = 'Actualizar mi ubicación';
      };
      if (ubicacion) mostrarUbicacionLista();

      botonUbicacion.addEventListener('click', async () => {
        estadoUbicacion.textContent = 'Buscando tu ubicación…';
        botonUbicacion.disabled = true;
        try {
          ubicacion = await obtenerUbicacion();
          mostrarUbicacionLista();
        } catch (e) {
          estadoUbicacion.textContent = e.message;
        } finally {
          botonUbicacion.disabled = false;
        }
      });

      cedula.addEventListener('input', () => {
        cedula.value = cedula.value.replace(/\D/g, '');
        error.hidden = true;
        cedula.removeAttribute('aria-invalid');
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (cedula.value.length < 8 || cedula.value.length > 10) {
          error.textContent = cedula.value ? 'La cédula debe tener entre 8 y 10 números.' : 'Escribe tu cédula.';
          error.hidden = false;
          cedula.setAttribute('aria-invalid', 'true');
          cedula.focus();
          return;
        }

        const pre = crearPrerregistro({
          cedula: cedula.value,
          centroId,
          subcategoriaId,
          categoriaId: categoria.id,
          fecha: aDDMMAAAA(form.fecha.value),
          ubicacion: ubicacion ? { lat: ubicacion.lat, lng: ubicacion.lng } : null,
        });
        recordarPrerregistro(pre);

        // Aviso: la donación debe hacerse válida en las próximas 24 horas.
        contenedor.querySelector('.vista-prerregistro').innerHTML = `
          <header class="mapa3d__encabezado">
            <p class="mapa__indicador">${subcategoria.nombre} › ${centro.nombre}</p>
            ${renderBotonInicio()}
          </header>
          <div class="mapa-envoltura">
            <div class="mapa3d__gato gato-asoma gato-asoma--lado">
              ${renderGato(
                `<span class="gato-mapa__principal">¡Gracias!</span>
                 <span class="gato-mapa__detalle">Ahora te muestro cómo llegar.</span>`,
                { tamano: 'lado', pose: 'feliz' }
              )}
            </div>
            <div class="pantalla-panel prerregistro-listo" role="status">
              <div class="prerregistro-listo__check" aria-hidden="true">✓</div>
              <h1 tabindex="-1">¡Pre-registro listo!</h1>
              <div class="prerregistro-listo__sub">
                <span class="prerregistro-listo__figura">${iconoProducto(subcategoriaId, 140)}</span>
                <p class="prerregistro-listo__sub-nombre">${subcategoria.nombre}</p>
                <p class="prerregistro-listo__sub-centro">para ${centro.nombre}</p>
              </div>
              <p class="prerregistro-listo__aviso">
                Tu donación debe hacerse válida en las próximas <strong>${HORAS_VIGENCIA_PRERREGISTRO} horas</strong>:
                llévala al centro antes del <strong>${horaVencimiento(pre)}</strong>
              </p>
              <p>En el centro te pedirán tu cédula para confirmarla.</p>
            </div>
          </div>
          <div class="mapa3d__barra">
            <div class="mapa3d__ubicacion pantalla-acciones">
              <button class="boton boton--grande" type="button"
                      data-navegar="#/donante/llegar/${centroId}/${subcategoriaId}">Continuar</button>
            </div>
          </div>
        `;
        contenedor.querySelector('h1').focus();
        window.scrollTo(0, 0);
        // Si el producto tiene modelo 3D, se muestra su "foto".
        cargarMiniaturas(contenedor);
        montarGatos(contenedor);
      });
    },
  };
}
