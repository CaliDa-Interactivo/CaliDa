// ============================================================
// gato3d.js — el gato de CaliDa en 3D (assets/modelos/gato.glb).
//
// Reemplaza al gato 2D en toda la página. Cada contenedor
// [data-gato3d] recibe un pequeño lienzo three.js con su propia copia
// del modelo. Si el 3D no puede mostrarse, se queda el dibujo 2D que
// el contenedor ya trae adentro (respaldo).
//
// El modelo no trae animaciones, así que se animan sus partes desde
// el código, conservando las animaciones del gato 2D:
//   quieto  → mirando al frente, con vida: respira, se balancea un poco,
//             mueve suave la mano y la cola, y parpadea
//   (data-encuadre="medio": se ve de medio cuerpo, asomándose)
//   saluda  → solo saluda con la mano derecha (y parpadea): pantalla principal
//   senala  → se inclina hacia el contenido (izquierda)
//   alerta  → levanta la mano y la mueve despacio, llamando la atención
//             (sin sacudirse; mapa con urgencias:
//             se activa solo si está dentro de .mapa3d__gato--urgente)
//   feliz   → salta de alegría (confirmaciones)
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cargarGLB, MODELO_GATO } from './cargar-glb.js';

const activos = new Set();
const COLOR_GATO = '#A8623A'; // mismo color de la estantería (paleta oct 2026)
let base = null; // Promise<THREE.Group> del modelo original

function cargarBase() {
  base ??= cargarGLB(new GLTFLoader(), MODELO_GATO).then((gltf) => {
    const modelo = gltf.scene;
    // Color del gato de la paleta (café). Se cambian las partes coral
    // (cabeza, cuerpo, cola, brazo); orejas, patitas, ojos y bigotes igual.
    const coral = new THREE.Color('#F67751');
    modelo.traverse((n) => {
      if (!n.isMesh) return;
      (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
        if (m.color && Math.abs(m.color.r - coral.r) + Math.abs(m.color.g - coral.g) + Math.abs(m.color.b - coral.b) < 0.35) {
          m.color.set(COLOR_GATO);
        }
      });
    });
    // El modelo mira hacia +x: se gira para que mire a la cámara (+z).
    modelo.rotation.y = -Math.PI / 2;
    const raiz = new THREE.Group();
    raiz.add(modelo);
    raiz.updateMatrixWorld(true);
    // Centrado en x/z y apoyado en y = 0, con alto 1.
    const caja = new THREE.Box3().setFromObject(raiz);
    const tam = caja.getSize(new THREE.Vector3());
    const centro = caja.getCenter(new THREE.Vector3());
    modelo.position.x -= centro.x;
    modelo.position.z -= centro.z;
    modelo.position.y -= caja.min.y;
    raiz.scale.setScalar(1 / tam.y);
    return raiz;
  });
  return base;
}

// Busca una parte por su nombre. El cargador de three.js cambia los
// espacios por "_" ("Pupilas espejo" → "Pupilas_espejo"), así que se
// prueban las dos formas.
function parte(raiz, nombre) {
  return raiz.getObjectByName(nombre) ?? raiz.getObjectByName(nombre.replace(/\s+/g, '_'));
}

// Agrupa partes bajo un pivote (sin moverlas) para poder rotarlas juntas.
function agrupar(raiz, nombres, pivote) {
  const grupo = new THREE.Group();
  grupo.position.copy(pivote);
  raiz.add(grupo);
  raiz.updateMatrixWorld(true);
  grupo.updateMatrixWorld(true);
  nombres
    .map((n) => parte(raiz, n))
    .filter(Boolean)
    .forEach((obj) => grupo.attach(obj));
  return grupo;
}

function centroDe(raiz, nombres) {
  const caja = new THREE.Box3();
  nombres.map((n) => parte(raiz, n)).filter(Boolean).forEach((o) => caja.expandByObject(o));
  return caja.isEmpty() ? null : caja.getCenter(new THREE.Vector3());
}

