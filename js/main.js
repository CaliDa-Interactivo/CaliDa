// ============================================================
// main.js — router por hash de CaliDa.
// Cada pantalla se registra con registrarRuta(patron, render) y
// se monta dentro de #app con una transición de entrada suave.
// `render` puede devolver un string de HTML, o un objeto
// { html, init(contenedor) } cuando la vista necesita enganchar
// listeners (buscador, formularios, etc.) después de montarse.
// Si `init` devuelve una función, el router la llama al salir de
// la pantalla (p. ej. para liberar el mapa 3D y su animación).
// ============================================================

import { inicializarStore } from './store.js';
import { aplicarEscala } from './escala.js';
import { agregarBotonInicio, botonesNavSoloIcono } from './boton-inicio.js?v=20261029e';
import { montarGatos, limpiarGatos } from './gatos.js?v=20261031a';
import { cargarMiniaturas } from './ilustraciones.js';
import * as inicio from './inicio.js?v=20261031a';
import * as estanteriaDonante from './donante/estanteria.js?v=20261030r';
import * as mapaDonante from './donante/mapa.js?v=20261030p';
import * as fichaDonante from './donante/ficha.js?v=20261030j';
import * as prerregistroDonante from './donante/prerregistro.js?v=20261030p';
import * as llegarDonante from './donante/llegar.js?v=20261029b';
import * as loginAdmin from './admin/login.js?v=20261030u';
import * as registroAdmin from './admin/registro.js?v=20261029c';
import * as bienvenidaAdmin from './admin/bienvenida.js';
import * as menuAdmin from './admin/menu.js?v=20261030q';
import * as insumosAdmin from './admin/insumos.js?v=20261030r';
import * as donacionAdmin from './admin/donacion.js?v=20261030r';
import * as despachoAdmin from './admin/despacho.js?v=20261030o';
import * as confirmacionAdmin from './admin/confirmacion.js';
import * as bandejaCorreos from './correos.js?v=20261030o';

const contenedor = document.getElementById('app');

// Cada ruta es { patron: RegExp, render: (params) => string|{html, init} }
const rutas = [];

// Función de limpieza de la vista actual (si la vista la definió).
let limpiezaActual = null;

