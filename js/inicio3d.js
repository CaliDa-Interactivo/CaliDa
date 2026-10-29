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

/**
 * Monta la escena en `contenedor` (un div). Devuelve una función para
 * liberar todo al salir de la pantalla.
 */
export function montarIsla(contenedor) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'isla3d__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  contenedor.appendChild(canvas);

  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight('#FFF8EE', '#8FB7A0', 1.3));
  escena.add(new THREE.AmbientLight('#FFFFFF', 0.45));
  const sol = new THREE.DirectionalLight('#FFF1E0', 2.2);
  sol.position.set(-3, 6, 4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
  escena.add(sol);

  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camara.position.set(3.6, 3.1, 6.4);
  camara.lookAt(0, 0.35, 0);

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
  listasCajas.then((alturas) => {
    if (!alturas || destruido) return;
    for (const [sub, alto, [x, y, z]] of productos(alturas)) {
    const ruta = MODELOS_SUBCATEGORIA[sub];
    if (!ruta) continue;
    cargarGLB(cargador, ruta)
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
  };
  const observador = new ResizeObserver(ajustar);
  observador.observe(contenedor);
  ajustar();
  cuadro();

  return () => {
    destruido = true;
    cancelAnimationFrame(id);
    observador.disconnect();
    io.disconnect();
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
