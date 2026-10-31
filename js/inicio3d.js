// ============================================================
// inicio3d.js — escena 3D de la pantalla principal: un escenario de
// estudio (como la referencia del equipo) con una tarima redonda, pilas de
// cajas de cartón del equipo (cajas.glb) detrás, las donaciones de la
// estantería (los mismos modelos) sobre las cajas y en el piso, y elementos
// que flotan alrededor: una tarjeta de la app, la insignia de la Cruz Roja,
// un corazón, un pin del mapa y esferas de la paleta.
// El gato 3D va encima, en su propio lienzo (gato3d.js), parado al centro.
// Material mate, como el resto de la página.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { cargarGLB, RUTA_MODELOS } from './cargar-glb.js';
import { MODELOS_SUBCATEGORIA } from './estanteria3d.js';
import { ajustarModelo } from './ajustes-modelos.js';
import { factorEscala, resolucion } from './escala.js';

const mate = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

// Cajas de cartón del equipo (cajas.blend → cajas.glb).
const MODELO_CAJAS = `${RUTA_MODELOS}cajas.glb`;

// Radio de la tarima (borde de arriba): también lo usa medirMargenIsla.
const RADIO = 2.05;

// Tarima redonda de estudio: arriba crema con el borde redondeado y debajo
// un escalón ámbar y una base cobriza, como un escenario.
function tarima() {
  const g = new THREE.Group();
  const capa = (radio, alto, y, color) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, alto, 72), mate(color));
    m.position.y = y - alto / 2;
    g.add(m);
  };
  capa(RADIO - 0.06, 0.14, 0, '#FCE9CC');
  // Borde redondeado de la tapa (un toro alrededor).
  const borde = new THREE.Mesh(new THREE.TorusGeometry(RADIO - 0.06, 0.07, 16, 96), mate('#FCE9CC'));
  borde.rotation.x = Math.PI / 2;
  borde.position.y = -0.07;
  g.add(borde);
  capa(RADIO + 0.12, 0.2, -0.13, '#EDB06C');
  capa(RADIO + 0.04, 0.14, -0.33, '#C9774A');
  return g;
}

