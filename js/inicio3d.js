// ============================================================
// inicio3d.js — escena 3D de la pantalla principal: una isla
// flotante con dos mesas de madera y cajas de cartón llenas de
// donaciones (los mismos modelos de la estantería). El gato 3D va
// encima, en su propio lienzo (gato3d.js), parado al frente.
// Material mate, como el resto de la página.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cargarGLB } from './cargar-glb.js';
import { MODELOS_SUBCATEGORIA } from './estanteria3d.js';
import { ajustarModelo } from './ajustes-modelos.js';

const mate = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

// Caja de cartón abierta (paredes, solapas y una franja de cinta).
function cajaCarton(ancho, alto, fondo, { cruz = false } = {}) {
  const g = new THREE.Group();
  const carton = mate('#C98A55');
  const interior = mate('#9C6A3E');
  const grosor = 0.03;
  const pared = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), carton);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };
  pared(ancho, grosor, fondo, 0, grosor / 2, 0); // piso
  pared(ancho, alto, grosor, 0, alto / 2, fondo / 2); // frente
  pared(ancho, alto, grosor, 0, alto / 2, -fondo / 2); // atrás
  pared(grosor, alto, fondo, ancho / 2, alto / 2, 0);
  pared(grosor, alto, fondo, -ancho / 2, alto / 2, 0);
  const fondoCaja = new THREE.Mesh(new THREE.BoxGeometry(ancho * 0.94, 0.01, fondo * 0.94), interior);
  fondoCaja.position.y = grosor + 0.005;
  g.add(fondoCaja);
  // Solapas abiertas hacia los lados
  for (const lado of [-1, 1]) {
    const solapa = new THREE.Mesh(new THREE.BoxGeometry(ancho * 0.96, grosor, fondo * 0.42), mate('#D9A06B'));
    solapa.position.set(0, alto + 0.02, lado * (fondo / 2 + fondo * 0.17));
    solapa.rotation.x = lado * 0.45;
    solapa.castShadow = true;
    g.add(solapa);
  }
  if (cruz) {
    const etiqueta = new THREE.Mesh(new THREE.BoxGeometry(ancho * 0.36, alto * 0.42, 0.01), mate('#FFF8ED'));
    etiqueta.position.set(0, alto * 0.48, fondo / 2 + 0.02);
    g.add(etiqueta);
    for (const [w, h] of [[0.035, 0.11], [0.11, 0.035]]) {
      const barra = new THREE.Mesh(new THREE.BoxGeometry(w * ancho * 2.4, h * ancho * 2.4, 0.012), mate('#CC0100'));
      barra.position.set(0, alto * 0.48, fondo / 2 + 0.028);
      g.add(barra);
    }
  }
  return g;
}

// Caja cerrada con cinta (para apilar en el piso).
function cajaCerrada(ancho, alto, fondo, cruz = false) {
  const g = new THREE.Group();
  const caja = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), mate('#C98A55'));
  caja.position.y = alto / 2;
  caja.castShadow = true;
  caja.receiveShadow = true;
  const cinta = new THREE.Mesh(new THREE.BoxGeometry(ancho * 0.22, 0.012, fondo * 1.01), mate('#E8E1D5'));
  cinta.position.y = alto + 0.006;
  g.add(caja, cinta);
  if (cruz) {
    for (const [w, h] of [[0.05, 0.16], [0.16, 0.05]]) {
      const barra = new THREE.Mesh(new THREE.BoxGeometry(w * ancho * 2, h * ancho * 2, 0.012), mate('#CC0100'));
      barra.position.set(0, alto / 2, fondo / 2 + 0.008);
      g.add(barra);
    }
  }
  return g;
}

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

  // Cajas abiertas sobre las mesas y cajas cerradas apiladas en el piso
  const cajaA = cajaCarton(0.62, 0.32, 0.45, { cruz: true });
  cajaA.position.set(0.05, 0.655, -0.72);
  const cajaB = cajaCarton(0.5, 0.28, 0.4);
  cajaB.position.set(0.68, 0.655, -0.78);
  // La caja del papel va cerrada; el papel y el analgésico van encima.
  const cajaC = cajaCerrada(0.55, 0.3, 0.42, true);
  cajaC.position.set(1.15, 0.655, 0.45);
  cajaC.rotation.y = -0.5;
  mundo.add(cajaA, cajaB, cajaC);
  const pila = [
    cajaCerrada(0.5, 0.36, 0.45, true),
    cajaCerrada(0.42, 0.3, 0.4),
    cajaCerrada(0.46, 0.32, 0.42, true),
  ];
  pila[0].position.set(-1.25, 0, -0.55);
  pila[1].position.set(-1.25, 0.36, -0.55);
  pila[1].rotation.y = 0.35;
  pila[2].position.set(-0.7, 0, -1.2);
  pila[2].rotation.y = -0.2;
  mundo.add(...pila);

  let id = 0;
  let destruido = false;
  const dibujar = () => {
    if (!destruido) renderer.render(escena, camara);
  };

  // Donaciones: los modelos de la estantería, asomándose de las cajas y
  // sueltas sobre las mesas. Cada uno se apoya en algo: el fondo de una
  // caja (y ≈ 0.685), el tablero de una mesa (y = 0.655) o la tapa de una
  // caja cerrada.
  const SOBRE_MESA = 0.655;
  const EN_CAJA = 0.685;
  const SOBRE_CAJA_C = 0.655 + 0.3 + 0.012;
  const SOBRE_PILA = 0.36 + 0.3 + 0.012;
  const cargador = new GLTFLoader();
  const productos = [
    ['alimento-agua', 0.42, [-0.08, EN_CAJA, -0.72]],
    ['alimento-no-perecederos', 0.24, [0.17, EN_CAJA, -0.66]],
    ['ropa-hombre', 0.34, [0.57, EN_CAJA, -0.8]],
    ['ropa-mujer', 0.34, [0.8, EN_CAJA, -0.78]],
    // Tarro y papel lado a lado sobre la tapa de la caja C (girada -0,5),
    // sin meterse uno en el otro: el papel mide 0,35 de ancho y el tarro
    // 0,17; van a 0,09 y a -0,185 del centro de la caja, a lo largo.
    ['medicamentos-analgesicos', 0.22, [0.988, SOBRE_CAJA_C, 0.361]],
    ['aseo-corporal', 0.2, [1.229, SOBRE_CAJA_C, 0.493]],
    ['alimento-bebe', 0.3, [0.85, SOBRE_MESA, -0.47]],
    ['aseo-bucal', 0.3, [1.65, SOBRE_MESA, -0.3]],
    // La bolsa de comida para animales, encima de la pila de cajas cerradas.
    ['alimento-animal', 0.3, [-1.25, SOBRE_PILA, -0.55]],
  ];
  for (const [sub, alto, [x, y, z]] of productos) {
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
