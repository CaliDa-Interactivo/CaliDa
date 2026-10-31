// ============================================================
// inicio3d.js — escena 3D de la pantalla principal: una isla
// flotante con una pila de cajas de cartón del equipo (cajas.glb) a la
// derecha. El gato 3D va encima, en su propio lienzo (gato3d.js), parado
// a la izquierda.
// Material mate, como el resto de la página.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cargarGLB, RUTA_MODELOS } from './cargar-glb.js';
import { factorEscala, resolucion } from './escala.js';

const mate = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

// Cajas de cartón del equipo (cajas.blend → cajas.glb).
const MODELO_CAJAS = `${RUTA_MODELOS}cajas.glb`;

// Isla flotante: césped arriba y tierra que se adelgaza hacia abajo en
// una sola pieza curva que termina limpia en punta (sin escalones).
function isla() {
  const g = new THREE.Group();
  const cesped = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.0, 0.22, 64), mate('#9CC78A'));
  cesped.position.y = -0.11;
  cesped.receiveShadow = true;
  const perfil = [
    [1.97, 0],
    [1.78, -0.3],
    [1.42, -0.72],
    [1.02, -1.18],
    [0.64, -1.64],
    [0.32, -2.04],
    [0.09, -2.36],
    [0, -2.48],
  ]
    // De abajo hacia arriba: así las caras miran hacia afuera (si no,
    // three.js las oculta y la isla se ve cortada).
    .reverse()
    .map(([r, y]) => new THREE.Vector2(r, y));
  const tierra = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), mate('#A8623A'));
  tierra.position.y = -0.22;
  g.add(cesped, tierra);
  return g;
}

// Sombra suave pintada (un degradado), igual a la del gato en la portada
// (gato3d.js con data-luz="isla"): verde oscuro sobre el césped; café
// sobre la madera de las mesas.
const TONO_SOMBRA = { cesped: '30, 62, 34', madera: '70, 34, 14' };
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
  return (texturasSombra[clave] = new THREE.CanvasTexture(lienzo));
}
// fuerza: las sombras grandes (mesas) se reparten en más área y se ven más
// claras; por eso llevan un poco más de fuerza que la del gato (0,55).
function sombraSuave(ancho, fondo, sobre = 'cesped', fuerza = 0.55) {
  const plano = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho, fondo),
    new THREE.MeshBasicMaterial({ map: texturaSombra(TONO_SOMBRA[sobre], fuerza), transparent: true, depthWrite: false })
  );
  plano.rotation.x = -Math.PI / 2;
  plano.renderOrder = 1;
  return plano;
}

/**
 * Monta la escena en `contenedor` (un div). Devuelve una función para
 * liberar todo al salir de la pantalla.
 */
