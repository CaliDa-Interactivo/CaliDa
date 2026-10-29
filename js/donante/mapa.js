// ============================================================
// mapa.js — D4 · Mapa de Cali (Fase 3).
// Arma la interfaz alrededor del mapa 3D (indicador, gato,
// botones de zona, lista de resultados) y conecta los eventos.
// El mapa en sí vive en mapa3d.js y se carga de forma diferida:
// si three.js no carga (sin internet o sin WebGL), la lista de
// centros sigue funcionando como respaldo.
// ============================================================

import { obtenerCategoriaPorSubcategoria, obtenerSubcategoria, ZONAS, estadoDeNivel } from '../data.js';
import { obtenerUbicacion, ubicacionGuardada, distanciaKm, formatoKm } from '../ubicacion.js';
import { getCentros, getCentrosPorSubcategoria } from '../store.js';
import { renderGato } from '../gato.js';
import { cargarMiniaturas } from '../ilustraciones.js';
import { renderBotonInicio } from '../boton-inicio.js?v=20261028c';

// Recuerda la zona elegida por subcategoría, para que al volver
// de la ficha (D5) el mapa siga enfocado donde estaba.
const zonaRecordada = new Map();

const ORDEN_ZONAS = ['Norte', 'Occidente', 'Centro', 'Oriente', 'Sur'].filter((z) =>
  ZONAS.includes(z)
);

function plural(n, singular, pluralTexto) {
  return n === 1 ? singular : pluralTexto;
}

// Mensaje del gato en el mapa. Si hay centros en 0 (urgente), el gato
// lo dice con urgencia; si no, invita a ayudar.
function mensajeGato({ nombreSub, zona, cantidad, total, urgentes }) {
  if (total === 0) return 'Parece que por ahora no necesitan esto. Probemos otra cosa.';

  if (!zona) {
    if (urgentes === 1) return `¡Un centro se quedó sin ${nombreSub}!`;
    if (urgentes > 1) return `¡${urgentes} centros se quedaron sin ${nombreSub}!`;
    return `Estos centros necesitan ${nombreSub}. ¡Vamos a ayudar!`;
  }

  if (cantidad === 0) {
    return `En la zona ${zona} no necesitan ${nombreSub} por ahora. Prueba otra zona.`;
  }
  if (urgentes > 0) {
    return `¡Urgente en la zona ${zona}! ${plural(urgentes, 'Un centro se quedó', `${urgentes} centros se quedaron`)} sin ${nombreSub}.`;
  }
  return `En la zona ${zona} ${plural(cantidad, 'hay 1 centro que necesita', `hay ${cantidad} centros que necesitan`)} ${nombreSub}.`;
}

