// ============================================================
// inicio3d.js — escena 3D de la pantalla principal: una isla
// flotante con mesas de madera y las cajas de cartón del equipo
// (cajas.glb) llenas de donaciones (los mismos modelos de la estantería). El gato 3D va
// encima, en su propio lienzo (gato3d.js), parado al frente.
// Material mate, como el resto de la página.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cargarGLB, RUTA_MODELOS } from './cargar-glb.js';
import { MODELOS_SUBCATEGORIA } from './estanteria3d.js';
import { ajustarModelo } from './ajustes-modelos.js';

const mate = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

// Cajas de cartón del equipo (cajas.blend → cajas.glb).
const MODELO_CAJAS = `${RUTA_MODELOS}cajas.glb`;

// Mesa de madera (color de la estantería) con cuatro patas.
function mesa(ancho, fondo, alto) {
  const g = new THREE.Group();
  const madera = mate('#A8623A');
  const tablero = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.07, fondo), madera);
  tablero.position.y = alto;
  tablero.castShadow = true;
  tablero.receiveShadow = true;
  g.add(tablero);
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, alto, 10), mate('#8C4F2C'));
    pata.position.set(x * (ancho / 2 - 0.08), alto / 2, z * (fondo / 2 - 0.08));
    pata.castShadow = true;
    g.add(pata);
  }
  return g;
}

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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

  // Dos mesas al fondo y a la derecha; el gato (otro lienzo) va al frente
  // a la izquierda.
  const mesaA = mesa(1.3, 0.7, 0.62);
  mesaA.position.set(0.35, 0, -0.75);
  const mesaB = mesa(1.0, 0.65, 0.62);
  mesaB.position.set(1.15, 0, 0.45);
  mesaB.rotation.y = -0.5;
  // Mesita para el vaso de los cepillos (antes flotaba junto a la mesa B).
  const mesaC = mesa(0.45, 0.4, 0.62);
  mesaC.position.set(1.65, 0, -0.3);
  mesaC.rotation.y = -0.5;
  mundo.add(mesaA, mesaB, mesaC);
  // Sombra suave de cada mesa sobre el césped, corrida hacia donde cae la
  // luz (como la del gato).
  for (const [m, ancho, fondo] of [[mesaA, 1.3, 0.7], [mesaB, 1.0, 0.65], [mesaC, 0.45, 0.4]]) {
    const s = sombraSuave(ancho * 1.2, fondo * 1.45, 'cesped', 0.78);
    s.position.set(0.12, 0.004, -0.06);
    m.add(s);
  }

  let id = 0;
  let destruido = false;
  const dibujar = () => {
    if (!destruido) renderer.render(escena, camara);
  };

  // Cajas del equipo (assets/modelos/cajas.glb, de cajas.blend): abiertas
  // sobre la mesa de atrás, una cerrada con el papel y el tarro encima, la
  // pila de dos cajas cerradas (tal como viene en el archivo) y una caja
  // abierta en el piso. Cada una se escala al ancho de la caja que reemplaza
  // y las donaciones se apoyan según su alto real.
  const SOBRE_MESA = 0.655;
  const cargador = new GLTFLoader();
  const productos = (alto) => [
    ['alimento-agua', 0.42, [-0.08, alto.enCaja, -0.72]],
    ['alimento-no-perecederos', 0.24, [0.17, alto.enCaja, -0.66]],
    ['ropa-hombre', 0.34, [0.57, alto.enCaja, -0.8]],
    ['ropa-mujer', 0.34, [0.8, alto.enCaja, -0.78]],
    // Tarro y papel lado a lado sobre la tapa de la caja C (girada -0,5),
    // sin meterse uno en el otro: el papel mide 0,35 de ancho y el tarro
    // 0,17; van a 0,09 y a -0,185 del centro de la caja, a lo largo.
    ['medicamentos-analgesicos', 0.22, [0.988, alto.sobreCajaC, 0.361]],
    ['aseo-corporal', 0.2, [1.229, alto.sobreCajaC, 0.493]],
    ['alimento-bebe', 0.3, [0.85, SOBRE_MESA, -0.47]],
    ['aseo-bucal', 0.3, [1.65, SOBRE_MESA, -0.3]],
    // La bolsa de comida para animales, encima de la pila de cajas cerradas.
    ['alimento-animal', 0.3, [-1.25, alto.sobrePila, -0.55]],
  ];

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
      });
    });
    envoltura.userData.alto = tam.y * escala;
    return envoltura;
  }

  const listasCajas = cargarGLB(cargador, MODELO_CAJAS).then(({ scene: modelo }) => {
    if (destruido) return null;
    modelo.updateMatrixWorld(true);
    const cajaA = cajaDelModelo(modelo, ['Caja_Botiquin'], 0.62);
    cajaA.position.set(0.05, SOBRE_MESA, -0.72);
    const cajaB = cajaDelModelo(modelo, ['Caja_Derecha'], 0.5);
    cajaB.position.set(0.68, SOBRE_MESA, -0.78);
    // La caja del papel va cerrada (la caja con la cruz); el papel y el
    // tarro van encima.
    const cajaC = cajaDelModelo(modelo, ['Caja_Base'], 0.55);
    cajaC.position.set(1.15, SOBRE_MESA, 0.45);
    cajaC.rotation.y = -0.5;
    const pila = cajaDelModelo(modelo, ['Caja_Base', 'Caja_Arriba'], 0.5);
    pila.position.set(-1.25, 0, -0.55);
    pila.rotation.y = 0.2;
    const cajaPiso = cajaDelModelo(modelo, ['Caja_Frontal'], 0.46);
    cajaPiso.position.set(-0.7, 0, -1.2);
    cajaPiso.rotation.y = -0.2;
    mundo.add(cajaA, cajaB, cajaC, pila, cajaPiso);
    // Sombras suaves: las cajas del piso sobre el césped; las de las mesas
    // sobre la madera.
    for (const [caja, ancho, sobre] of [
      [pila, 0.5, 'cesped'], [cajaPiso, 0.46, 'cesped'],
      [cajaA, 0.62, 'madera'], [cajaB, 0.5, 'madera'], [cajaC, 0.55, 'madera'],
    ]) {
      const s = sombraSuave(ancho * 1.45, ancho * 1.25, sobre);
      s.position.set(0.06, 0.004, -0.04);
      caja.add(s);
    }
    dibujar();
    return {
      // el fondo de una caja abierta (el cartón tiene ~2 cm de grosor)
      enCaja: SOBRE_MESA + 0.02,
      sobreCajaC: SOBRE_MESA + cajaC.userData.alto,
      sobrePila: pila.userData.alto,
    };
  });

  // Donaciones: los modelos de la estantería, asomándose de las cajas y
  // sueltas sobre las mesas. Cada uno se apoya en algo: el fondo de una
  // caja, el tablero de una mesa o la tapa de una caja cerrada.
  // Se cargan uno por uno, dejando respirar al navegador entre cada uno
  // (todos a la vez trababan la portada).
  const respiro = () =>
    new Promise((ok) => (window.requestIdleCallback ?? ((f) => setTimeout(f, 16)))(ok, { timeout: 300 }));
  listasCajas.then(async (alturas) => {
    if (!alturas || destruido) return;
    for (const [sub, alto, [x, y, z]] of productos(alturas)) {
    const ruta = MODELOS_SUBCATEGORIA[sub];
    if (!ruta) continue;
    await respiro();
    if (destruido) return;
    await cargarGLB(cargador, ruta)
      .then((gltf) => {
        if (destruido) return;
        const modelo = gltf.scene;
        ajustarModelo(sub, modelo, THREE);
        modelo.updateMatrixWorld(true);
        const caja = new THREE.Box3().setFromObject(modelo);
        const tam = caja.getSize(new THREE.Vector3());
        const escala = alto / tam.y;
        modelo.scale.multiplyScalar(escala);
        modelo.updateMatrixWorld(true);
        const caja2 = new THREE.Box3().setFromObject(modelo);
        const centro = caja2.getCenter(new THREE.Vector3());
        const envoltura = new THREE.Group();
        modelo.position.sub(new THREE.Vector3(centro.x, caja2.min.y, centro.z));
        envoltura.add(modelo);
        envoltura.position.set(x, y, z);
        envoltura.traverse((n) => {
          if (n.isMesh) {
            n.castShadow = true;
            (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
              if ('metalness' in m) m.metalness = Math.min(m.metalness, 0.1);
            });
          }
        });
        mundo.add(envoltura);
        dibujar();
      })
      .catch(() => {});
    }
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
    const margen = Math.max(16, Math.round(document.documentElement.clientWidth - maxX));
    portada.style.setProperty('--margen-isla', `${margen}px`);
  }
  window.addEventListener('resize', medirMargenIsla);
  // La escena entra deslizándose: se vuelve a medir cuando termina.
  const escenaPortada = contenedor.closest('.portada__escena');
  escenaPortada?.addEventListener('animationend', medirMargenIsla);
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
    escenaPortada?.removeEventListener('animationend', medirMargenIsla);
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