export function montarIsla(contenedor, { camara: vistaCamara = null, capturable = false } = {}) {
  // `camara` ({ posicion, mira, fov }) y `capturable` sirven para sacar
  // "fotos" de la isla (p. ej. la tarjeta del admin en Elige tu perfil).
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: capturable });
  renderer.setPixelRatio(resolucion(1.5));
  // Sin sombras proyectadas: cada mesa y caja lleva una sombra suave
  // pintada (sombraSuave), igual de difusa y del mismo tono que la del gato.
  renderer.shadowMap.enabled = false;
  const canvas = renderer.domElement;
  canvas.className = 'isla3d__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  contenedor.appendChild(canvas);

  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight('#FFF8EE', '#8FB7A0', 1.3));
  escena.add(new THREE.AmbientLight('#FFFFFF', 0.45));
  const sol = new THREE.DirectionalLight('#FFF1E0', 2.2);
  sol.position.set(-3, 6, 4);
  escena.add(sol);

  const camara = new THREE.PerspectiveCamera(vistaCamara?.fov ?? 30, 1, 0.1, 50);
  camara.position.set(...(vistaCamara?.posicion ?? [3.6, 3.1, 6.4]));
  camara.lookAt(...(vistaCamara?.mira ?? [0, 0.35, 0]));

  const mundo = new THREE.Group();
  mundo.rotation.y = -0.35;
  escena.add(mundo);
  mundo.add(isla());

  // Pila de cajas cerradas al lado DERECHO de la isla (el gato, en otro
  // lienzo, está parado a la izquierda, en x = -0,3, z = 0,87 del mundo), de
  // frente a la cámara, como una pila de cajas de cartón de una bodega.
  const PILA = { x: 0.85, z: -0.25, giro: 0.985 };
  let id = 0;
  let destruido = false;
  const dibujar = () => {
    if (!destruido) renderer.render(escena, camara);
  };

  // Cajas del equipo (assets/modelos/cajas.glb, de cajas.blend).
  const cargador = new GLTFLoader();
  // Un poco de azar con semilla fija (siempre queda igual): cada caja algo
  // girada, para que la pila se vea natural.
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
      n.castShadow = true;
      n.receiveShadow = true;
      (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
        m.roughness = 0.85;
        m.metalness = 0;
        // El cartón por las dos caras: si no, por las paredes de una sola
        // cara se veía lo que hay dentro de la caja.
        m.side = THREE.DoubleSide;
      });
    });
    envoltura.userData.alto = tam.y * escala;
    // Cuerpo de la caja (sin las solapas, que son disparejas) en el marco de
    // la envoltura: paredes y fondo para acomodar lo que va dentro o encima.
    // En una pila, la de arriba.
    envoltura.updateMatrixWorld(true);
    const cuerpos = [];
    envoltura.traverse((n) => n.isMesh && /Cuerpo/.test(n.name) && cuerpos.push(n));
    const arriba = cuerpos.filter((n) => /Arriba/.test(n.name));
    const cuerpo = new THREE.Box3();
    (arriba.length ? arriba : cuerpos).forEach((n) => cuerpo.expandByObject(n, true));
    if (!cuerpo.isEmpty()) envoltura.userData.cuerpo = cuerpo;
    return envoltura;
  }

  // La pila: tres cajas abajo, dos encima, una arriba y dos sueltas al
  // frente. Cada caja se apoya en la de abajo (su alto real) y va un poco
  // girada. [cajas del archivo, ancho, x y z en la pila, sobre qué caja]
  const PILA_CAJAS = [
    { nombres: ['Caja_Base'], ancho: 0.58, x: -0.56, z: 0.0 },
    { nombres: ['Caja_Arriba'], ancho: 0.66, x: 0.06, z: 0.02 },
    { nombres: ['Caja_Base'], ancho: 0.54, x: 0.64, z: -0.02 },
    { nombres: ['Caja_Arriba'], ancho: 0.48, x: -0.5, z: 0.0, sobre: 0 },
    { nombres: ['Caja_Base'], ancho: 0.52, x: 0.1, z: 0.0, sobre: 1 },
    { nombres: ['Caja_Arriba'], ancho: 0.4, x: 0.12, z: 0.0, sobre: 4 },
    { nombres: ['Caja_Arriba'], ancho: 0.42, x: -0.28, z: 0.56 },
    { nombres: ['Caja_Base'], ancho: 0.38, x: 0.5, z: 0.5 },
  ];
  cargarGLB(cargador, MODELO_CAJAS).then(({ scene: modelo }) => {
    if (destruido) return;
    modelo.updateMatrixWorld(true);
    const pila = new THREE.Group();
    pila.position.set(PILA.x, 0, PILA.z);
    pila.rotation.y = PILA.giro;
    const puestas = [];
    for (const c of PILA_CAJAS) {
      const caja = cajaDelModelo(modelo, c.nombres, c.ancho);
      const debajo = c.sobre !== undefined ? puestas[c.sobre] : null;
      const y = debajo ? debajo.position.y + debajo.userData.alto : 0;
      caja.position.set(c.x + entre(-0.02, 0.02), y, c.z + entre(-0.02, 0.02));
      caja.rotation.y = entre(-0.16, 0.16);
      // Sombra suave: sobre el césped las del piso; sobre la caja de abajo,
      // en café, las de encima.
      const s = sombraSuave(c.ancho * 1.4, c.ancho * 1.2, debajo ? 'madera' : 'cesped', debajo ? 0.35 : 0.55);
      s.position.set(0.05, 0.004, -0.04);
      caja.add(s);
      pila.add(caja);
      puestas.push(caja);
    }
    mundo.add(pila);
    dibujar();
  });

  // La isla ya no gira sola: el gato (otro lienzo) no gira con ella y
  // parecía resbalar sobre el césped en cada vaivén. Toda la escena flota
  // junta con la animación CSS de .portada__escena. Solo se dibuja cuando
  // cambia algo (modelos que cargan, tamaño).
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(contenedor);
  function cuadro() {
    id = 0;
    if (visible) dibujar();
  }

  // El lienzo es más alto que la escena (CSS: .portada__isla baja un
  // EXTRA_ABAJO más) para que quepa la punta de la isla. La parte de
  // arriba se encuadra igual que antes (setViewOffset), así el gato, que
  // va en otro lienzo, sigue parado en el mismo lugar del césped.
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

  // Distancia entre el borde derecho de la plataforma (el césped) y el borde
  // derecho de la ventana: la portada la usa como margen izquierdo de los
  // logos y del botón (--margen-isla), para que los dos lados queden iguales.
  function medirMargenIsla() {
    const portada = contenedor.closest('.portada');
    if (!portada || vistaCamara) return;
    mundo.updateMatrixWorld(true);
    camara.updateMatrixWorld(true);
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const p = new THREE.Vector3();
    let maxX = -Infinity;
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      p.set(Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05).applyMatrix4(mundo.matrixWorld).project(camara);
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
