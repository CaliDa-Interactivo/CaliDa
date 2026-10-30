// ============================================================
// inicio3d.js — escena 3D de la pantalla principal: una isla
// flotante con una mesa de madera detrás del gato con todas las donaciones
// de la estantería (los mismos modelos) y varias cajas de cartón del equipo
// (cajas.glb) en el suelo. El gato 3D va encima, en su propio lienzo
// (gato3d.js), parado al frente.
// Material mate, como el resto de la página.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cargarGLB, RUTA_MODELOS } from './cargar-glb.js';
import { MODELOS_SUBCATEGORIA } from './estanteria3d.js';
import { ajustarModelo } from './ajustes-modelos.js';
import { factorEscala, resolucion } from './escala.js';

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

  // Una sola mesa larga al lado DERECHO de la isla (el gato, en otro lienzo,
  // está parado a la izquierda, en x = -0,3, z = 0,87 del mundo), de frente
  // a la cámara: encima van todas las donaciones de la estantería. Las cajas
  // van en el suelo, a la izquierda y atrás (ver más abajo).
  const MESA = { x: 0.85, z: -0.25, giro: 0.985, largo: 1.75, fondo: 0.64 };
  const mesaGrande = mesa(MESA.largo, MESA.fondo, 0.62);
  mesaGrande.position.set(MESA.x, 0, MESA.z);
  mesaGrande.rotation.y = MESA.giro;
  mundo.add(mesaGrande);
  // Sombra suave de la mesa sobre el césped, corrida hacia donde cae la
  // luz (como la del gato).
  {
    const s = sombraSuave(MESA.largo * 1.2, MESA.fondo * 1.45, 'cesped', 0.78);
    s.position.set(0.12, 0.004, -0.06);
    mesaGrande.add(s);
  }
  let id = 0;
  let destruido = false;
  const dibujar = () => {
    if (!destruido) renderer.render(escena, camara);
  };

  // Cajas del equipo (assets/modelos/cajas.glb, de cajas.blend), todas en
  // el suelo; las donaciones van sobre la mesa.
  const SOBRE_MESA = 0.655;
  const cargador = new GLTFLoader();
  // Todas las donaciones de la estantería sobre la mesa, en dos filas:
  // atrás las más altas y adelante las más bajas (así se ven todas).
  // [subcategoría, alto, fila (0 atrás, 1 adelante)]
  // Todas las donaciones de la estantería sobre la mesa, en tres filas
  // sueltas (atrás las más altas). Se acomodan de forma orgánica: cada una
  // con su espacio, un poco girada, corrida y de tamaño algo distinto
  // (azar con semilla fija: siempre quedan igual). [subcategoría, alto, fila]
  const DONACIONES = [
    ['alimento-agua', 0.36, 0],
    ['ropa-hombre', 0.3, 0],
    ['alimento-animal', 0.3, 0],
    ['ropa-mujer', 0.3, 0],
    ['aseo-bucal', 0.28, 0],
    ['alimento-bebe', 0.27, 0],
    ['construccion-herramientas', 0.26, 1],
    ['medicamentos-cronicos', 0.21, 1],
    ['ropa-ninos', 0.26, 1],
    ['aseo-limpieza-hogar', 0.14, 1],
    ['alimento-no-perecederos', 0.2, 1],
    ['aseo-corporal', 0.17, 2],
    ['medicamentos-analgesicos', 0.17, 2],
    ['construccion-proteccion', 0.17, 2],
    ['medicamentos-antibioticos', 0.17, 2],
    ['construccion-materiales', 0.16, 2],
  ];
  const FILAS_Z = [-0.2, 0.0, 0.2]; // en la mesa: atrás, medio, adelante
  const azar = (() => {
    let x = 20261031;
    return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  })();
  const entre = (a, b) => a + (b - a) * azar();
  // Reparte las donaciones (envolturas ya escaladas, apoyadas en y = 0 y
  // centradas) sobre la mesa: cada fila a lo largo, con espacios disparejos
  // y un giro distinto; luego se corre a lo largo lo que choque con la fila
  // de al lado. Todo se calcula en el marco de la mesa (x a lo largo, z a lo
  // hondo) y al final se pasa al mundo.
  function acomodarMesa(filas) {
    const largoUtil = MESA.largo - 0.12;
    const fondoFila = 0.17;
    const todos = [];
    filas.forEach((items, fila) => {
      const medidas = items.map((env) => {
        // Giro propio (la ropa y lo largo casi de frente) y su huella ya girada.
        const plana = env.userData.sub?.startsWith('ropa');
        env.rotation.set(0, plana ? entre(-0.2, 0.2) : entre(-0.55, 0.55), 0);
        env.updateMatrixWorld(true);
        let tam = new THREE.Box3().setFromObject(env, true).getSize(new THREE.Vector3());
        if (tam.x > 0.24) {
          // Lo largo (p. ej. el martillo) va casi derecho para no invadir.
          env.rotation.y *= 0.3;
          env.updateMatrixWorld(true);
          tam = new THREE.Box3().setFromObject(env, true).getSize(new THREE.Vector3());
        }
        const k = Math.min(1, (largoUtil / items.length - 0.025) / tam.x, fondoFila / tam.z) * entre(0.9, 1.03);
        env.scale.multiplyScalar(k);
        return { env, ancho: tam.x * k, fondo: tam.z * k, fila };
      });
      const libre = Math.max(0, largoUtil - medidas.reduce((a, m) => a + m.ancho, 0));
      const pesos = Array.from({ length: medidas.length + 1 }, () => entre(0.4, 1.6));
      const sumaPesos = pesos.reduce((a, b) => a + b, 0);
      let x = -largoUtil / 2 + (libre * pesos[0]) / sumaPesos;
      medidas.forEach((m, i) => {
        m.x = x + m.ancho / 2;
        x += m.ancho + (libre * pesos[i + 1]) / sumaPesos;
        m.z = FILAS_Z[fila] + entre(-0.02, 0.02);
        todos.push(m);
      });
    });
    // Lo que choca con la fila de al lado se corre a lo largo de la mesa.
    const choca = (a, b) =>
      Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 + 0.01 && Math.abs(a.z - b.z) < (a.fondo + b.fondo) / 2 + 0.005;
    for (let vuelta = 0; vuelta < 30; vuelta++) {
      let hubo = false;
      for (const a of todos) {
        for (const b of todos) {
          if (a === b || a.fila === b.fila || !choca(a, b)) continue;
          hubo = true;
          const mover = a.fila > b.fila ? a : b; // se mueve el de adelante
          const otro = mover === a ? b : a;
          const paso = (mover.ancho + otro.ancho) / 2 + 0.012 - Math.abs(mover.x - otro.x);
          mover.x += (mover.x >= otro.x ? 1 : -1) * paso;
          const lim = largoUtil / 2 - mover.ancho / 2;
          mover.x = Math.max(-lim, Math.min(lim, mover.x));
        }
      }
      if (!hubo) break;
    }
    for (const m of todos) {
      const p = new THREE.Vector3(m.x, SOBRE_MESA, m.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), MESA.giro);
      m.env.position.set(MESA.x + p.x, p.y, MESA.z + p.z);
      m.env.rotation.y += MESA.giro;
    }
  }

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

  // Varias cajas en el suelo: adelante, a los lados del gato y frente a la
  // mesa, y un par atrás (la mesa va a la derecha).
  const listasCajas = cargarGLB(cargador, MODELO_CAJAS).then(({ scene: modelo }) => {
    if (destruido) return null;
    modelo.updateMatrixWorld(true);
    const cajas = [
      [['Caja_Botiquin'], 0.55, [0.95, 1.05], 0.3],
      [['Caja_Derecha'], 0.46, [0.2, 1.5], -0.4],
      [['Caja_Frontal'], 0.44, [-1.05, 1.1], -0.2],
      [['Caja_Base', 'Caja_Arriba'], 0.5, [-0.6, -1.15], 0.2],
      [['Caja_Base'], 0.52, [-1.35, -0.4], -0.5],
    ].map(([nombres, ancho, [x, z], giro]) => {
      const caja = cajaDelModelo(modelo, nombres, ancho);
      caja.position.set(x, 0, z);
      caja.rotation.y = giro;
      // Sombra suave sobre el césped, como la del gato.
      const s = sombraSuave(ancho * 1.45, ancho * 1.25, 'cesped');
      s.position.set(0.06, 0.004, -0.04);
      caja.add(s);
      return caja;
    });
    mundo.add(...cajas);
    dibujar();
    return true;
  });

  // Donaciones: los modelos de la estantería, todos sobre la mesa.
  // Se cargan uno por uno, dejando respirar al navegador entre cada uno
  // (todos a la vez trababan la portada).
  const respiro = () =>
    new Promise((ok) => (window.requestIdleCallback ?? ((f) => setTimeout(f, 16)))(ok, { timeout: 300 }));
  listasCajas.then(async (listas) => {
    if (!listas || destruido) return;
    const filas = [[], [], []];
    for (const [sub, alto, fila] of DONACIONES) {
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
        envoltura.userData.sub = sub;
        filas[fila].push(envoltura);
        envoltura.traverse((n) => {
          if (n.isMesh) {
            n.castShadow = true;
            (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
              if ('metalness' in m) m.metalness = Math.min(m.metalness, 0.1);
            });
          }
        });
      })
      .catch(() => {});
    }
    if (destruido) return;
    // Con todas cargadas se reparten en la mesa (cada fila según los anchos
    // reales de lo que lleva) y aparecen juntas.
    acomodarMesa(filas);
    filas.forEach((items) => mundo.add(...items));
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