export function render({ subcategoriaId }) {
  const subcategoria = obtenerSubcategoria(subcategoriaId);
  const categoria = obtenerCategoriaPorSubcategoria(subcategoriaId);

  if (!subcategoria || !categoria) {
    return `
      <section class="vista">
        <a class="boton-atras" href="#/donante/estanteria">← Volver</a>
        <h1>Subcategoría no encontrada</h1>
      </section>
    `;
  }

  const nombreSub = subcategoria.nombre.toLowerCase();
  // Más urgentes primero (cantidad 0, luego 1, luego 2).
  const necesitan = getCentrosPorSubcategoria(subcategoriaId).sort(
    (a, b) => a.insumos[subcategoriaId] - b.insumos[subcategoriaId]
  );
  const total = necesitan.length;
  const volverAtras = `#/donante/subcategorias/${categoria.id}`;

  const conteoPorZona = Object.fromEntries(
    ORDEN_ZONAS.map((z) => [z, necesitan.filter((c) => c.zona === z).length])
  );

  // Las zonas con algún centro urgente se pintan en rojo.
  const hayUrgentesEn = (z) =>
    necesitan.some((c) => c.zona === z && estadoDeNivel(c.insumos[subcategoriaId]) === 'urgente');

  const botonesZona = [
    `<button type="button" class="chip-zona chip-zona--todas" data-zona="" aria-pressed="true">
       Toda Cali <span class="chip-zona__conteo">${total}</span>
     </button>`,
    ...ORDEN_ZONAS.map(
      (z) => `
        <button type="button" class="chip-zona${hayUrgentesEn(z) ? ' chip-zona--urgente' : ''}${
          conteoPorZona[z] ? '' : ' chip-zona--vacia'
        }" data-zona="${z}" aria-pressed="false">
          ${z} <span class="chip-zona__conteo">${conteoPorZona[z]}</span>
        </button>`
    ),
  ].join('');

  const itemsLista = necesitan
    .map((centro) => {
      const urgente = estadoDeNivel(centro.insumos[subcategoriaId]) === 'urgente';
      return `
        <li data-zona-item="${centro.zona}">
          <button
            type="button"
            class="centro-tarjeta ${urgente ? 'centro-tarjeta--urgente' : 'centro-tarjeta--desabastecido'}"
            data-navegar="#/donante/ficha/${centro.id}/${subcategoriaId}"
            data-centro-id="${centro.id}"
          >
            ${urgente
              ? '<span class="centro-tarjeta__badge">Urgente</span>'
              : '<span class="centro-tarjeta__badge centro-tarjeta__badge--desabastecido">Desabastecido</span>'}
            <span class="centro-tarjeta__casa" data-mini-casa="${urgente ? 'urgente' : 'desabastecido'}" aria-hidden="true">🏠</span>
            <span class="centro-tarjeta__nombre">${centro.nombre}</span>
            <span class="centro-tarjeta__zona">Zona ${centro.zona}<span class="centro-tarjeta__distancia" data-distancia></span></span>
          </button>
        </li>`;
    })
    .join('');

  return {
    html: `
      <section class="vista vista-mapa3d vista-mapa-completo">
        <h1 class="visually-hidden">Centros que necesitan ${nombreSub}</h1>

        <!-- Mapa a pantalla completa (oct 2026): encima van el encabezado,
             las zonas (columna arriba a la izquierda) y el gato con su
             mensaje (esquina inferior derecha). -->
        <div class="mapa-envoltura mapa-pantalla">
        <header class="mapa3d__encabezado">
          <a class="boton-atras" href="${volverAtras}">← Volver</a>
          <p class="mapa__indicador">${categoria.nombre} › ${subcategoria.nombre}</p>
          ${renderBotonInicio()}
          <a class="boton boton--secundario boton-estanteria" href="#/donante/estanteria">Ir a la estantería</a>
        </header>
        ${total ? `<nav class="mapa3d__zonas" aria-label="Elegir zona">${botonesZona}</nav>` : ''}
        <div class="mapa3d__gato gato-asoma gato-asoma--lado" aria-live="polite">
          ${renderGato(`Buscando centros que necesitan ${nombreSub}…`, { tamano: 'lado' })}
        </div>
        <div class="mapa3d" data-estado="cargando">
          <div
            class="mapa3d__lienzo"
            role="img"
            aria-label="Mapa de Cali con ${total} ${plural(total, 'centro que necesita', 'centros que necesitan')} ${nombreSub}"
          ></div>
          <div class="mapa3d__etiquetas" aria-hidden="true"></div>
          <div class="mapa3d__tooltip" hidden aria-hidden="true"></div>

          <p class="mapa3d__cargando">Dibujando Cali…</p>

          ${
            total
              ? `<div class="mapa3d__pie">
                   <p class="mapa3d__ubicacion-estado" aria-live="polite"></p>
                   <p class="mapa3d__instruccion">Selecciona un centro de acopio para obtener más información.</p>
                 </div>`
              : ''
          }
        </div>

        </div>
        ${
          total
            ? `<!-- Respaldo: solo se muestra si el mapa 3D no puede cargar -->
               <div class="mapa3d__respaldo" hidden>
                 <h2 class="mapa3d__titulo-lista">Selecciona un centro de acopio que necesita ${nombreSub}</h2>
                 <ul class="mapa__lista mapa3d__lista">${itemsLista}</ul>
               </div>`
            : `
              <div class="mapa3d__vacio">
                <button class="boton" data-navegar="#/donante/estanteria">Volver a la estantería</button>
              </div>
            `
        }

      </section>
    `,

    init(contenedor) {
      const mapaEl = contenedor.querySelector('.mapa3d');
      const textoGato = contenedor.querySelector('.mapa3d__gato .gato-guia__globo p');
      const gatoEl = contenedor.querySelector('.mapa3d__gato');
      // Centros sin nada (cantidad 0) en toda Cali o en la zona elegida.
      const urgentesPorZona = (zona) =>
        necesitan.filter(
          (c) => estadoDeNivel(c.insumos[subcategoriaId]) === 'urgente' && (!zona || c.zona === zona)
        ).length;
      const chips = [...contenedor.querySelectorAll('.chip-zona')];
      const items = [...contenedor.querySelectorAll('[data-zona-item]')];
      const sinResultados = contenedor.querySelector('.mapa3d__sin-resultados');
      const tarjetas = [...contenedor.querySelectorAll('[data-centro-id]')];
      const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      let mapa = null;
      let destruido = false;
      let filtroListo = movimientoReducido;
      let zonaActual = zonaRecordada.get(subcategoriaId) ?? null;

      // Refleja la zona elegida en botones, lista y mensaje del gato.
      function actualizarInterfaz(zona) {
        zonaActual = zona;
        if (zona) zonaRecordada.set(subcategoriaId, zona);
        else zonaRecordada.delete(subcategoriaId);

        chips.forEach((chip) =>
          chip.setAttribute('aria-pressed', String((chip.dataset.zona || null) === zona))
        );
        let visibles = 0;
        items.forEach((item) => {
          const mostrar = !zona || item.dataset.zonaItem === zona;
          item.hidden = !mostrar;
          if (mostrar) visibles++;
        });
        if (sinResultados) sinResultados.hidden = visibles > 0;

        pintarGato();
      }

      // Lo que dice el gato: la situación, qué significa cada color de
      // casa y, si se conoce la ubicación, los centros más cercanos.
      let textoCercanos = '';
      function pintarGato() {
        if (!filtroListo) return;
        const zona = zonaActual;
        const urgentes = urgentesPorZona(zona);
        const principal = mensajeGato({
          nombreSub,
          zona,
          cantidad: zona ? conteoPorZona[zona] : total,
          total,
          urgentes,
        });
        const colores = total
          ? `<span class="gato-mapa__colores">
               <span><span class="punto punto--urgente"></span>Roja: urgente</span>
               <span><span class="punto punto--desabastecido"></span>Amarilla: desabastecido</span>
             </span>`
          : '';
        textoGato.innerHTML = `<span class="gato-mapa__principal">${principal}</span>${colores}${
          textoCercanos ? `<span class="gato-mapa__cercanos">📍 ${textoCercanos}</span>` : ''
        }`;
        // El globo del gato se pone en modo alerta cuando hay urgencia.
        gatoEl.classList.toggle('mapa3d__gato--urgente', urgentes > 0);
      }

      function resaltarTarjeta(id) {
        tarjetas.forEach((t) =>
          t.classList.toggle('centro-tarjeta--resaltada', t.dataset.centroId === id)
        );
      }

      // Botones de zona: equivalentes accesibles a tocar el mapa.
      chips.forEach((chip) =>
        chip.addEventListener('click', () => {
          const zona = chip.dataset.zona || null;
          if (mapa) mapa.seleccionarZona(zona === zonaActual ? null : zona);
          else actualizarInterfaz(zona);
        })
      );

      // La lista y el mapa están enlazados: pasar por una tarjeta
      // levanta su casita en el mapa.
      tarjetas.forEach((t) => {
        const id = t.dataset.centroId;
        t.addEventListener('pointerenter', () => mapa?.resaltarCentro(id));
        t.addEventListener('focus', () => mapa?.resaltarCentro(id));
        t.addEventListener('pointerleave', () => mapa?.resaltarCentro(null));
        t.addEventListener('blur', () => mapa?.resaltarCentro(null));
      });

      contenedor.querySelector('.mapa3d__controles')?.addEventListener('click', (e) => {
        const accion = e.target.closest('[data-accion]')?.dataset.accion;
        if (!mapa || !accion) return;
        if (accion === 'acercar') mapa.acercar(0.8);
        if (accion === 'alejar') mapa.acercar(1.25);
        if (accion === 'restablecer') mapa.restablecerVista();
      });

      actualizarInterfaz(zonaActual);

      // --- Mi ubicación: distancia a cada centro y lista ordenada por cercanía.
      // (Sin botón "Actualizar mi ubicación": se pide sola al entrar.)
      let miUbicacion = null;
      const estadoUbicacion = contenedor.querySelector('.mapa3d__ubicacion-estado');

      function aplicarUbicacion(ubicacion) {
        miUbicacion = ubicacion;
        const conDistancia = necesitan
          .map((c) => ({ c, km: distanciaKm(ubicacion, c) }))
          .sort((a, b) => a.km - b.km);
        // (La lista de centros debajo del mapa se quitó: el gato dice el
        // más cercano y las casitas se tocan en el mapa.)
        // El gato nombra los más cercanos, estén urgentes o desabastecidos.
        const [a, b] = conDistancia;
        void b;
        textoCercanos = a ? `El más cercano a ti: <strong>${a.c.nombre}</strong> (${formatoKm(a.km)})` : '';
        const dentroDelMapa = mapa?.marcarUsuario?.(ubicacion);
        estadoUbicacion.textContent =
          dentroDelMapa === 'borde'
            ? 'Estás fuera de Cali: tu punto aparece en el borde del mapa, en la dirección donde estás.'
            : '';
        pintarGato();
      }

      // Si ya la compartió en esta sesión, se usa sin volver a preguntar;
      // si no, se pide al entrar al mapa (el navegador muestra su permiso).
      const guardada = ubicacionGuardada();
      if (total) {
        if (guardada) aplicarUbicacion(guardada);
        else
          obtenerUbicacion()
            .then((u) => !destruido && aplicarUbicacion(u))
            .catch((e) => {
              if (!destruido)
                estadoUbicacion.textContent = e.message;
            });
      }

      // Carga diferida del mapa 3D.
      import('../mapa3d.js?v=20261030b')
        .then(({ montarMapa3D }) => {
          if (destruido) return;
          const necesidades = Object.fromEntries(
            necesitan.map((c) => [c.id, estadoDeNivel(c.insumos[subcategoriaId])])
          );
          mapa = montarMapa3D({
            lienzo: contenedor.querySelector('.mapa3d__lienzo'),
            capaEtiquetas: contenedor.querySelector('.mapa3d__etiquetas'),
            tooltip: contenedor.querySelector('.mapa3d__tooltip'),
            centros: getCentros(),
            necesidades,
            zonaInicial: zonaActual,
            movimientoReducido,
            // Lo que tapan los controles que van encima del mapa: el mapa
            // encuadra la ciudad en el espacio que queda libre.
            margenes: () => {
              const r = mapaEl.getBoundingClientRect();
              const encabezado = contenedor.querySelector('.mapa3d__encabezado')?.getBoundingClientRect();
              const zonasNav = contenedor.querySelector('.mapa3d__zonas')?.getBoundingClientRect();
              const gato = gatoEl.getBoundingClientRect();
              const pie = contenedor.querySelector('.mapa3d__pie')?.getBoundingClientRect();
              const angosta = r.width < 700;
              return {
                arriba: encabezado ? encabezado.bottom - r.top + 12 : 0,
                // En celular el gato se descuenta abajo (no al lado): si no,
                // la ciudad queda muy angosta.
                abajo: angosta && gato.height
                  ? r.bottom - gato.top + 8
                  : pie?.height ? r.bottom - pie.top + 12 : 24, // deja libre el mensaje del pie
                izquierda: zonasNav ? zonasNav.right - r.left + 12 : 0,
                derecha: !angosta && gato.width ? r.right - gato.left + 8 : 12,
              };
            },
            alClicCentro: (id) => {
              location.hash = `#/donante/ficha/${id}/${subcategoriaId}`;
            },
            alCambiarZona: actualizarInterfaz,
            alResaltarCentro: resaltarTarjeta,
            alTerminarFiltro: () => {
              filtroListo = true;
              mapaEl.dataset.estado = 'listo';
              actualizarInterfaz(zonaActual);
            },
          });
          mapaEl.dataset.estado = 'animando';
          if (miUbicacion) {
            const dentro = mapa.marcarUsuario?.(miUbicacion);
            if (dentro === 'borde')
              estadoUbicacion.textContent = 'Estás fuera de Cali: tu punto aparece en el borde del mapa, en la dirección donde estás.';
          }
        })
        .catch((error) => {
          console.error('No se pudo cargar el mapa 3D:', error);
          if (destruido) return;
          mapaEl.dataset.estado = 'sin-mapa';
          const respaldo = contenedor.querySelector('.mapa3d__respaldo');
          if (respaldo) {
            respaldo.hidden = false;
            cargarMiniaturas(respaldo);
          }
          filtroListo = true;
          actualizarInterfaz(zonaActual);
        });

      // El router llama esta función al salir de la pantalla.
      return () => {
        destruido = true;
        mapa?.destruir();
      };
    },
  };
}