// --- Dirección de la transición ------------------------------------
// Cada pantalla tiene un "nivel" de profundidad en su flujo. Ir a un
// nivel más profundo desliza la vista desde la derecha (avanzar);
// volver a uno menor la desliza desde la izquierda (retroceder).
const NIVELES = [
  [/^#\/$/, 0], // bienvenida
  [/^#\/portada$/, 0], // portada sin la intro
  [/^#\/entrar$/, 1], // elegir perfil
  [/^#\/admin\/login$/, 2],
  [/^#\/admin\/registro$/, 2.5],
  [/^#\/admin\/bienvenida$/, 3],
  [/^#\/admin\/menu$/, 4],
  [/^#\/admin\/(insumos|donacion|despacho)$/, 5],
  [/^#\/admin\/donacion\/[\w-]+\/[\w-]+$/, 6], // formulario de donación
  [/^#\/admin\/(insumos|donacion)\//, 5], // estantería con el zoom abierto
  [/^#\/admin\/confirmacion$/, 7],
  [/^#\/correos-enviados$/, 5],
  [/^#\/donante\/estanteria$/, 2],
  [/^#\/donante\/subcategorias\//, 2],
  [/^#\/donante\/mapa\//, 4],
  [/^#\/donante\/ficha\//, 5],
  [/^#\/donante\/prerregistro\//, 6],
  [/^#\/donante\/llegar\//, 7],
];

function nivelDe(hash) {
  return NIVELES.find(([patron]) => patron.test(hash))?.[1] ?? 0;
}

let nivelAnterior = null;
let numeroNavegacion = 0;
let esPrimeraCarga = true;

// Después de montar una vista: título de la pestaña y foco en el título
// de la pantalla, para que los lectores de pantalla anuncien el cambio.
function anunciarVista() {
  const titulo = contenedor.querySelector('h1');
  const texto = titulo?.textContent.trim();
  document.title = !texto || texto === 'CaliDa'
    ? 'CaliDa · Ayuda que llega donde hace falta'
    : `${texto} · CaliDa`;

  if (esPrimeraCarga || !titulo) return;
  // Si la vista ya puso el foco en algo (p. ej. el login), se respeta.
  const activo = document.activeElement;
  if (activo && activo !== document.body && contenedor.contains(activo)) return;
  titulo.setAttribute('tabindex', '-1');
  titulo.focus({ preventScroll: true });
}

export function registrarRuta(patron, render) {
  rutas.push({ patron, render });
}

function encontrarRuta(hash) {
  for (const ruta of rutas) {
    const coincidencia = hash.match(ruta.patron);
    if (coincidencia) {
      return { render: ruta.render, params: coincidencia.groups ?? {} };
    }
  }
  return null;
}

function navegar() {
  numeroNavegacion++;
  const hash = location.hash || '#/';
  const encontrada = encontrarRuta(hash);

  if (limpiezaActual) {
    try {
      limpiezaActual();
    } catch (error) {
      console.error('Error al limpiar la vista anterior:', error);
    }
    limpiezaActual = null;
  }

  // Rol de la pantalla: cada rol tiene su paleta (css/tema.css, al final).
  // donante: cálida (naranjas) · admin: azules · inicio: pantalla principal.
  document.documentElement.dataset.rol = /^#\/(admin|correos-enviados)/.test(hash)
    ? 'admin'
    : /^#\/donante\//.test(hash)
      ? 'donante'
      : 'inicio';

  const nivel = nivelDe(hash);
  contenedor.dataset.direccion =
    nivelAnterior === null || nivel >= nivelAnterior ? 'avanzar' : 'retroceder';
  nivelAnterior = nivel;

  contenedor.classList.remove('vista--entrando');
  // Reinicia la animación de entrada aunque se repita la misma vista.
  void contenedor.offsetWidth;

  if (!encontrada) {
    contenedor.innerHTML = renderNoEncontrada(hash);
  } else {
    const resultado = encontrada.render(encontrada.params);
    const esObjeto = typeof resultado === 'object' && resultado !== null;
    contenedor.innerHTML = esObjeto ? resultado.html : resultado;
    if (esObjeto && typeof resultado.init === 'function') {
      const limpiar = resultado.init(contenedor);
      if (typeof limpiar === 'function') limpiezaActual = limpiar;
    }
  }

  // "Volver a pantalla principal": en las pantallas a las que se llega
  // después de más de dos pantallas (nivel 3 o más) y en el pre-registro.
  // La confirmación del administrador no lo lleva porque vuelve sola al menú.
  const conBotonInicio =
    (nivel >= 3 || /^#\/donante\/prerregistro\//.test(hash)) && !/^#\/admin\/confirmacion$/.test(hash);
  // En las funciones del admin (no en el menú) el botón vuelve al menú.
  const enFuncionAdmin = /^#\/(admin\/(insumos|donacion|despacho)|correos-enviados)/.test(hash);
  if (conBotonInicio) agregarBotonInicio(contenedor.querySelector('.vista'), { alMenu: enFuncionAdmin });
  // Volver, pantalla principal / menú y estantería: solo ícono.
  botonesNavSoloIcono(contenedor);

  // El gato 3D (y se liberan los de la pantalla anterior).
  limpiarGatos();
  montarGatos(contenedor);
  // Todos los íconos de productos pasan a sus modelos 3D.
  cargarMiniaturas(contenedor);

  contenedor.classList.add('vista--entrando');
  // Transición especial pedida por la pantalla anterior (p. ej. "Siguiente"
  // de la portada: desvanecimiento). Vale solo para esta entrada.
  // Al terminar se quita junto con la clase de entrada: si solo se quitaba
  // la marca, la animación normal de entrada volvía a empezar desde cero y
  // la pantalla aparecía, desaparecía y volvía a aparecer.
  if (contenedor.dataset.transicion) {
    const esta = numeroNavegacion;
    const terminar = (evento) => {
      if (evento && evento.target !== contenedor) return;
      contenedor.removeEventListener('animationend', terminar);
      if (esta !== numeroNavegacion) return; // ya se cambió de pantalla
      contenedor.classList.remove('vista--entrando');
      delete contenedor.dataset.transicion;
    };
    contenedor.addEventListener('animationend', terminar);
    setTimeout(terminar, 1500);
  }
  window.scrollTo(0, 0);
  anunciarVista();
  esPrimeraCarga = false;
}

function renderNoEncontrada(hash) {
  return `
    <section class="vista">
      <h1>Pantalla no encontrada</h1>
      <p>No hay ninguna vista registrada para <code>${hash}</code> todavía.</p>
      <a class="boton" href="#/">Volver al inicio</a>
    </section>
  `;
}

// --- Rutas del donante (D1–D6) -------------------------------
// D4 (mapa.js) monta el mapa 3D de mapa3d.js.
registrarRuta(/^#\/$/, inicio.renderBienvenida);
registrarRuta(/^#\/portada$/, () => inicio.renderBienvenida({ sinIntro: true }));
registrarRuta(/^#\/entrar$/, inicio.renderEntrar);
// La bienvenida del donante ahora es la pantalla inicial (#/).
registrarRuta(/^#\/donante\/bienvenida$/, () => {
  location.replace('#/donante/estanteria');
  return '<section class="vista"></section>';
});
registrarRuta(/^#\/donante\/estanteria$/, estanteriaDonante.render);
// El zoom a una categoría vive en la misma pantalla de la estantería.
registrarRuta(/^#\/donante\/subcategorias\/(?<categoriaId>[\w-]+)$/, estanteriaDonante.render);
registrarRuta(/^#\/donante\/mapa\/(?<subcategoriaId>[\w-]+)$/, mapaDonante.render);
registrarRuta(
  /^#\/donante\/ficha\/(?<centroId>[\w-]+)\/(?<subcategoriaId>[\w-]+)$/,
  fichaDonante.render
);
registrarRuta(
  /^#\/donante\/prerregistro\/(?<centroId>[\w-]+)\/(?<subcategoriaId>[\w-]+)$/,
  prerregistroDonante.render
);
registrarRuta(
  /^#\/donante\/llegar\/(?<centroId>[\w-]+)\/(?<subcategoriaId>[\w-]+)$/,
  llegarDonante.render
);

// --- Rutas del administrador (A1–A6) --------------------------
// Todas, salvo el login, exigen sesión (ver admin/comun.js).
registrarRuta(/^#\/admin\/login$/, loginAdmin.render);
registrarRuta(/^#\/admin\/registro$/, registroAdmin.render);
registrarRuta(/^#\/admin\/bienvenida$/, bienvenidaAdmin.render);
registrarRuta(/^#\/admin\/menu$/, menuAdmin.render);
registrarRuta(/^#\/admin\/insumos$/, insumosAdmin.renderEstanteria);
// El zoom a una categoría se abre en la misma pantalla de la estantería.
registrarRuta(/^#\/admin\/insumos\/(?<categoriaId>[\w-]+)$/, insumosAdmin.renderEstanteria);
registrarRuta(/^#\/admin\/donacion$/, donacionAdmin.renderEstanteria);
registrarRuta(/^#\/admin\/donacion\/(?<categoriaId>[\w-]+)$/, donacionAdmin.renderEstanteria);
registrarRuta(
  /^#\/admin\/donacion\/(?<categoriaId>[\w-]+)\/(?<subcategoriaId>[\w-]+)$/,
  donacionAdmin.renderFormulario
);
registrarRuta(/^#\/admin\/despacho$/, despachoAdmin.render);
registrarRuta(/^#\/admin\/confirmacion$/, confirmacionAdmin.render);

// --- Bandeja de correos de prueba (Fase 5) ---------------------
registrarRuta(/^#\/correos-enviados$/, bandejaCorreos.render);

// Delegación de eventos para los controles comunes a toda vista:
// navegación simple y el botón "Cómo llegar" (D6).
contenedor.addEventListener('click', (evento) => {
  const elementoNavegar = evento.target.closest('[data-navegar]');
  if (elementoNavegar) {
    location.hash = elementoNavegar.dataset.navegar;
    return;
  }

  const elementoComoLlegar = evento.target.closest('[data-como-llegar]');
  if (elementoComoLlegar) {
    // Destino: "lat,lng" o la dirección del centro ya codificada.
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${elementoComoLlegar.dataset.comoLlegar}`,
      '_blank',
      'noopener'
    );
  }
});

// Algunas pantallas dibujan botones de navegación después (p. ej. el
// "¡Listo!" del pre-registro): también pasan a ser solo ícono.
new MutationObserver(() => botonesNavSoloIcono(contenedor)).observe(contenedor, { childList: true, subtree: true });

// Pantallas muy grandes: toda la página se escala en proporción (escala.js).
aplicarEscala();
window.addEventListener('resize', aplicarEscala);

window.addEventListener('hashchange', navegar);
window.addEventListener('DOMContentLoaded', () => {
  inicializarStore();
  navegar();
});
