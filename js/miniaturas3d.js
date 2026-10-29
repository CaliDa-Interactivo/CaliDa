// ============================================================
// miniaturas3d.js — "fotos" de los modelos 3D de cada subcategoría.
// Se dibuja cada .glb una sola vez con three.js (fondo transparente)
// y la imagen se repite en las repisas de cantidad (0 a 5): ficha del
// centro y gestión de insumos. Así se ven los mismos productos que en
// la estantería 3D sin abrir varias escenas 3D a la vez.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODELOS_SUBCATEGORIA } from './estanteria3d.js';
import { cargarGLB } from './cargar-glb.js';
import { MINIATURAS } from './cache-miniaturas.js';
import { ajustarModelo } from './ajustes-modelos.js';

const TAMANO = 256;
let motor = null; // { renderer, escena, camara, cargador }
const pendientes = new Map();

function crearMotor() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(TAMANO, TAMANO, false);
  renderer.setClearColor(0x000000, 0);
  // three r147 (vista previa publicada): mismo color que r160.
  if (!('outputColorSpace' in renderer)) {
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
  }
  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight('#FFF8EE', '#D9C2A6', 2.0));
  const sol = new THREE.DirectionalLight('#FFFFFF', 2.2);
  sol.position.set(-2, 4, 5);
  escena.add(sol);
  const camara = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  return { renderer, escena, camara, cargador: new GLTFLoader() };
}

export function tieneModelo(subcategoriaId) {
  return Boolean(MODELOS_SUBCATEGORIA[subcategoriaId]);
}

/** Devuelve (y guarda) la imagen PNG del modelo de una subcategoría. */
export function generarMiniatura(subcategoriaId) {
  if (!tieneModelo(subcategoriaId)) return Promise.resolve(null);
  return generarMiniaturaDe(subcategoriaId, MODELOS_SUBCATEGORIA[subcategoriaId], (escena) =>
    ajustarModelo(subcategoriaId, escena, THREE)
  );
}

/**
 * Igual, para cualquier modelo (p. ej. las casas de la ficha).
 * Con { plano: true } la foto es de frente y sin perspectiva (cámara
 * ortográfica), como un dibujo 2D que cabe entero en su casilla.
 */
export function generarMiniaturaDe(clave, url, preparar = null, { plano = false } = {}) {
  const subcategoriaId = clave;
  if (MINIATURAS.has(subcategoriaId)) return Promise.resolve(MINIATURAS.get(subcategoriaId));
  if (pendientes.has(subcategoriaId)) return pendientes.get(subcategoriaId);

  const tarea = (async () => {
    motor ??= crearMotor();
    const gltf = await cargarGLB(motor.cargador, url);
    const modelo = preparar ? preparar(gltf.scene) : gltf.scene;
    return fotografiar(subcategoriaId, modelo, { plano });
  })().catch((e) => {
    console.warn('Sin miniatura 3D para', subcategoriaId, e);
    return null;
  });
  pendientes.set(subcategoriaId, tarea);
  return tarea;
}

// --- Íconos del menú del administrador ---------------------------------
// Hechos con piezas simples de three.js y el mismo material mate de los
// productos de la estantería (sin brillo).
const mate = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });

function redondeada(ancho, alto, fondo, radio) {
  const forma = new THREE.Shape();
  const [x, y] = [-ancho / 2, -alto / 2];
  forma.moveTo(x + radio, y);
  forma.lineTo(x + ancho - radio, y);
  forma.quadraticCurveTo(x + ancho, y, x + ancho, y + radio);
  forma.lineTo(x + ancho, y + alto - radio);
  forma.quadraticCurveTo(x + ancho, y + alto, x + ancho - radio, y + alto);
  forma.lineTo(x + radio, y + alto);
  forma.quadraticCurveTo(x, y + alto, x, y + alto - radio);
  forma.lineTo(x, y + radio);
  forma.quadraticCurveTo(x, y, x + radio, y);
  const g = new THREE.ExtrudeGeometry(forma, {
    depth: fondo - 0.08,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 4,
  });
  g.translate(0, 0, -(fondo - 0.08) / 2);
  return g;
}