async function montarUno(el) {
  const modeloBase = await cargarBase();
  if (!el.isConnected) return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (!('outputColorSpace' in renderer)) {
    // three r147 (vista previa publicada): mismo color que r160.
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
  }
  const canvas = renderer.domElement;
  canvas.className = 'gato3d__canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const escena = new THREE.Scene();
  // Poca luz de relleno y una luz principal de lado: el gato se ve un poco
  // más oscuro y se notan sus sombras (volumen).
  escena.add(new THREE.AmbientLight('#FFF4EA', 0.6));
  escena.add(new THREE.HemisphereLight('#FFF8EE', '#B98A6E', 1.0));
  const sol = new THREE.DirectionalLight('#FFF1E0', 2.4);
  sol.position.set(2.6, 3.2, 3);
  escena.add(sol);
  const borde = new THREE.DirectionalLight('#FFD9B8', 0.8); // luz de contorno cálida
  borde.position.set(-2.5, 2, -2);
  escena.add(borde);

  const camara = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
  if (el.dataset.encuadre === 'medio') {
    // Medio cuerpo: de la cintura a las orejas (para asomarse por un lado).
    camara.position.set(0, 0.8, 1.5);
    camara.lookAt(0, 0.74, 0);
  } else {
    camara.position.set(0, 0.62, 2.55);
    camara.lookAt(0, 0.5, 0);
  }

  // Copia propia del modelo (las geometrías se comparten).
  const raiz = modeloBase.clone(true);
  const pivoteGato = new THREE.Group(); // para rebote y balanceo
  pivoteGato.add(raiz);
  escena.add(pivoteGato);

  // Partes animables.
  raiz.updateMatrixWorld(true);
  // Pupilas: las dos van en un mismo grupo que GIRA alrededor del centro
  // de la cabeza. Así se deslizan juntas sobre la cara curva; si se
  // trasladaran de lado, una se hundía en la cabeza y la otra se salía
  // del ojo (se veía como si solo un ojo se moviera).
  const pupilas = ['Pupilas', 'Pupilas espejo'];
  const centroCabeza = centroDe(raiz, ['Cabezota']) ?? centroDe(raiz, pupilas);
  const grupoPupilas =
    centroCabeza && centroDe(raiz, pupilas)
      ? agrupar(raiz, pupilas, raiz.worldToLocal(centroCabeza.clone()))
      : null;

  // Párpados: uno por ojo, del mismo material de la cara. Bajan desde
  // arriba y suben, los dos a la vez (parpadeo natural).
  const parpados = [];
  const malllaOjos = parte(raiz, 'Ojos');
  const cuerpo = parte(raiz, 'Cuerpo y orejas');
  let materialCara = null;
  cuerpo?.traverse((n) => {
    if (n.isMesh && !materialCara) materialCara = n.material;
  });
  if (malllaOjos && materialCara) {
    raiz.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const puntos = [];
    malllaOjos.traverse((n) => {
      if (!n.isMesh) return;
      const pos = n.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 3) {
        v.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld);
        puntos.push(raiz.worldToLocal(v.clone()));
      }
    });
    const centroX = puntos.reduce((acc, p) => acc + p.x, 0) / (puntos.length || 1);
    for (const lado of [-1, 1]) {
      const caja = new THREE.Box3().setFromPoints(puntos.filter((p) => (p.x - centroX) * lado > 0));
      if (caja.isEmpty()) continue;
      const c = caja.getCenter(new THREE.Vector3());
      const t = caja.getSize(new THREE.Vector3());
      const pivote = new THREE.Group();
      pivote.position.set(c.x, c.y + t.y * 0.62, c.z + t.z * 0.12);
      const tapa = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), materialCara);
      tapa.renderOrder = 2; // se dibuja encima del ojo y la pupila
      tapa.scale.set(t.x * 1.2, t.y * 1.24, t.z * 1.2);
      tapa.position.y = -t.y * 0.62;
      pivote.add(tapa);
      pivote.scale.y = 0.001;
      pivote.visible = false;
      raiz.add(pivote);
      parpados.push(pivote);
    }
  }
  const parpadeo = { proximo: 1.5 + Math.random() * 2, inicio: -1, doble: false };
  function cierreParpado(t) {
    if (parpadeo.inicio < 0 && t >= parpadeo.proximo) {
      parpadeo.inicio = t;
      parpadeo.doble = Math.random() < 0.2;
    }
    if (parpadeo.inicio < 0) return 0;
    const dur = 0.32; // cerrar 0,11 s · cerrado 0,06 s · abrir 0,15 s
    let f = t - parpadeo.inicio;
    if (parpadeo.doble && f > dur) f -= dur + 0.08;
    const total = parpadeo.doble ? dur * 2 + 0.08 : dur;
    if (t - parpadeo.inicio > total) {
      parpadeo.inicio = -1;
      parpadeo.proximo = t + 2.5 + Math.random() * 3.5;
      return 0;
    }
    const suave = (u) => u * u * (3 - 2 * u);
    if (f < 0) return 0;
    if (f < 0.11) return suave(f / 0.11);
    if (f < 0.17) return 1;
    if (f < dur) return 1 - suave((f - 0.17) / 0.15);
    return 0;
  }
  const mirada = { x: 0, y: 0, objX: 0, objY: 0, proxima: 2 };
  const cola = raiz.getObjectByName('Cola');
  const brazo = raiz.getObjectByName('BrazoDer'); // articulado en el hombro

  // Brazo blando: en vez de girarlo rígido (se marcaba un "codo" en el
  // hombro), cada vértice gira según qué tan lejos está del hombro:
  // casi nada junto al cuerpo y todo el ángulo en la mano.
  const mallasBrazo = [];
  brazo?.traverse((n) => {
    if (!n.isMesh) return;
    n.geometry = n.geometry.clone(); // copia propia (se deforma)
    const pos = n.geometry.attributes.position;
    let zMax = 0;
    for (let i = 0; i < pos.count; i++) zMax = Math.max(zMax, pos.getZ(i));
    mallasBrazo.push({ malla: n, original: Float32Array.from(pos.array), zMax: zMax || 1 });
  });
  let anguloBrazo = 0;
  let cuadroBrazo = 0;
  function doblarBrazo(angulo) {
    if (Math.abs(angulo - anguloBrazo) < 0.002) return;
    anguloBrazo = angulo;
    cuadroBrazo++;
    for (const { malla, original, zMax } of mallasBrazo) {
      const pos = malla.geometry.attributes.position;
      const a = pos.array;
      for (let i = 0; i < a.length; i += 3) {
        const y = original[i + 1];
        const z = original[i + 2];
        // peso suave (smoothstep) desde el hombro hasta la mano
        const u = Math.min(1, Math.max(0, (z - 0.02) / (zMax * 0.85)));
        const w = u * u * (3 - 2 * u);
        const ang = angulo * w;
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        a[i + 1] = y * c - z * sn;
        a[i + 2] = y * sn + z * c;
      }
      pos.needsUpdate = true;
      if (cuadroBrazo % 2 === 0) malla.geometry.computeVertexNormals();
    }
  }

  // Sombra suave en el piso (se ve más apoyado y orgánico).
  const lienzoSombra = document.createElement('canvas');
  lienzoSombra.width = lienzoSombra.height = 128;
  const ctxS = lienzoSombra.getContext('2d');
  const grad = ctxS.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(90, 40, 20, 0.32)');
  grad.addColorStop(1, 'rgba(90, 40, 20, 0)');
  ctxS.fillStyle = grad;
  ctxS.fillRect(0, 0, 128, 128);
  const texSombra = new THREE.CanvasTexture(lienzoSombra);
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.5),
    new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false })
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.002;
  if (el.dataset.encuadre !== 'medio') escena.add(sombra);

  el.appendChild(canvas);
  el.classList.add('gato3d--listo');

  const ajustar = () => {
    const w = el.clientWidth || 100;
    const h = el.clientHeight || w * 1.25;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  const observador = new ResizeObserver(ajustar);
  observador.observe(el);
  ajustar();

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(el);

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reloj = new THREE.Clock();
  const desfase = Math.random() * 10;
  let id = 0;

  function cuadro() {
    id = requestAnimationFrame(cuadro);
    if (!visible || !el.isConnected) return;
    try {
      animarCuadro();
    } catch (e) {
      // Si algo falla al animar, se vuelve al gato 2D (no se reintenta).
      console.warn('Gato 3D detenido; se usa el 2D.', e);
      instancia.destruir();
    }
  }

  function animarCuadro() {
    const t = reloj.getElapsedTime() + desfase;
    let pose = el.dataset.pose || 'quieto';
    if (el.closest('.mapa3d__gato--urgente') && el.dataset.mano !== 'quieta') pose = 'alerta';

    // Reinicio
    pivoteGato.position.set(0, 0, 0);
    pivoteGato.rotation.set(0, 0, 0);
    pivoteGato.scale.set(1, 1, 1);

    if (!reducido) {
      // Respiración (todas las poses)
      pivoteGato.scale.y = 1 + Math.sin(t * 1.6) * 0.01;

      if (pose === 'saluda') {
        // Solo la mano: el brazo sube y se mece desde el hombro.
        pivoteGato.scale.y = 1;
      } else if (pose === 'senala') {
        pivoteGato.rotation.z = 0.1 + Math.sin(t * 2) * 0.03;
        pivoteGato.rotation.y = -0.45 + Math.sin(t * 1.5) * 0.05;
      } else if (pose === 'alerta') {
        // Tranquilo y orgánico: se inclina apenas hacia adelante y respira.
        pivoteGato.rotation.z = Math.sin(t * 0.8) * 0.02;
        pivoteGato.rotation.x = 0.04;
      } else if (pose === 'feliz') {
        const c = t % 1.4;
        pivoteGato.position.y = c < 0.6 ? Math.sin((c / 0.6) * Math.PI) * 0.09 : 0;
        pivoteGato.rotation.y = Math.sin(t * 1.2) * 0.2;
      } else {
        // quieto: mirando al frente, pero vivo (cambio de peso suave).
        pivoteGato.rotation.z = Math.sin(t * 0.9) * 0.025;
        pivoteGato.rotation.y = Math.sin(t * 0.55) * 0.05;
        pivoteGato.position.y = 0;
      }

      // Brazo: saluda en la pantalla principal; en reposo, casi quieto.
      // data-mano="quieta": el brazo no se anima (p. ej. ficha del centro).
      if (brazo && el.dataset.mano !== 'quieta') {
        const anguloObjetivo =
          pose === 'saluda'
            ? -0.85 + Math.sin(t * 4.2) * 0.22
            : pose === 'alerta'
              ? -1.05 + Math.sin(t * 2.2) * 0.22 // mano arriba, moviéndose despacio
            : pose === 'feliz'
              ? -0.9
              : // quieto: la mano se mueve suave, y cada tanto hace un saludito
                Math.sin(t * 1.3) * 0.07 + (t % 9 < 1.6 ? -0.45 * Math.sin(((t % 9) / 1.6) * Math.PI) : 0);
        doblarBrazo(anguloObjetivo * 1.15);
      }
      // Cola que se mueve (no en el saludo: ahí solo se mueve la mano)
      if (cola) {
        const v = pose === 'quieto' || pose === 'alerta' ? 1.2 : 2.4;
        const a = pose === 'saluda' ? 0 : pose === 'quieto' || pose === 'alerta' ? 0.08 : 0.16;
        cola.rotation.y = Math.sin(t * v) * a;
      }
      // Parpadeo: los dos párpados bajan y suben al mismo tiempo
      const k = cierreParpado(t);
      for (const pv of parpados) {
        pv.visible = k > 0.01;
        pv.scale.y = Math.max(0.001, k);
      }
      // con los ojos casi cerrados las pupilas no asoman por el párpado
      if (grupoPupilas && parpados.length) grupoPupilas.visible = k < 0.85;
      // Mirada: las dos pupilas se mueven a la vez hacia el mismo lado
      if (grupoPupilas && pose !== 'saluda') {
        if (t > mirada.proxima) {
          const opciones = [[0, 0], [0, 0], [-1, 0], [1, 0], [0.6, 0.5], [-0.6, -0.3]];
          [mirada.objX, mirada.objY] = opciones[Math.floor(Math.random() * opciones.length)];
          mirada.proxima = t + 1.8 + Math.random() * 2.5;
        }
        mirada.x += (mirada.objX - mirada.x) * 0.12;
        mirada.y += (mirada.objY - mirada.y) * 0.12;
        // giro alrededor del centro de la cabeza (de lado y arriba/abajo)
        grupoPupilas.rotation.set(-mirada.y * 0.05, mirada.x * 0.09, 0);
      }
    }
    renderer.render(escena, camara);
  }

  const instancia = {
    el,
    destruir() {
      cancelAnimationFrame(id);
      observador.disconnect();
      io.disconnect();
      renderer.dispose();
      canvas.remove();
      el.classList.remove('gato3d--listo');
      el.classList.add('gato3d--sin3d');
      activos.delete(instancia);
    },
  };
  activos.add(instancia);
  cuadro(); // empieza a animar (después de crear la instancia)
}

/** Pone el gato 3D en todos los [data-gato3d] dentro de `raiz`. */
export function montarGatos(raiz = document) {
  const pendientes = [...raiz.querySelectorAll('[data-gato3d]:not(.gato3d--listo):not([data-gato3d-montando])')];
  pendientes.forEach((el) => {
    el.dataset.gato3dMontando = '1';
    montarUno(el)
      .catch((e) => {
        console.warn('Gato 3D no disponible; se usa el 2D.', e);
        el.classList.add('gato3d--sin3d');
      })
      .finally(() => delete el.dataset.gato3dMontando);
  });
}

/** Libera los gatos que ya no están en la página. */
export function limpiarGatos() {
  [...activos].forEach((g) => {
    if (!g.el.isConnected) g.destruir();
  });
}
