// ============================================================
// estanteria3d.js — la estantería en 3D (three.js) con los modelos
// del equipo (assets/modelos/*.glb).
//
// - Ocupa toda la pantalla y se mueve como el mapa: arrastrar para
//   desplazar, rueda o pellizco para acercar, clic derecho o dos
//   dedos para girar. Botones +, − y ⟲ para quien no use gestos.
// - Cada compartimiento es una categoría; cada modelo, una
//   subcategoría. Al tocar un compartimiento, la cámara se acerca a
//   él EN LA MISMA PANTALLA y aparecen los nombres de los productos
//   como botones.
// - Las etiquetas son botones HTML reales (teclado y lectores de
//   pantalla), proyectados sobre el 3D.
// - Si a una subcategoría le falta modelo, se muestra su ilustración
//   2D (ilustraciones.js) como una tarjeta de pie sobre la repisa.
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CATEGORIAS } from './data.js';
import { ilustracion, productoPrincipal } from './ilustraciones.js';
import { cargarGLB } from './cargar-glb.js';
import { ajustarModelo } from './ajustes-modelos.js';

// --- Modelos ------------------------------------------------------------

const RUTA = 'assets/modelos/';
export const MODELO_ESTANTERIA = `${RUTA}estanteria.glb`;
export const MODELOS_SUBCATEGORIA = {
  'alimento-agua': `${RUTA}agua.glb`,
  'alimento-no-perecederos': `${RUTA}alimento_no_perecedero.glb`,
  'alimento-bebe': `${RUTA}comida_bebe.glb`,
  'alimento-animal': `${RUTA}comida_animal.glb`,
  'aseo-corporal': `${RUTA}papel_higienico.glb`,
  'aseo-bucal': `${RUTA}higiene_bucal.glb`,
  'aseo-limpieza-hogar': `${RUTA}jabon.glb`,
  'medicamentos-analgesicos': `${RUTA}analgesicos.glb`,
  'medicamentos-antibioticos': `${RUTA}antibioticos.glb`,
  'medicamentos-cronicos': `${RUTA}cronico.glb`,
  'construccion-herramientas': `${RUTA}herramientas.glb`,
  'construccion-materiales': `${RUTA}material_construccion.glb`,
  'construccion-proteccion': `${RUTA}proteccion_personal.glb`,
  'ropa-hombre': `${RUTA}camisa.glb`,
  'ropa-mujer': `${RUTA}vestido.glb`,
  'ropa-ninos': `${RUTA}overol.glb`,
};

// --- Compartimientos (medidos en estanteria.glb del equipo, oct 2026) ---
// El modelo sale de estanteria.blend ya de frente, del mismo tamaño que
// el mueble anterior (6,15 × 5,41) y apoyado en y = 0.
// x: izquierda → derecha · y: de la tabla de abajo a la de arriba.
// frente: borde de la tabla de abajo (donde se clavan placas y etiquetas);
// la tabla de abajo del mueble es parte del marco y sobresale más.
const COMPARTIMIENTOS = {
  alimento: { x0: -2.743, x1: -0.123, y0: 3.797, y1: 5.079 },
  aseo: { x0: 0.123, x1: 2.743, y0: 3.797, y1: 5.079 },
  ropa: { x0: -2.743, x1: -0.123, y0: 2.198, y1: 3.582 },
  medicamentos: { x0: 0.123, x1: 2.743, y0: 2.198, y1: 3.582 },
  construccion: { x0: -2.743, x1: 2.743, y0: 0.332, y1: 1.983, frente: 0.86 },
};
const FONDO_Z = -0.567; // cara de adelante del fondo de tablas
const FRENTE_Z = 0.8; // borde de las repisas
const Z_PRODUCTOS = 0.12;
const frenteDe = (c) => c.frente ?? FRENTE_Z;
// Alto del centro de la tabla de abajo de cada compartimiento (placas y
// etiquetas): las repisas miden 0,215; la tabla del piso, 0,332.
const yTabla = (c) => (c.frente ? c.y0 / 2 : c.y0 - 0.108);

const CENTRO_MUEBLE = new THREE.Vector3(0, 2.7, 0);
// Caja del mueble completo (frente), para saber dónde queda en pantalla.
const MUEBLE = { x0: -3.075, x1: 3.075, y0: 0, y1: 5.412, yInteriorArriba: 5.079, z: 0.856 };

// --- Utilidades -----------------------------------------------------------

function suavizar(velocidad, dt) {
  return 1 - Math.exp(-velocidad * dt);
}


// Ajusta un objeto para que quepa en una caja (ancho, alto, fondo),
// apoyado en y = 0 y centrado en x/z.
function encajar(objeto, ancho, alto, fondo) {
  objeto.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(objeto);
  const tam = caja.getSize(new THREE.Vector3());
  const escala = Math.min(ancho / tam.x, alto / tam.y, fondo / tam.z);
  const envoltura = new THREE.Group();
  envoltura.add(objeto);
  objeto.scale.multiplyScalar(escala);
  objeto.updateMatrixWorld(true);
  const caja2 = new THREE.Box3().setFromObject(objeto);
  const centro = caja2.getCenter(new THREE.Vector3());
  objeto.position.x -= centro.x;
  objeto.position.z -= centro.z;
  objeto.position.y -= caja2.min.y;
  return envoltura;
}