// Sombra suave pintada (un degradado), igual a la del gato en la portada
// (gato3d.js con data-luz="isla"): café sobre la tarima y más oscura sobre
// el cartón de las cajas.
const TONO_SOMBRA = { tarima: '92, 48, 22', carton: '70, 34, 14' };
const texturasSombra = {};
function texturaSombra(tono, fuerza) {
  const clave = `${tono}|${fuerza}`;
  if (texturasSombra[clave]) return texturasSombra[clave];
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, `rgba(${tono}, ${fuerza})`);
  grad.addColorStop(0.45, `rgba(${tono}, ${fuerza * 0.6})`);
  grad.addColorStop(1, `rgba(${tono}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return (texturasSombra[clave] = textura);
}
function sombraSuave(ancho, fondo, sobre = 'tarima', fuerza = 0.5) {
  const plano = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, fondo),
    new THREE.MeshBasicMaterial({ map: texturaSombra(TONO_SOMBRA[sobre], fuerza), transparent: true, depthWrite: false })
  );
  plano.rotation.x = -Math.PI / 2;
  plano.renderOrder = 1;
  return plano;
}

// --- Elementos que flotan (como las tarjetas y esferas de la referencia) ---

// Tarjeta de la app: ventana crema con los tres puntos arriba y la repisa
// de estados de 0 a 5 (dos puestos llenos: urgente y desabastecido).
function tarjetaApp() {
  const g = new THREE.Group();
  const fondo = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.78, 0.1, 5, 0.06), mate('#FFF6E6'));
  g.add(fondo);
  ['#CC0100', '#FDC254', '#86B5A9'].forEach((c, i) => {
    const punto = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 12), mate(c));
    punto.position.set(-0.47 + i * 0.1, 0.29, 0.055);
    g.add(punto);
  });
  const barra = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.07, 0.03, 3, 0.03), mate('#E8E1D5'));
  barra.position.set(0.12, 0.29, 0.055);
  g.add(barra);
  ['#CC0100', '#F4C66E', '#E8E1D5', '#E8E1D5', '#E8E1D5'].forEach((c, i) => {
    const puesto = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.2, 0.05, 3, 0.04), mate(c));
    puesto.position.set(-0.42 + i * 0.21, 0.02, 0.06);
    g.add(puesto);
  });
  [0.82, 0.55].forEach((largo, i) => {
    const linea = new THREE.Mesh(new RoundedBoxGeometry(largo, 0.06, 0.03, 3, 0.025), mate('#E8E1D5'));
    linea.position.set(-0.51 + largo / 2, -0.2 - i * 0.11, 0.055);
    g.add(linea);
  });
  return g;
}

// Cruz de la Cruz Roja (extruida, con el borde redondeado).
function cruz(tam, fondo, color) {
  const a = tam / 2;
  const b = tam / 6;
  const forma = new THREE.Shape();
  [[-b, a], [b, a], [b, b], [a, b], [a, -b], [b, -b], [b, -a], [-b, -a], [-b, -b], [-a, -b], [-a, b], [-b, b]].forEach(
    ([x, y], i) => (i ? forma.lineTo(x, y) : forma.moveTo(x, y))
  );
  const geo = new THREE.ExtrudeGeometry(forma, { depth: fondo, bevelEnabled: true, bevelSize: tam * 0.04, bevelThickness: tam * 0.04, bevelSegments: 3 });
  geo.center();
  return new THREE.Mesh(geo, mate(color));
}

// Insignia: esfera marfil con la cruz roja al frente.
function insigniaCruz() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 24), mate('#FFF6E6')));
  const c = cruz(0.3, 0.06, '#CC0100');
  c.position.z = 0.29;
  g.add(c);
  return g;
}

// Corazón inflado (como el ícono de Registrar donación).
function corazon(tam, color) {
  const s = tam / 2;
  const forma = new THREE.Shape();
  forma.moveTo(0, -s);
  forma.bezierCurveTo(-s * 0.2, -s * 0.72, -s, -s * 0.3, -s, s * 0.22);
  forma.bezierCurveTo(-s, s * 0.78, -s * 0.38, s * 0.95, 0, s * 0.5);
  forma.bezierCurveTo(s * 0.38, s * 0.95, s, s * 0.78, s, s * 0.22);
  forma.bezierCurveTo(s, -s * 0.3, s * 0.2, -s * 0.72, 0, -s);
  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: tam * 0.12,
    bevelEnabled: true,
    bevelSize: tam * 0.12,
    bevelThickness: tam * 0.14,
    bevelSegments: 8,
    curveSegments: 32,
  });
  geo.center();
  return new THREE.Mesh(geo, mate(color));
}

// Pin del mapa (gota roja con el centro marfil).
function pin(tam) {
  const g = new THREE.Group();
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(tam * 0.5, 32, 20), mate('#CC0100'));
  cabeza.position.y = tam * 0.55;
  const punta = new THREE.Mesh(new THREE.ConeGeometry(tam * 0.43, tam * 0.7, 32), mate('#CC0100'));
  punta.rotation.x = Math.PI;
  punta.position.y = tam * 0.12;
  const ojo = new THREE.Mesh(new THREE.SphereGeometry(tam * 0.2, 20, 12), mate('#FFF6E6'));
  ojo.position.set(0, tam * 0.58, tam * 0.4);
  g.add(cabeza, punta, ojo);
  return g;
}

/**
 * Monta la escena en `contenedor` (un div). Devuelve una función para
 * liberar todo al salir de la pantalla.
 */
export function montarIsla(contenedor, { camara: vistaCamara = null, capturable = false } = {}) {
  // `camara` ({ posicion, mira, fov }) y `capturable` sirven para sacar
  // "fotos" de la escena (p. ej. la tarjeta del admin en Elige tu perfil).
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: capturable });
  renderer.setPixelRatio(resolucion(1.5));
  // Sin sombras proyectadas: cada caja y donación lleva una sombra suave
  // pintada (sombraSuave), igual de difusa y del mismo tono que la del gato.
  renderer.shadowMap.enabled = false;
  const canvas = renderer.domElement;
  canvas.className = 'isla3d__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  contenedor.appendChild(canvas);

  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight('#FFF8EE', '#C9A27E', 1.3));
  escena.add(new THREE.AmbientLight('#FFFFFF', 0.45));
  const sol = new THREE.DirectionalLight('#FFF1E0', 2.2);
  sol.position.set(-3, 6, 4);
  escena.add(sol);

  const camara = new THREE.PerspectiveCamera(vistaCamara?.fov ?? 30, 1, 0.1, 50);
  camara.position.set(...(vistaCamara?.posicion ?? [3.6, 3.1, 6.4]));
  camara.lookAt(...(vistaCamara?.mira ?? [0, 0.35, 0]));

  // El escenario mira hacia la cámara (su frente, +z, casi hacia ella): el
  // gato queda al centro con las cajas detrás, como en la referencia.
  const mundo = new THREE.Group();
  mundo.rotation.y = 0.42;
  escena.add(mundo);
  mundo.add(tarima());

  let id = 0;
  let destruido = false;
  const dibujar = () => {
    if (!destruido) renderer.render(escena, camara);
  };
  const posCamara = camara.position.clone();
  // Lo que flota mira a la cámara (con un pequeño giro propio).
  const mirarCamara = (obj, giroY = 0, giroZ = 0) => {
    mundo.updateMatrixWorld(true);
    obj.lookAt(posCamara);
    obj.rotateY(giroY);
    obj.rotateZ(giroZ);
  };

  // --- Elementos flotantes ---
  // Posiciones en el marco del escenario (x a la derecha, z hacia la
  // cámara); el gato está en x = 0, z = 0,45.
  const flotantes = [
    { obj: tarjetaApp(), pos: [-1.6, 1.9, -1.05], giroY: 0.2, giroZ: 0.07, escala: 1.1 },
    { obj: insigniaCruz(), pos: [1.62, 1.42, -0.4], giroY: -0.25, giroZ: 0, escala: 1 },
    { obj: corazon(0.5, '#E8473A'), pos: [1.2, 1.95, -1.2], giroY: -0.2, giroZ: -0.2, escala: 1 },
    { obj: pin(0.36), pos: [-1.78, 0.95, 0.55], giroY: 0.3, giroZ: 0.12, escala: 1 },
  ];
  for (const f of flotantes) {
    f.obj.position.set(...f.pos);
    f.obj.scale.setScalar(f.escala);
    mundo.add(f.obj);
    mirarCamara(f.obj, f.giroY, f.giroZ);
  }
  // Esferas de la paleta, sueltas.
  [
    ['#FDC254', 0.12, [-0.5, 2.05, -1.5]],
    ['#86B5A9', 0.1, [2.05, 0.75, 0.2]],
    ['#F67751', 0.08, [-2.0, 1.09, -0.3]],
    ['#FDC254', 0.07, [0.89, 1.0, -1.0]],
  ].forEach(([color, r, p]) => {
    const esfera = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mate(color));
    esfera.position.set(...p);
    mundo.add(esfera);
  });

  const cargador = new GLTFLoader();
  // Un poco de azar con semilla fija (siempre queda igual): cada caja algo
  // girada, para que las pilas se vean naturales.
  const azar = (() => {
    let x = 20261031;
    return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  })();
  const entre = (a, b) => a + (b - a) * azar();

  // Copia de una o varias cajas del archivo (con sus posiciones relativas),
  // escalada a `ancho`, apoyada en y = 0 y centrada en x/z.
  function cajaDelModelo(modelo, nombres, ancho) {
    const grupo = new THREE.Group();
    for (const nombre of nombres) {
      const nodo = modelo.getObjectByName(nombre);
      if (nodo) grupo.add(nodo.clone(true));
    }
    grupo.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(grupo);
    const tam = caja.getSize(new THREE.Vector3());
    const centro = caja.getCenter(new THREE.Vector3());
    grupo.children.forEach((h) => h.position.sub(new THREE.Vector3(centro.x, caja.min.y, centro.z)));
    const escala = ancho / Math.max(tam.x, tam.z);
    const envoltura = new THREE.Group();
    envoltura.add(grupo);
    grupo.scale.setScalar(escala);
    envoltura.traverse((n) => {
      if (!n.isMesh) return;
      (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
        m.roughness = 0.85;
        m.metalness = 0;
        // El cartón por las dos caras: si no, por las paredes de una sola
        // cara se veía lo que hay dentro de la caja.
        m.side = THREE.DoubleSide;
      });
    });
    envoltura.userData.alto = tam.y * escala;
    return envoltura;
  }

  // Cajas cerradas: dos pilas detrás del gato (a cada lado, como las letras
  // grandes de la referencia) y dos sueltas adelante. [cajas del archivo,
  // ancho, x y z en el escenario, sobre qué caja]
  const CAJAS = [
    { nombres: ['Caja_Base'], ancho: 1.0, x: -1.35, z: -0.7 },
    { nombres: ['Caja_Arriba'], ancho: 0.58, x: -1.62, z: 0.25 },
    { nombres: ['Caja_Arriba'], ancho: 0.8, x: -1.33, z: -0.72, sobre: 0 },
    { nombres: ['Caja_Base'], ancho: 0.95, x: 1.2, z: -0.7 },
    { nombres: ['Caja_Arriba'], ancho: 0.72, x: 0.35, z: -1.25 },
    { nombres: ['Caja_Base'], ancho: 0.66, x: 1.18, z: -0.71, sobre: 3 },
    { nombres: ['Caja_Arriba'], ancho: 0.48, x: 1.42, z: 0.95 },
  ];
  // Donaciones de la estantería: [subcategoría, alto, x, z, sobre qué caja].
  // Las que van sobre una caja usan x/z como corrimiento desde su centro.
  const DONACIONES = [
    ['ropa-mujer', 0.48, 0.02, 0.0, 2],
    ['construccion-herramientas', 0.34, 0.0, 0.02, 5],
    ['ropa-ninos', 0.36, 0.0, 0.0, 4],
    ['alimento-animal', 0.42, 0.0, 0.0, 1],
    ['alimento-agua', 0.62, -1.15, 0.45],
    ['alimento-bebe', 0.32, -0.78, 0.98],
    ['aseo-corporal', 0.34, -1.48, 0.82],
    ['ropa-hombre', 0.36, 1.08, 0.12],
    ['alimento-no-perecederos', 0.3, 0.9, 0.62],
    ['medicamentos-antibioticos', 0.26, 0.72, 1.18],
    ['aseo-bucal', 0.34, 1.42, 0.95, 6],
    ['medicamentos-analgesicos', 0.22, 1.65, 0.3],
  ];

  // Deja respirar al navegador entre modelo y modelo (sin trabas).
  const respiro = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 120 }) : setTimeout(r, 16)));

  async function cargarDonacion(sub, alto) {
    const ruta = MODELOS_SUBCATEGORIA[sub];
    if (!ruta) return null;
    try {
      const gltf = await cargarGLB(cargador, ruta);
      const modelo = gltf.scene;
      ajustarModelo(sub, modelo, THREE);
      modelo.updateMatrixWorld(true);
      const tam = new THREE.Box3().setFromObject(modelo, true).getSize(new THREE.Vector3());
      modelo.scale.multiplyScalar(alto / tam.y);
      modelo.updateMatrixWorld(true);
      const caja = new THREE.Box3().setFromObject(modelo, true);
      const centro = caja.getCenter(new THREE.Vector3());
      modelo.position.sub(new THREE.Vector3(centro.x, caja.min.y, centro.z));
      const envoltura = new THREE.Group();
      envoltura.add(modelo);
      envoltura.traverse((n) => {
        if (!n.isMesh) return;
        (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
          if ('metalness' in m) m.metalness = Math.min(m.metalness, 0.1);
        });
      });
      const huella = caja.getSize(new THREE.Vector3());
      envoltura.userData.huella = [huella.x, huella.z];
      return envoltura;
    } catch {
      return null;
    }
  }

  (async () => {
    let modelo;
    try {
      modelo = (await cargarGLB(cargador, MODELO_CAJAS)).scene;
    } catch {
      return;
    }
    if (destruido) return;
    modelo.updateMatrixWorld(true);
    const cajas = [];
    const grupo = new THREE.Group();
    for (const c of CAJAS) {
      const caja = cajaDelModelo(modelo, c.nombres, c.ancho);
      const debajo = c.sobre !== undefined ? cajas[c.sobre] : null;
      const y = debajo ? debajo.position.y + debajo.userData.alto : 0;
      caja.position.set(c.x + entre(-0.02, 0.02), y, c.z + entre(-0.02, 0.02));
      caja.rotation.y = entre(-0.22, 0.22);
      const s = sombraSuave(c.ancho * 1.45, c.ancho * 1.25, debajo ? 'carton' : 'tarima', debajo ? 0.35 : 0.5);
      s.position.set(0.06, 0.004, -0.04);
      caja.add(s);
      grupo.add(caja);
      cajas.push(caja);
    }
    // Las donaciones se cargan una por una y aparecen todas juntas.
    const puestas = [];
    for (const [sub, alto, x, z, sobre] of DONACIONES) {
      await respiro();
      if (destruido) return;
      const d = await cargarDonacion(sub, alto);
      if (!d || destruido) continue;
      const base = sobre !== undefined ? cajas[sobre] : null;
      if (base) {
        d.position.set(base.position.x + x, base.position.y + base.userData.alto, base.position.z + z);
      } else {
        d.position.set(x, 0, z);
      }
      d.rotation.y = sub.startsWith('ropa') ? entre(-0.25, 0.25) : entre(-0.6, 0.6);
      const [ancho, fondo] = d.userData.huella;
      const s = sombraSuave(ancho * 1.7 + 0.08, fondo * 1.7 + 0.08, base ? 'carton' : 'tarima', base ? 0.35 : 0.5);
      s.position.set(0.04, 0.004, -0.02);
      d.add(s);
      puestas.push(d);
    }
    if (destruido) return;
    mundo.add(grupo, ...puestas);
    dibujar();
  })();

  // La escena está quieta (el gato, en otro lienzo, no resbala sobre la
  // tarima). Solo se dibuja cuando cambia algo (modelos que cargan, tamaño).
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(contenedor);
  function cuadro() {
    id = 0;
    if (visible) dibujar();
  }

  // El lienzo es más alto que la escena (CSS: .portada__isla baja un
  // EXTRA_ABAJO más). La parte de arriba se encuadra igual (setViewOffset),
  // así el gato, que va en otro lienzo, sigue parado en el mismo lugar.
  const ajustar = () => {
    const w = contenedor.clientWidth || 300;
    const hLienzo = contenedor.clientHeight || 300;
    const h = contenedor.parentElement?.clientHeight || hLienzo; // alto de la escena
    renderer.setSize(w, hLienzo, false);
    camara.aspect = w / h;
    camara.setViewOffset(w, h, 0, 0, w, hLienzo);
    camara.updateProjectionMatrix();
    dibujar();
    medirMargenIsla();
  };

  // Distancia entre el borde derecho de la tarima y el borde derecho de la
  // ventana: la portada la usa como margen izquierdo de los logos y del
  // botón (--margen-isla), para que los dos lados queden iguales.
  function medirMargenIsla() {
    const portada = contenedor.closest('.portada');
    if (!portada || vistaCamara) return;
    mundo.updateMatrixWorld(true);
    camara.updateMatrixWorld(true);
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const p = new THREE.Vector3();
    let maxX = -Infinity;
    const r = RADIO + 0.12; // el escalón de abajo es el más ancho
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      p.set(Math.cos(a) * r, -0.13, Math.sin(a) * r).applyMatrix4(mundo.matrixWorld).project(camara);
      maxX = Math.max(maxX, rect.left + (p.x * 0.5 + 0.5) * rect.width);
    }
    // maxX viene escalado (pantallas grandes, escala.js); el margen se usa
    // en CSS, sin escalar.
    const derecha = document.documentElement.getBoundingClientRect().right;
    const margen = Math.max(16, Math.round((derecha - maxX) / factorEscala()));
    portada.style.setProperty('--margen-isla', `${margen}px`);
    // Los logos se muestran ya en su lugar (y la próxima vez salen así de una).
    portada.classList.add('portada--margen-listo');
    try {
      localStorage.setItem('calida_margen_isla', JSON.stringify({ ancho: innerWidth, alto: innerHeight, margen }));
    } catch {}
  }
  window.addEventListener('resize', medirMargenIsla);
  const observador = new ResizeObserver(ajustar);
  observador.observe(contenedor);
  ajustar();
  cuadro();

  return () => {
    destruido = true;
    cancelAnimationFrame(id);
    observador.disconnect();
    io.disconnect();
    window.removeEventListener('resize', medirMargenIsla);
    escena.traverse((n) => {
      if (n.isMesh) {
        n.geometry.dispose();
        (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose());
      }
    });
    renderer.dispose();
    canvas.remove();
  };
}