const ICONOS_MENU = {
  // Caja de cartón con cinta y la cruz de la Cruz Roja.
  insumos() {
    const g = new THREE.Group();
    const caja = new THREE.Mesh(redondeada(1.2, 0.85, 1.0, 0.08), mate('#C98A55'));
    const cinta = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 1.04), mate('#E8E1D5'));
    cinta.position.y = 0.43;
    const cintaFrente = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.02), mate('#E8E1D5'));
    cintaFrente.position.set(0, 0.29, 0.51);
    const etiqueta = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.02), mate('#FFF8ED'));
    etiqueta.position.set(0, -0.08, 0.515);
    const cruzV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.02), mate('#CC0100'));
    cruzV.position.set(0, -0.08, 0.53);
    const cruzH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.02), mate('#CC0100'));
    cruzH.position.set(0, -0.08, 0.53);
    g.add(caja, cinta, cintaFrente, etiqueta, cruzV, cruzH);
    g.rotation.set(0.32, -0.55, 0);
    return g;
  },
  // Corazón (donación) apoyado sobre una base suave.
  donacion() {
    const g = new THREE.Group();
    const forma = new THREE.Shape();
    forma.moveTo(0, -0.55);
    forma.bezierCurveTo(-0.15, -0.38, -0.62, -0.12, -0.62, 0.18);
    forma.bezierCurveTo(-0.62, 0.48, -0.32, 0.62, -0.12, 0.5);
    forma.bezierCurveTo(-0.05, 0.46, 0, 0.4, 0, 0.36);
    forma.bezierCurveTo(0, 0.4, 0.05, 0.46, 0.12, 0.5);
    forma.bezierCurveTo(0.32, 0.62, 0.62, 0.48, 0.62, 0.18);
    forma.bezierCurveTo(0.62, -0.12, 0.15, -0.38, 0, -0.55);
    const geo = new THREE.ExtrudeGeometry(forma, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 8,
      curveSegments: 24,
    });
    geo.translate(0, 0, -0.09);
    const corazon = new THREE.Mesh(geo, mate('#CC0100'));
    g.add(corazon);
    g.rotation.set(0.12, -0.4, 0);
    return g;
  },
  // Camión: cabina azul, carga amarilla con la cruz y cuatro ruedas.
  despacho() {
    const g = new THREE.Group();
    const carga = new THREE.Mesh(redondeada(0.9, 0.72, 0.7, 0.07), mate('#FDD794'));
    carga.position.set(-0.18, 0.15, 0);
    const cabina = new THREE.Mesh(redondeada(0.48, 0.5, 0.66, 0.1), mate('#426D8C'));
    cabina.position.set(0.52, 0.05, 0);
    const vidrio = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02), mate('#BFD9E6'));
    vidrio.position.set(0.6, 0.15, 0.34);
    const cruzV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.02), mate('#CC0100'));
    cruzV.position.set(-0.18, 0.15, 0.36);
    const cruzH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.02), mate('#CC0100'));
    cruzH.position.set(-0.18, 0.15, 0.36);
    const chasis = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.6), mate('#514B46'));
    chasis.position.set(0.08, -0.22, 0);
    g.add(carga, cabina, vidrio, cruzV, cruzH, chasis);
    const geoRueda = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24);
    for (const [x, z] of [[-0.4, 0.3], [0.5, 0.3], [-0.4, -0.3], [0.5, -0.3]]) {
      const rueda = new THREE.Mesh(geoRueda, mate('#514B46'));
      rueda.rotation.x = Math.PI / 2;
      rueda.position.set(x, -0.3, z);
      const rin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.13, 16), mate('#E8E1D5'));
      rin.rotation.x = Math.PI / 2;
      rin.position.set(x, -0.3, z);
      g.add(rueda, rin);
    }
    g.rotation.set(0.25, -0.5, 0);
    return g;
  },
};

// Ícono de "Gestionar insumos": la caja cerrada con la cruz roja del
// archivo del equipo (cajas.blend → cajas.glb, "Caja_Base").
async function cajaDelEquipo() {
  const { scene } = await cargarGLB(new GLTFLoader(), 'assets/modelos/cajas.glb');
  const caja = scene.getObjectByName('Caja_Base').clone(true);
  caja.position.set(0, 0, 0);
  const g = new THREE.Group();
  g.add(caja);
  g.rotation.set(0.32, -0.55, 0);
  return g;
}

/** "Foto" de un ícono del menú del administrador ('insumos', 'donacion', 'despacho'). */
export function generarIconoMenu(clave) {
  const id = `menu-${clave}`;
  if (MINIATURAS.has(id)) return Promise.resolve(MINIATURAS.get(id));
  if (pendientes.has(id)) return pendientes.get(id);
  const tarea = Promise.resolve()
    .then(async () => {
      motor ??= crearMotor();
      const raiz = new THREE.Group();
      raiz.add(clave === 'insumos' ? await cajaDelEquipo().catch(() => ICONOS_MENU.insumos()) : ICONOS_MENU[clave]());
      return fotografiar(id, raiz);
    })
    .catch((e) => {
      console.warn('Sin ícono 3D para', clave, e);
      return null;
    });
  pendientes.set(id, tarea);
  return tarea;
}

// Centra el modelo, lo encuadra, lo dibuja una vez y guarda la imagen.
function fotografiar(subcategoriaId, modelo, { plano = false } = {}) {
  const { renderer, escena } = motor;
  let { camara } = motor;

  // Centrar y encuadrar el modelo.
  modelo.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(modelo);
  const centro = caja.getCenter(new THREE.Vector3());
  const tam = caja.getSize(new THREE.Vector3());
  const radio = tam.length() / 2;
  modelo.position.sub(centro);
  escena.add(modelo);
  if (plano) {
    // De frente y sin perspectiva, con un margen para que no toque los bordes.
    const lado = Math.max(tam.x, tam.y) * 0.56;
    camara = new THREE.OrthographicCamera(-lado, lado, lado, -lado, 0.01, radio * 8 + 10);
    camara.position.set(0, 0, radio * 3 + 2);
    camara.lookAt(0, 0, 0);
  } else {
    const d = radio / Math.sin(THREE.MathUtils.degToRad(camara.fov / 2)) * 0.92;
    camara.position.set(0, radio * 0.35, d);
    camara.lookAt(0, 0, 0);
  }
  camara.updateProjectionMatrix();

  renderer.render(escena, camara);
  const imagen = renderer.domElement.toDataURL('image/png');
  escena.remove(modelo);
  modelo.traverse((n) => {
    if (n.isMesh) {
      n.geometry.dispose();
      (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    }
  });
  MINIATURAS.set(subcategoriaId, imagen);
  return imagen;
}