// Placa de madera clavada al frente de la tabla: fondo crema, borde de
// madera, dos clavitos y el texto. Se dibuja en un canvas (textura).
const COLOR_ESTADO = { urgente: '#CC0100', desabastecido: '#F2C14E', medio: '#86B5A9', abastecido: '#B8AD9C' };

// Luz cálida que sale del fondo de un compartimiento (hover): más fuerte
// al centro y que se apaga hacia los bordes. Una sola textura para todos.
let texturaLuz = null;
function texturaLuzFondo() {
  if (texturaLuz) return texturaLuz;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  // Muy difusa: poca intensidad y un degradado larguísimo (casi sin
  // centro marcado), como una luz que se filtra desde el fondo.
  grad.addColorStop(0, 'rgba(255, 238, 205, 0.2)');
  grad.addColorStop(0.25, 'rgba(255, 232, 195, 0.17)');
  grad.addColorStop(0.5, 'rgba(255, 224, 180, 0.11)');
  grad.addColorStop(0.75, 'rgba(255, 216, 165, 0.05)');
  grad.addColorStop(1, 'rgba(255, 210, 160, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  texturaLuz = new THREE.CanvasTexture(lienzo);
  texturaLuz.colorSpace = THREE.SRGBColorSpace;
  return texturaLuz;
}

function texturaPlaca(texto, { extra = '', estado = null, proporcion = 5, fraccion = null } = {}, registrar) {
  const ancho = 1024;
  const alto = Math.round(ancho / proporcion);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  const radio = alto * 0.42;
  const redondeado = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  // Borde de madera y fondo crema con un leve degradé
  ctx.fillStyle = '#B9814F';
  redondeado(0, 0, ancho, alto, radio);
  ctx.fill();
  const g = ctx.createLinearGradient(0, 0, 0, alto);
  g.addColorStop(0, '#FFFBF3');
  g.addColorStop(1, '#F6E7CF');
  ctx.fillStyle = g;
  redondeado(alto * 0.09, alto * 0.09, ancho - alto * 0.18, alto - alto * 0.18, radio * 0.8);
  ctx.fill();
  // Clavitos
  ctx.fillStyle = '#9A6A40';
  [alto * 0.42, ancho - alto * 0.42].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, alto / 2, alto * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });
  // Texto (con punto de estado opcional), en una o dos líneas.
  const tam = (fraccion ?? fraccionMaxima(texto, { extra, estado, proporcion })) * alto;
  const { lineas } = disenoTexto(ctx, texto, { extra, estado }, ancho, alto, tam);
  ctx.font = `700 ${tam}px ${FAMILIA_PLACA}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const anchoLineas = Math.max(...lineas.map((l) => ctx.measureText(l).width));
  const anchoBloque = anchoLineas + (estado ? tam * 0.9 : 0);
  const x0 = (ancho - anchoBloque) / 2;
  if (estado) {
    ctx.fillStyle = COLOR_ESTADO[estado] ?? '#B8AD9C';
    ctx.beginPath();
    ctx.arc(x0 + tam * 0.3, alto / 2, tam * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  const xTexto = x0 + (estado ? tam * 0.9 : 0);
  lineas.forEach((linea, i) => {
    const y = alto / 2 + tam * 0.04 + (i - (lineas.length - 1) / 2) * tam * 1.08;
    if (extra && linea.endsWith(extra)) {
      // "Nombre  3/5": el número va en azul petróleo.
      const nombre = linea.slice(0, -extra.length);
      ctx.fillStyle = '#011E41';
      ctx.fillText(nombre, xTexto, y);
      ctx.fillStyle = '#426D8C';
      ctx.fillText(extra, xTexto + ctx.measureText(nombre).width, y);
    } else {
      ctx.fillStyle = '#011E41';
      ctx.textAlign = 'left';
      ctx.fillText(linea, xTexto + (anchoLineas - ctx.measureText(linea).width) / 2, y);
    }
  });
  const textura = registrar(new THREE.CanvasTexture(lienzo));
  if ('colorSpace' in textura) textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

const FAMILIA_PLACA = '"Roboto", "Segoe UI", Arial, sans-serif';

// Reparte el texto en una línea o, si no cabe, en dos (partiendo entre
// palabras por donde quede más parejo). Dice si cabe con ese tamaño.
function disenoTexto(ctx, texto, { extra = '', estado = null }, ancho, alto, tam) {
  ctx.font = `700 ${tam}px ${FAMILIA_PLACA}`;
  const disponible = ancho - alto * 1.1 - (estado ? tam * 0.9 : 0);
  const completo = extra ? `${texto}  ${extra}` : texto;
  if (ctx.measureText(completo).width <= disponible) return { lineas: [completo], cabe: true };
  const palabras = completo.split(' ').filter(Boolean);
  let mejor = null;
  for (let i = 1; i < palabras.length; i++) {
    const lineas = [palabras.slice(0, i).join(' '), palabras.slice(i).join(' ')];
    const anchoMax = Math.max(...lineas.map((l) => ctx.measureText(l).width));
    if (!mejor || anchoMax < mejor.anchoMax) mejor = { lineas, anchoMax };
  }
  if (!mejor) return { lineas: [completo], cabe: false };
  const cabeAlto = tam * 2.16 <= alto * 0.8;
  return { lineas: mejor.lineas, cabe: mejor.anchoMax <= disponible && cabeAlto };
}

let ctxMedir = null;
// Mayor tamaño de letra (fracción del alto de la placa) con el que el
// texto cabe entero, en una o dos líneas.
function fraccionMaxima(texto, { extra = '', estado = null, proporcion = 5 } = {}) {
  ctxMedir ??= document.createElement('canvas').getContext('2d');
  const ancho = 1024;
  const alto = Math.round(ancho / proporcion);
  let f = 0.5;
  while (f > 0.1 && !disenoTexto(ctxMedir, texto, { extra, estado }, ancho, alto, f * alto).cabe) f -= 0.01;
  return f;
}

function crearPlaca(texto, ancho, alto, opciones, registrar) {
  const material = registrar(
    new THREE.MeshBasicMaterial({
      map: texturaPlaca(texto, { ...opciones, proporcion: ancho / alto }, registrar),
      transparent: true,
    })
  );
  const malla = new THREE.Mesh(registrar(new THREE.PlaneGeometry(ancho, alto)), material);
  return malla;
}

// Ilustración 2D (SVG) como tarjeta de pie, para subcategorías sin modelo.
function tarjetaIlustracion(subcategoriaId, registrar) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 256;
  const textura = registrar(new THREE.CanvasTexture(lienzo));
  if ('colorSpace' in textura) textura.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    lienzo.getContext('2d').drawImage(img, 0, 0, 256, 256);
    textura.needsUpdate = true;
  };
  img.src = `data:image/svg+xml,${encodeURIComponent(
    ilustracion(productoPrincipal(subcategoriaId), { tamano: 256 })
  )}`;
  const material = registrar(new THREE.SpriteMaterial({ map: textura, transparent: true }));
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0.06); // se apoya en la repisa
  return sprite;
}

// ======================================================================

/**
 * @param {object} o
 * @param {HTMLElement} o.lienzo         contenedor del <canvas>
 * @param {HTMLElement} o.capaEtiquetas  capa HTML para placas y nombres
 * @param {string|null} o.categoriaInicial  abrir ya acercada (sin animación)
 * @param {(sub, cat) => void} o.alElegirSubcategoria  clic en un producto
 * @param {(cat|null) => void} o.alCambiarCategoria    al acercar/alejar
 * @param {(cat) => void} o.alLlegarACategoria          cuando termina de acercarse
 * @param {boolean} o.productosComoBotones  false = solo nombres (sin clic)
 * @param {(sub) => string} o.extraEtiqueta  texto extra en el nombre (p. ej. "3/5")
 * @param {(sub) => string|null} o.estadoDe  'urgente'|'desabastecido'|... (punto de color)
 * @param {(estado) => void} o.alCargar     'listo' | 'error'
 */
export function montarEstanteria3D(o) {
  const {
    lienzo,
    capaEtiquetas,
    categoriaInicial = null,
    alElegirSubcategoria = () => {},
    alCambiarCategoria = () => {},
    alLlegarACategoria = () => {},
    productosComoBotones = true,
    extraEtiqueta = null,
    estadoDe = null,
    alCargar = () => {},
    margenSuperior = null, // () => px que tapa el encabezado flotante
    margenDerecho = null, // () => px que ocupa algo a la derecha (el gato)
    alMoverMueble = null, // (rect en pantalla del mueble) => void
  } = o;

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desechables = [];
  const registrar = (x) => (desechables.push(x), x);
  let mueblePuesto = false; // ya cargó estanteria.glb

  // --- Escena ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  lienzo.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.classList.add('estanteria3d__canvas');

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(38, 1, 0.05, 200);

  // Luz pareja (la de antes, oct 2026: con una sola luz frontal los
  // productos se veían oscuros): mucha luz ambiente y un sol suave, para
  // que los productos se vean del mismo material mate que el resto.
  // (oct 2026: un poco menos intensas que antes, sin cambiar sus
  // proporciones, para que no se pierdan el color ni la textura.)
  escena.add(new THREE.AmbientLight('#FFFFFF', 0.66));
  escena.add(new THREE.HemisphereLight('#FFFFFF', '#F1E2CF', 1.0));
  const sol = new THREE.DirectionalLight('#FFFFFF', 1.1);
  sol.position.set(-4, 9, 8);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -6, right: 6, top: 7, bottom: -2, near: 1, far: 30 });
  sol.shadow.camera.updateProjectionMatrix();
  escena.add(sol);
  const relleno = new THREE.DirectionalLight('#FFFFFF', 0.5);
  relleno.position.set(0, 2, 10);
  escena.add(relleno);

  // Piso suave para la sombra del mueble.
  const piso = new THREE.Mesh(
    registrar(new THREE.CircleGeometry(7, 48)),
    registrar(new THREE.ShadowMaterial({ opacity: 0.18 }))
  );
  piso.rotation.x = -Math.PI / 2;
  piso.position.y = -0.18;
  piso.receiveShadow = true;
  escena.add(piso);

  // --- Controles (como el mapa) ---
  const controles = new OrbitControls(camara, canvas);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.screenSpacePanning = true;
  controles.minDistance = 1.6;
  controles.maxDistance = 24;
  controles.minPolarAngle = 0.95;
  controles.maxPolarAngle = 1.95;
  controles.minAzimuthAngle = -0.75;
  controles.maxAzimuthAngle = 0.75;
  controles.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controles.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };

  // El mueble no se puede arrastrar fuera de la pantalla.
  const LIMITE = { x: 3.4, yMin: 0, yMax: 5.4 };
  controles.addEventListener('change', () => {
    const t = controles.target;
    const c = new THREE.Vector3(
      THREE.MathUtils.clamp(t.x, -LIMITE.x, LIMITE.x),
      THREE.MathUtils.clamp(t.y, LIMITE.yMin, LIMITE.yMax),
      THREE.MathUtils.clamp(t.z, -1, 1.5)
    ).sub(t);
    if (c.lengthSq() > 0) {
      t.add(c);
      camara.position.add(c);
    }
  });

  // --- Encuadres de cámara ---
  // El encabezado flota encima del 3D: se descuenta su alto para que el
  // mueble llene el espacio que queda libre debajo de él.
  function fraccionOcupadaArriba() {
    const alto = lienzo.clientHeight || 1;
    return THREE.MathUtils.clamp((margenSuperior?.() ?? 0) / alto, 0, 0.45);
  }

  function fraccionOcupadaDerecha() {
    const ancho = lienzo.clientWidth || 1;
    return THREE.MathUtils.clamp((margenDerecho?.() ?? 0) / ancho, 0, 0.5);
  }

  // Distancia para que una caja (ancho × alto) llene el área visible.
  function encuadrar(centro, ancho, alto, { margen = 1.04, elevacion = 0 } = {}) {
    const vfov = THREE.MathUtils.degToRad(camara.fov);
    const tan = Math.tan(vfov / 2);
    const frac = fraccionOcupadaArriba();
    const fracDer = fraccionOcupadaDerecha();
    const dAlto = alto / (1 - frac) / 2 / tan;
    const dAncho = ancho / (1 - fracDer) / 2 / (tan * camara.aspect);
    const d = Math.max(dAlto, dAncho) * margen;
    // Sube el objetivo para que la caja quede centrada en el área libre.
    // Si algo ocupa la derecha (el gato), la cámara NO se corre (el mueble
    // se vería de lado): se corre la imagen con setViewOffset (ver
    // aplicarCorrimiento), así el mueble queda a la izquierda y de frente.
    const desplazamiento = 2 * d * tan * (frac / 2);
    const objetivo = centro.clone().add(new THREE.Vector3(0, desplazamiento, 0));
    return {
      objetivo,
      posicion: objetivo.clone().add(new THREE.Vector3(0, elevacion, d)),
    };
  }

  function encuadreGeneral() {
    // El mueble mide ~6.15 × 5.43: casi sin margen, para que se vea grande.
    // Sin margen: el mueble llena el espacio libre de la pantalla.
    // Un poco más lejos y más abajo: se ve entera la placa de Construcción.
    // (margen 1,14: el mueble y el gato quedan más hacia el centro)
    return encuadrar(CENTRO_MUEBLE.clone().add(new THREE.Vector3(0, -0.15, 0)), 6.5, 6.0, { margen: 1.14, elevacion: 0 });
  }

  // De cerca: la cámara queda fija mostrando todo el compartimiento,
  // con espacio abajo para los nombres de los productos.
  function encuadreCompartimiento(cat) {
    const c = COMPARTIMIENTOS[cat];
    const centro = new THREE.Vector3((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2 - 0.12, FRENTE_Z - 0.3);
    return encuadrar(centro, (c.x1 - c.x0) * 1.06, (c.y1 - c.y0) * 1.45, { margen: 1.0, elevacion: 0 });
  }

  let vuelo = null; // { objetivo, posicion, alTerminar }
  function volarA({ objetivo, posicion }, alTerminar = null, animar = true) {
    if (!animar || reducido) {
      controles.target.copy(objetivo);
      camara.position.copy(posicion);
      controles.update();
      alTerminar?.();
      return;
    }
    vuelo = { objetivo, posicion, alTerminar };
  }
  controles.addEventListener('start', () => {
    if (vuelo && !vuelo.alTerminar) vuelo = null;
  });
  // La cámara es fija (en la vista general y dentro de cada compartimiento):
  // la persona solo toca; no arrastra, gira ni acerca con gestos.
  controles.enabled = false;

  // --- Compartimientos: zonas tocables + placas ---
  const zonas = new Map(); // cat → { malla, material, placa, ... }
  CATEGORIAS.forEach((categoria) => {
    const c = COMPARTIMIENTOS[categoria.id];
    if (!c) return;
    const material = registrar(
      new THREE.MeshBasicMaterial({ color: '#FDD794', transparent: true, opacity: 0, depthWrite: false })
    );
    const malla = new THREE.Mesh(
      registrar(new THREE.BoxGeometry(c.x1 - c.x0, c.y1 - c.y0, FRENTE_Z - FONDO_Z)),
      material
    );
    malla.position.set((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, (FONDO_Z + FRENTE_Z) / 2);
    malla.userData.categoria = categoria.id;
    escena.add(malla);

    // Hover: una luz que se enciende desde el fondo del compartimiento
    // (en vez de pintar un plano encima).
    const luzFondo = new THREE.Mesh(
      // Más grande que el hueco: el borde del degradado queda detrás de la
      // madera y la luz no tiene un límite marcado (pero sin salirse del
      // mueble, o se vería el brillo por fuera).
      registrar(
        new THREE.PlaneGeometry(
          Math.min((c.x1 - c.x0) * 1.25, 2 * Math.min((c.x0 + c.x1) / 2 - MUEBLE.x0, MUEBLE.x1 - (c.x0 + c.x1) / 2) - 0.1),
          Math.min((c.y1 - c.y0) * 1.35, 2 * Math.min((c.y0 + c.y1) / 2 - MUEBLE.y0, MUEBLE.y1 - (c.y0 + c.y1) / 2) - 0.1)
        )
      ),
      registrar(
        new THREE.MeshBasicMaterial({
          map: texturaLuzFondo(),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    luzFondo.position.set((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, FONDO_Z + 0.03);
    luzFondo.raycast = () => {}; // no se toca: se toca la malla del compartimiento
    escena.add(luzFondo);

    // Placa 3D clavada al frente de la tabla de abajo del compartimiento.
    const anchoPlaca = Math.min(1.55, (c.x1 - c.x0) * 0.62);
    const placa3d = crearPlaca(categoria.nombre, anchoPlaca, 0.25, {}, registrar);
    // Si Roboto aún no había cargado, se vuelve a dibujar el texto con ella.
    document.fonts?.load('900 40px Roboto').then(() => {
      placa3d.material.map = texturaPlaca(categoria.nombre, { proporcion: anchoPlaca / 0.25 }, registrar);
      placa3d.material.needsUpdate = true;
    });
    placa3d.position.set((c.x0 + c.x1) / 2, yTabla(c), frenteDe(c) + 0.035);
    placa3d.userData.categoria = categoria.id;
    escena.add(placa3d);

    const placa = document.createElement('button');
    placa.type = 'button';
    placa.className = 'estanteria3d__placa';
    placa.textContent = categoria.nombre;
    placa.setAttribute('aria-label', `Ver ${categoria.nombre}`);
    placa.addEventListener('click', () => acercar(categoria.id));
    placa.addEventListener('pointerenter', () => marcarHover(categoria.id));
    placa.addEventListener('pointerleave', () => marcarHover(null));
    placa.addEventListener('focus', () => marcarHover(categoria.id));
    placa.addEventListener('blur', () => marcarHover(null));
    capaEtiquetas.appendChild(placa);

    zonas.set(categoria.id, {
      categoria,
      malla,
      material,
      placa,
      placa3d,
      luzFondo,
      luzObjetivo: 0,
      opacidadObjetivo: 0,
      atenuada: false,
      productos: [],
    });
  });

  // --- Estado de interacción ---
  let abierta = null; // categoría acercada
  let hover = null;
  let hoverProducto = null;

  function marcarHover(cat) {
    hover = cat;
    actualizarObjetivos();
  }

  function actualizarObjetivos() {
    for (const [cat, z] of zonas) {
      let op = 0;
      if (z.atenuada && !abierta) op = 0.45; // velo azul sobre lo que no coincide
      z.opacidadObjetivo = op;
      z.luzObjetivo = !abierta && hover === cat && !z.atenuada ? 1 : 0;
      z.material.color.set(z.atenuada ? '#011E41' : '#FDD794');
      z.placa.hidden = Boolean(abierta);
      z.placa3d.visible = !abierta;
      z.placa3d.scale.setScalar(hover === cat && !abierta ? 1.08 : 1);
      z.placa3d.material.color.set(z.atenuada ? '#9AA6B2' : '#FFFFFF');
      z.placa.classList.toggle('estanteria3d__placa--activa', hover === cat && !abierta);
      z.placa.classList.toggle('estanteria3d__placa--atenuada', z.atenuada);
      for (const p of z.productos) {
        p.boton.hidden = abierta !== cat;
        if (p.etiqueta3d) p.etiqueta3d.visible = abierta === cat;
      }
    }
    botonVolver.hidden = !abierta;
    canvas.style.cursor = hover || hoverProducto ? 'pointer' : 'default';
  }

  function acercar(cat, { animar = true } = {}) {
    if (!zonas.has(cat)) return;
    abierta = cat;
    hover = null;
    // Dentro de un compartimiento la cámara queda fija: solo se mueve
    // en la vista de categorías (toda la estantería).
    controles.enabled = false;
    alCambiarCategoria(cat);
    actualizarObjetivos();
    volarA(encuadreCompartimiento(cat), () => {
      alLlegarACategoria(cat);
      zonas.get(cat).productos[0]?.boton.focus({ preventScroll: true });
    }, animar);
  }

  function alejar({ animar = true } = {}) {
    const anterior = abierta;
    abierta = null;
    alCambiarCategoria(null);
    actualizarObjetivos();
    volarA(encuadreGeneral(), null, animar);
    if (anterior) zonas.get(anterior)?.placa.focus({ preventScroll: true });
  }

  // Botón para volver de cerca a la estantería completa.
  const botonVolver = document.createElement('button');
  botonVolver.type = 'button';
  botonVolver.className = 'estanteria3d__volver';
  botonVolver.textContent = '← Ver toda la estantería';
  botonVolver.hidden = true;
  botonVolver.addEventListener('click', () => alejar());
  capaEtiquetas.parentElement.appendChild(botonVolver);

  // --- Carga de la estantería y los productos ---
  const cargador = new GLTFLoader();
  const productosRaiz = new THREE.Group();
  escena.add(productosRaiz);

  function prepararMateriales(objeto) {
    objeto.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach((m) => {
          desechables.push(m);
          if (m.map) desechables.push(m.map);
          // Algunos materiales vienen con alfa 0 en el color; se ignora.
          if (m.transparent && m.opacity === 0) {
            m.transparent = false;
            m.opacity = 1;
          }
        });
        desechables.push(n.geometry);
      }
    });
  }

  async function cargarTodo() {
    // Los letreros se dibujan con Roboto: se espera a que cargue.
    await document.fonts?.load('900 40px Roboto').catch(() => {});
    // Estantería
    const gltfMueble = await cargarGLB(cargador, MODELO_ESTANTERIA);
    const mueble = gltfMueble.scene;
    prepararMateriales(mueble);
    // Madera de un solo tono: parte del color sale del propio material
    // (emissive, para que no haya zonas negras) y la luz marca las caras
    // y los huecos (sombreado), para que el mueble no se vea plano.
    const madera = registrar(
      // Color de la paleta: #A8623A (madera más oscura y rojiza).
      new THREE.MeshLambertMaterial({ color: '#B87048', emissive: '#4E2A14', emissiveIntensity: 1 })
    );
    mueble.traverse((n) => {
      if (n.isMesh) {
        n.material = madera;
        // Sombras propias: los productos y las tablas dejan sombra en el
        // fondo y en las repisas (da profundidad a cada compartimiento).
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    // (el modelo nuevo ya viene de frente: no se gira)
    mueblePuesto = true;
    escena.add(mueble);

    // Sombra suave en el suelo, alrededor de la base del mueble (le da
    // peso y dimensión, como si estuviera apoyado en el piso).
    mueble.updateMatrixWorld(true);
    const base = new THREE.Box3().setFromObject(mueble);
    const lienzoSombra = document.createElement('canvas');
    lienzoSombra.width = lienzoSombra.height = 256;
    const ctxS = lienzoSombra.getContext('2d');
    const degradado = ctxS.createRadialGradient(128, 128, 10, 128, 128, 128);
    degradado.addColorStop(0, 'rgba(60, 30, 10, 0.55)');
    degradado.addColorStop(0.55, 'rgba(60, 30, 10, 0.28)');
    degradado.addColorStop(1, 'rgba(60, 30, 10, 0)');
    ctxS.fillStyle = degradado;
    ctxS.fillRect(0, 0, 256, 256);
    const sombraMueble = new THREE.Mesh(
      registrar(new THREE.PlaneGeometry((base.max.x - base.min.x) * 1.35, (base.max.z - base.min.z) * 2.6)),
      registrar(
        new THREE.MeshBasicMaterial({ map: registrar(new THREE.CanvasTexture(lienzoSombra)), transparent: true, depthWrite: false })
      )
    );
    sombraMueble.rotation.x = -Math.PI / 2;
    sombraMueble.position.set((base.min.x + base.max.x) / 2, base.min.y + 0.005, (base.min.z + base.max.z) / 2 + 0.15);
    escena.add(sombraMueble);

    // Letreros de las subcategorías: todos con el mismo tamaño de letra
    // (el mayor con el que cabe el nombre más largo en su placa).
    const ALTO_LETRERO = 0.21;
    const anchoLetrero = (cat, zona) =>
      Math.min(1.25, ((COMPARTIMIENTOS[cat].x1 - COMPARTIMIENTOS[cat].x0) / zona.categoria.subcategorias.length) * 0.9);
    let fraccionLetreros = 0.5;
    for (const [cat, zona] of zonas) {
      for (const sub of zona.categoria.subcategorias) {
        const f = fraccionMaxima(sub.nombre, {
          extra: extraEtiqueta ? extraEtiqueta(sub.id) : '',
          estado: estadoDe?.(sub.id) ?? null,
          proporcion: anchoLetrero(cat, zona) / ALTO_LETRERO,
        });
        fraccionLetreros = Math.min(fraccionLetreros, f);
      }
    }

    // Productos: uno por subcategoría, repartidos en su compartimiento.
    const tareas = [];
    for (const [cat, zona] of zonas) {
      const c = COMPARTIMIENTOS[cat];
      const subs = zona.categoria.subcategorias;
      const ancho = (c.x1 - c.x0) / subs.length;
      subs.forEach((sub, i) => {
        const x = c.x0 + ancho * (i + 0.5);
        // La ropa: las tres prendas a la misma altura (la camisa es ancha y
        // el vestido alto; con la misma altura se ven de igual proporción).
        const esRopa = cat === 'ropa';
        const altoMax = esRopa ? Math.min((c.y1 - c.y0) * 0.8, ancho * 1.08) : (c.y1 - c.y0) * 0.78;
        const anchoMax = ancho * (esRopa ? 1.08 : 0.82);
        const ruta = MODELOS_SUBCATEGORIA[sub.id];

        const boton = document.createElement(productosComoBotones ? 'button' : 'span');
        if (productosComoBotones) {
          boton.type = 'button';
          boton.addEventListener('click', () => alElegirSubcategoria(sub.id, cat));
        }
        boton.className = 'estanteria3d__producto';
        const estado = estadoDe?.(sub.id);
        boton.innerHTML = `${estado ? `<span class="punto-estado punto-estado--${estado}" aria-hidden="true"></span>` : ''}${sub.nombre}${extraEtiqueta ? `<span class="estanteria3d__producto-extra">${extraEtiqueta(sub.id)}</span>` : ''}`;
        boton.hidden = true;
        capaEtiquetas.appendChild(boton);

        // Etiqueta 3D del producto, en el frente de la tabla debajo de él.
        const etiqueta3d = crearPlaca(
          sub.nombre,
          anchoLetrero(cat, zona),
          ALTO_LETRERO,
          { extra: extraEtiqueta ? extraEtiqueta(sub.id) : '', estado: estado ?? null, fraccion: fraccionLetreros },
          registrar
        );
        etiqueta3d.position.set(x, yTabla(c), frenteDe(c) + 0.04);
        etiqueta3d.visible = false;
        escena.add(etiqueta3d);

        const producto = {
          sub,
          boton,
          etiqueta3d,
          raiz: null,
          base: new THREE.Vector3(x, c.y0, Z_PRODUCTOS),
          alto: altoMax,
          elev: 0,
        };
        zona.productos.push(producto);
        etiqueta3d.userData.producto = producto;
        boton.addEventListener('pointerenter', () => (hoverProducto = producto));
        boton.addEventListener('pointerleave', () => (hoverProducto = null));
        boton.addEventListener('focus', () => (hoverProducto = producto));
        boton.addEventListener('blur', () => (hoverProducto = null));

        const colocar = (objeto) => {
          objeto.position.copy(producto.base);
          objeto.userData.producto = producto;
          producto.raiz = objeto;
          productosRaiz.add(objeto);
        };

        if (ruta) {
          tareas.push(
            cargarGLB(cargador, ruta)
              .then((gltf) => {
                prepararMateriales(gltf.scene);
                const encajado = encajar(gltf.scene, anchoMax, altoMax, 1.2); // fondo útil del mueble: ~1,37
                ajustarModelo(sub.id, encajado, THREE);
                colocar(encajado);
              })
              .catch((e) => {
                console.warn(e);
                colocar(spriteDe(sub.id, anchoMax, altoMax));
              })
          );
        } else {
          colocar(spriteDe(sub.id, anchoMax, altoMax));
        }
      });
    }
    await Promise.all(tareas);
  }

  function spriteDe(subId, ancho, alto) {
    const sprite = tarjetaIlustracion(subId, registrar);
    const lado = Math.min(ancho, alto) * 1.05;
    sprite.scale.set(lado, lado, 1);
    const g = new THREE.Group();
    g.add(sprite);
    return g;
  }

  // --- Puntero: tocar compartimientos y productos -------------------------
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let inicio = null;

  function golpe(evento) {
    const r = canvas.getBoundingClientRect();
    puntero.x = ((evento.clientX - r.left) / r.width) * 2 - 1;
    puntero.y = -((evento.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camara);
    if (abierta) {
      const prods = zonas.get(abierta).productos;
      const objetos = [...prods.map((p) => p.raiz).filter(Boolean), ...prods.map((p) => p.etiqueta3d)];
      const h = raycaster.intersectObjects(objetos, true)[0];
      if (h) {
        let n = h.object;
        while (n && !n.userData.producto) n = n.parent;
        return n ? { producto: n.userData.producto } : null;
      }
      return null;
    }
    const h = raycaster.intersectObjects(
      [...zonas.values()].flatMap((z) => [z.placa3d, z.malla]),
      false
    )[0];
    return h ? { categoria: h.object.userData.categoria } : null;
  }

  function alMover(e) {
    if (e.pointerType === 'touch') return;
    const g = golpe(e);
    hoverProducto = g?.producto ?? null;
    const nuevo = g?.categoria ?? null;
    if (nuevo !== hover) marcarHover(nuevo);
    else canvas.style.cursor = hover || hoverProducto ? 'pointer' : 'default';
  }

  function alPresionar(e) {
    inicio = { x: e.clientX, y: e.clientY, t: performance.now() };
  }

  function alSoltar(e) {
    if (!inicio) return;
    const mov = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y);
    const dur = performance.now() - inicio.t;
    inicio = null;
    if (mov > 8 || dur > 600) return; // fue un arrastre
    const g = golpe(e);
    if (g?.categoria) acercar(g.categoria);
    else if (g?.producto && productosComoBotones) alElegirSubcategoria(g.producto.sub.id, abierta);
  }

  canvas.addEventListener('pointermove', alMover);
  canvas.addEventListener('pointerdown', alPresionar);
  canvas.addEventListener('pointerup', alSoltar);
  canvas.addEventListener('pointerleave', () => marcarHover(null));

  // Escape: de cerca → estantería completa.
  const alTeclado = (e) => {
    if (e.key === 'Escape' && abierta && !document.querySelector('.zoom-capa:not([hidden])')) {
      e.preventDefault();
      alejar();
    }
  };
  document.addEventListener('keydown', alTeclado);

  // --- Tamaño ---
  // Corrimiento de la imagen hacia la izquierda (fracción del ancho), para
  // dejar libre la derecha sin girar el mueble. Se anima con la cámara.
  let corrimientoVista = 0;
  function aplicarCorrimiento(objetivo, k) {
    corrimientoVista += (objetivo - corrimientoVista) * k;
    const { clientWidth: w, clientHeight: h } = lienzo;
    if (!w || !h) return;
    if (Math.abs(corrimientoVista) < 0.0005) camara.clearViewOffset();
    else camara.setViewOffset(w, h, corrimientoVista * w, 0, w, h);
  }

  function ajustar() {
    const { clientWidth: w, clientHeight: h } = lienzo;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    // La cámara fija se re-encuadra al cambiar el tamaño.
    if (!vuelo) volarA(abierta ? encuadreCompartimiento(abierta) : encuadreGeneral(), null, false);
  }
  const observador = new ResizeObserver(ajustar);
  observador.observe(lienzo);
  ajustar();

  // --- Etiquetas HTML sobre el 3D ---
  const v = new THREE.Vector3();
  function aPantalla(x, y, z) {
    v.set(x, y, z).project(camara);
    return {
      x: (v.x * 0.5 + 0.5) * lienzo.clientWidth,
      y: (-v.y * 0.5 + 0.5) * lienzo.clientHeight,
      visible: v.z < 1,
    };
  }

  // Las placas y etiquetas visibles son 3D; las HTML (ocultas a la vista)
  // existen para el teclado y los lectores de pantalla.
  function actualizarEtiquetas() {}

  /** Rectángulo en pantalla de un compartimiento (para animaciones 2D). */
  function rectDe(cat) {
    const c = COMPARTIMIENTOS[cat];
    const a = aPantalla(c.x0, c.y1, FRENTE_Z);
    const b = aPantalla(c.x1, c.y0, FRENTE_Z);
    const r = lienzo.getBoundingClientRect();
    return {
      left: r.left + Math.min(a.x, b.x),
      top: r.top + Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    };
  }

  // --- Bucle ---
  const reloj = new THREE.Clock();
  let idFrame = 0;
  function animar() {
    idFrame = requestAnimationFrame(animar);
    const dt = Math.min(reloj.getDelta(), 0.05);
    const k = reducido ? 1 : suavizar(10, dt);

    for (const z of zonas.values()) {
      z.material.opacity += (z.opacidadObjetivo - z.material.opacity) * k;
      z.luzFondo.material.opacity += (z.luzObjetivo - z.luzFondo.material.opacity) * k;
      for (const p of z.productos) {
        if (!p.raiz) continue;
        const objetivo = hoverProducto === p ? 0.08 : 0;
        p.elev += (objetivo - p.elev) * k;
        p.raiz.position.y = p.base.y + p.elev;
        const s = 1 + p.elev * 0.8;
        p.raiz.scale.setScalar(s);
        p.etiqueta3d.scale.setScalar(1 + p.elev * 0.9);
      }
    }

    if (vuelo) {
      const kc = suavizar(8, dt);
      controles.target.lerp(vuelo.objetivo, kc);
      camara.position.lerp(vuelo.posicion, kc);
      if (camara.position.distanceTo(vuelo.posicion) < 0.03) {
        const fin = vuelo.alTerminar;
        vuelo = null;
        fin?.();
      }
    }

    controles.update();
    // La imagen se corre a la izquierda solo en la vista general (en un
    // compartimiento el gato se esconde y se usa todo el ancho).
    const anchoLienzo = lienzo.clientWidth || 1;
    const objetivoCorrimiento = abierta ? 0 : Math.min(0.5, (margenDerecho?.() ?? 0) / anchoLienzo) / 2;
    // Sin animación: el mueble aparece de una vez en su lugar (oct 2026).
    aplicarCorrimiento(objetivoCorrimiento, 1);
    camara.updateProjectionMatrix();
    avisarRectMueble();
    actualizarEtiquetas();
    renderer.render(escena, camara);
  }

  // Dónde queda el mueble en la pantalla (para poner al gato del mismo alto
  // y con el mismo margen al borde): solo avisa si cambió.
  let ultimoRect = '';
  function avisarRectMueble() {
    if (!alMoverMueble || !mueblePuesto) return;
    const a = aPantalla(MUEBLE.x0, MUEBLE.y1, MUEBLE.z);
    const b = aPantalla(MUEBLE.x1, MUEBLE.y0, MUEBLE.z);
    // topInterior: borde interno de la tabla de arriba del mueble.
    const topInterior = aPantalla(MUEBLE.x0, MUEBLE.yInteriorArriba, MUEBLE.z).y;
    const rect = { left: a.x, top: a.y, topInterior, right: b.x, bottom: b.y, ancho: lienzo.clientWidth, alto: lienzo.clientHeight };
    const clave = [rect.left, rect.top, rect.right, rect.bottom, rect.ancho].map(Math.round).join(',');
    if (clave === ultimoRect) return;
    ultimoRect = clave;
    alMoverMueble(rect);
  }

  // Encuadre inicial (y otra vez en el siguiente cuadro, cuando el
  // encabezado flotante ya tiene su alto real).
  volarA(encuadreGeneral(), null, false);
  requestAnimationFrame(() => {
    if (!abierta) volarA(encuadreGeneral(), null, false);
  });
  animar();

  cargarTodo()
    .then(() => {
      alCargar('listo');
      if (categoriaInicial) acercar(categoriaInicial, { animar: false });
      actualizarObjetivos();
    })
    .catch((e) => {
      console.error('No se pudo cargar la estantería 3D:', e);
      alCargar('error');
    });

  actualizarObjetivos();

  return {
    acercar,
    alejar,
    rectDe,
    getAbierta: () => abierta,
    acercarZoom: (f) => {
      if (abierta) return; // cámara fija dentro del compartimiento
      const off = camara.position.clone().sub(controles.target);
      off.setLength(THREE.MathUtils.clamp(off.length() * f, controles.minDistance, controles.maxDistance));
      camara.position.copy(controles.target).add(off);
      controles.update();
    },
    restablecer: () => {
      if (!abierta) volarA(encuadreGeneral());
    },
    // Atenúa los compartimientos que no coinciden con la búsqueda.
    filtrar: (coincide) => {
      for (const [cat, z] of zonas) z.atenuada = !coincide(cat);
      actualizarObjetivos();
    },
    destruir() {
      cancelAnimationFrame(idFrame);
      observador.disconnect();
      document.removeEventListener('keydown', alTeclado);
      canvas.removeEventListener('pointermove', alMover);
      canvas.removeEventListener('pointerdown', alPresionar);
      canvas.removeEventListener('pointerup', alSoltar);
      controles.dispose();
      desechables.forEach((d) => d.dispose?.());
      renderer.dispose();
      canvas.remove();
      capaEtiquetas.replaceChildren();
      botonVolver.remove();
    },
  };
}
