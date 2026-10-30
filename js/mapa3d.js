// ============================================================
// mapa3d.js — mapa ilustrado de Cali en three.js (D4).
// Solo dibuja y anima: no lee el store ni conoce el router.
// La vista donante/mapa.js le pasa los centros y recibe los
// eventos (clic en un centro, cambio de zona) por callbacks.
//
// Interacción principal (causa → efecto):
//   1. Todos los centros aparecen en gris sobre el mapa.
//   2. El mapa "reacciona" a la subcategoría elegida: los centros
//      que la necesitan se colorean y crecen; los demás se hunden.
//   3. Tocar una zona (o su botón) enfoca la cámara en ella y
//      atenúa las otras. Tocarla de nuevo vuelve a toda Cali.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { cargarGLB, MODELO_CASA, estilizarCasa, RUTA_MODELOS } from './cargar-glb.js';

// Escena del equipo (escena_mapa.blend), exportada con compresión Draco.
const MODELO_CERROS = `${RUTA_MODELOS}cali_montanas.glb`;
const MODELO_TORRE = `${RUTA_MODELOS}torre_cali.glb`;

// --- Paleta del mapa (derivada de la paleta CaliDa) -----------------

const COLORES = {
  // Tonos cobrizos y cafés de la paleta, distintos entre sí para que se
  // diferencien las zonas (las casas, roja y amarilla, resaltan encima).
  zonas: {
    Norte: '#C8754A', // cobre
    Occidente: '#E4B585', // arena tostada
    Centro: '#A0522D', // siena
    Oriente: '#D99055', // ámbar cobrizo
    Sur: '#8B5E3C', // café
  },
  zonaAtenuada: '#ECE6DC',
  base: '#F3E9D8',
  // Colinas y pinos estilo ilustración plana (paleta: salvia y verde bosque).
  colina: ['#9CC78A', '#86B874', '#B3D49F', '#79AE68'],
  pino: ['#3F7F3A', '#4F9145', '#2F6A2D'],
  tronco: '#A7835C',
  pared: '#FFF8EE',
  puerta: '#7A5A3C',
  // Estados de la paleta oficial: "se necesita" verde bosque, urgente carmín.
  techoNeutro: '#D9D0C1',
  techoDesabastecido: '#F2C14E', // amarillo: desabastecido
  techoUrgente: '#CC0100',
};

// --- Geografía de Cali -----------------------------------------------
// Contornos de las 5 zonas trazados sobre el mapa oficial de zonas de
// Cali (imagen de referencia del equipo, 4024 × 5212 px). El "Centro
// histórico y comercial" y el "Centro geográfico" se unieron en una
// sola zona: Centro. Coordenadas en píxeles de esa imagen.

const POLIGONOS_PX = {
  Norte: [
    2967,230, 2893,232, 2858,323, 2826,327, 2813,417, 2523,543, 2544,550, 2544,591, 2506,598, 2498,624, 2457,624, 2155,522,
    2108,479, 2107,461, 2033,437, 2000,442, 2002,638, 1977,643, 1963,675, 1923,675, 1921,631, 1867,615, 1845,565, 1819,581,
    1815,686, 1890,773, 1940,805, 1940,846, 1924,857, 1973,885, 1974,942, 1945,1010, 1897,1038, 1916,1120, 1880,1150, 1872,1206,
    1790,1351, 1762,1450, 1740,1455, 1695,1577, 1693,1627, 1672,1652, 1740,1658, 1826,1600, 1893,1579, 1936,1521, 2160,1415, 2202,1416,
    2243,1562, 2277,1585, 2323,1536, 3374,1204, 3357,1175, 3359,1070, 3293,987, 3279,901, 3222,840, 3159,624, 3159,572, 3183,569,
    3171,516, 3122,448, 2970,367,
  ],
  Occidente: [
    379,1243, 362,1276, 443,1352, 444,1385, 486,1405, 533,1472, 515,1571, 524,1591, 589,1587, 635,1625, 669,1689, 802,1690,
    825,1705, 894,1694, 927,1712, 1041,1691, 1056,1724, 1082,1709, 1243,1694, 1244,1747, 1209,1755, 1205,1776, 1235,1780, 1241,1802,
    1261,1806, 1298,1878, 1375,1940, 1423,1959, 1421,2008, 1373,2009, 1358,2032, 1297,2059, 1321,2063, 1321,2103, 1292,2173, 1296,2238,
    1249,2241, 1208,2329, 1179,2332, 1176,2346, 1111,2335, 1054,2364, 1041,2387, 1018,2388, 1009,2409, 987,2410, 999,2497, 980,2518,
    996,2569, 1055,2591, 1058,2659, 1008,2668, 1023,2712, 1016,2772, 1037,2795, 1071,2798, 1099,2730, 1204,2711, 1220,2741, 1218,2804,
    1255,2818, 1222,3107, 1173,3104, 1126,3122, 1130,3228, 1098,3242, 1098,3274, 1076,3282, 1104,3334, 1127,3347, 1127,3447, 1152,3468,
    1152,3509, 1130,3530, 1134,3554, 1159,3570, 1159,3611, 1130,3620, 1123,3748, 1155,3782, 1186,3783, 1187,3820, 1218,3839, 1318,3835,
    1404,3865, 1455,3767, 1584,3733, 1559,3715, 1559,3675, 1628,3629, 1577,3409, 1523,3063, 1473,2476, 1542,2281, 1602,2165, 1778,1929,
    1783,1776, 1746,1659, 1678,1657, 1677,1636, 1655,1623, 1666,1575, 1654,1529, 1587,1532, 1550,1500, 1495,1492, 1419,1408, 1362,1395,
    1357,1412, 1315,1412, 1312,1381, 1268,1381, 1229,1332, 1145,1330, 1128,1394, 1055,1486, 1011,1496, 1010,1514, 967,1514, 958,1499,
    953,1514, 835,1512, 827,1463, 769,1464, 747,1417, 685,1429, 669,1415, 595,1466, 555,1466, 545,1422, 498,1395, 472,1343,
    442,1326,
  ],
  Centro: [
    3151,1277, 2322,1538, 2291,1579, 2251,1579, 2193,1399, 1937,1522, 1895,1578, 1805,1612, 1746,1656, 1783,1767, 1780,1928, 1619,2138,
    1545,2276, 1474,2472, 1478,2619, 1479,2595, 1520,2595, 1655,2696, 2086,2836, 2153,2843, 2154,2865, 2160,2834, 2766,2255, 3183,1455,
    3187,1389,
  ],
  Oriente: [
    3402,1198, 3153,1277, 3189,1391, 3184,1457, 2767,2256, 2151,2844, 2162,2894, 2238,2995, 2362,3110, 2455,3232, 2480,3292, 2525,3279,
    2617,3194, 2771,2925, 2913,2820, 2979,2740, 3172,2635, 3190,2596, 3235,2597, 3269,2630, 3281,2770, 3363,2832, 3348,2906, 3405,3001,
    3448,2961, 3574,2966, 3597,2987, 3575,2884, 3630,2803, 3602,2725, 3603,2680, 3645,2584, 3707,2536, 3718,2419, 3758,2281, 3717,2085,
    3698,2054, 3552,1929, 3440,1940, 3374,1858, 3388,1750, 3381,1586, 3341,1374, 3424,1262,
  ],
  Sur: [
    1475,2582, 1522,2928, 1525,3064, 1623,3637, 1589,3644, 1558,3676, 1556,3745, 1481,3742, 1456,3765, 1621,3972, 1622,4015, 1578,4055,
    1575,4125, 1513,4163, 1514,4216, 1461,4291, 1387,4500, 1428,4598, 1429,4670, 1399,4730, 1422,4768, 1882,4735, 1879,4867, 1828,5018,
    1926,5011, 1969,5041, 2149,5069, 2148,5142, 2406,5122, 2404,4953, 2723,4953, 2731,4166, 2716,3991, 2589,3604, 2589,3543, 2627,3502,
    2508,3377, 2453,3231, 2344,3089, 2229,2985, 2162,2896, 2149,2844, 2086,2838, 1653,2697, 1546,2608,
  ],
};

// Punto donde va el nombre de cada zona (y adonde viaja la cámara).
const ETIQUETAS_PX = {Norte: [2673, 931], Centro: [2220, 2148], Oriente: [3222, 2220], Occidente: [1229, 2482], Sur: [2124, 4201]};

// Puestos de respaldo para las casitas: si las coordenadas de un centro
// no caen bien dentro de su zona en este mapa esquemático, se usa el
// siguiente puesto libre de su zona (bien adentro y separados entre sí).
const PUESTOS_PX = {
  Norte: [[2432, 1150], [2992, 1030], [2192, 790], [2952, 590], [1992, 1310], [2722, 830]],
  Occidente: [[1482, 1763], [1362, 3403], [1442, 2173], [1382, 3073], [1232, 1543]],
  Centro: [[2634, 1797], [2074, 2437], [2074, 1877], [2514, 2237], [2954, 1517], [1634, 2477]],
  Oriente: [[2911, 2478], [3431, 2438], [2511, 2878], [3191, 1918], [3501, 2098], [3261, 1588]],
  Sur: [[2387, 4622], [2387, 4022], [2227, 3622], [1987, 3262], [1947, 3942], [1867, 4382]],
};

// Píxeles de la imagen → plano del mapa 3D (x hacia el oriente, z hacia el sur).
const PX_CENTRO = { x: 2060, y: 2686 };
const PX_ESCALA = 15.5 / 4912; // la ciudad mide ~15.5 unidades de norte a sur

function pxAPlano([px, py]) {
  return { x: (px - PX_CENTRO.x) * PX_ESCALA, z: (py - PX_CENTRO.y) * PX_ESCALA };
}

function aPares(lista) {
  const pares = [];
  for (let i = 0; i < lista.length; i += 2) pares.push([lista[i], lista[i + 1]]);
  return pares;
}

const ZONAS_PLANO = Object.fromEntries(
  Object.entries(POLIGONOS_PX).map(([zona, lista]) => [zona, aPares(lista).map(pxAPlano)])
);

// Georreferencia aproximada de la imagen: lat/lng → píxel.
// Extremos del área urbana: norte 3.497, sur 3.335, oeste -76.577, este -76.462.
const GEO = { latN: 3.497, latS: 3.335, lngO: -76.577, lngE: -76.462, x0: 362, y0: 230, x1: 3758, y1: 5142 };

// Inversa de proyectar(): punto del plano → { lat, lng }.
function desproyectar({ x, z }) {
  const px = x / PX_ESCALA + PX_CENTRO.x;
  const py = z / PX_ESCALA + PX_CENTRO.y;
  return {
    lng: GEO.lngO + ((px - GEO.x0) / (GEO.x1 - GEO.x0)) * (GEO.lngE - GEO.lngO),
    lat: GEO.latN - ((py - GEO.y0) / (GEO.y1 - GEO.y0)) * (GEO.latN - GEO.latS),
  };
}

function proyectar([lng, lat]) {
  const px = GEO.x0 + ((lng - GEO.lngO) / (GEO.lngE - GEO.lngO)) * (GEO.x1 - GEO.x0);
  const py = GEO.y0 + ((GEO.latN - lat) / (GEO.latN - GEO.latS)) * (GEO.y1 - GEO.y0);
  return pxAPlano([px, py]);
}


// --- Medidas de la escena -------------------------------------------

const ALTO_ZONA = 0.5;
const BISEL = 0.1;
const Y_SUPERFICIE = ALTO_ZONA + 2 * BISEL; // donde se apoyan las casitas

// --- Utilidades geométricas -------------------------------------------

function puntoEnPoligono(x, z, puntos) {
  let dentro = false;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const a = puntos[i];
    const b = puntos[j];
    const cruza = a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

// Distancia de un punto al borde del polígono (para dejar margen).
function distanciaAlBorde(x, z, puntos) {
  let minimo = Infinity;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const a = puntos[j];
    const b = puntos[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    minimo = Math.min(minimo, Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)));
  }
  return minimo;
}

function dentroConMargen(x, z, puntos, margen) {
  return puntoEnPoligono(x, z, puntos) && distanciaAlBorde(x, z, puntos) > margen;
}

// Aleatorio con semilla: los árboles quedan siempre en el mismo sitio.
function crearAleatorio(semilla) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Factor de suavizado independiente de los FPS.
function suavizar(velocidad, dt) {
  return 1 - Math.exp(-velocidad * dt);
}

// ======================================================================
// API pública
// ======================================================================

/**
 * Monta el mapa 3D dentro de `lienzo`.
 * @param {object} opciones
 * @param {HTMLElement} opciones.lienzo        contenedor del <canvas>
 * @param {HTMLElement} opciones.capaEtiquetas capa HTML para nombres de zonas
 * @param {HTMLElement} opciones.tooltip       globo con el nombre del centro
 * @param {Array} opciones.centros             todos los centros (store)
 * @param {Object} opciones.necesidades        { centroId: 'urgente'|'desabastecido' }
 * @param {string|null} opciones.zonaInicial
 * @param {boolean} opciones.movimientoReducido
 * @param {Function} opciones.alClicCentro     (centroId) => void
 * @param {Function} opciones.alCambiarZona    (zona|null) => void
 * @param {Function} opciones.alTerminarFiltro () => void
 * @param {Function} opciones.alResaltarCentro (centroId|null) => void
 */
export function montarMapa3D(opciones) {
  const {
    lienzo,
    capaEtiquetas,
    tooltip,
    centros,
    necesidades,
    zonaInicial = null,
    movimientoReducido = false,
    alClicCentro = () => {},
    alCambiarZona = () => {},
    alTerminarFiltro = () => {},
    alResaltarCentro = () => {},
  } = opciones;

  let destruido = false;
  const desechables = []; // geometrías y materiales a liberar en destruir()
  const registrar = (obj) => (desechables.push(obj), obj);

  // --- Renderizador, escena, cámara ------------------------------------

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  lienzo.appendChild(renderer.domElement);
  renderer.domElement.classList.add('mapa3d__canvas');

  const escena = new THREE.Scene();
  // Vista cenital (oct 2026): cámara ortográfica que mira derecho hacia
  // abajo, sin perspectiva, con el norte arriba. `vista` es lo que se ve
  // (centro en el suelo y medio alto en unidades del mundo); se anima
  // hacia `vistaObjetivo` al elegir una zona.
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camara.up.set(0, 0, -1);
  // 0 sería cenital puro; con 20° el mapa se sigue leyendo desde arriba,
  // pero se notan los detalles de los lugares en 3D.
  const INCLINACION = THREE.MathUtils.degToRad(20);
  // Las casas y el pin se inclinan hacia la cámara para verse de frente,
  // pero no del todo: con 28° se sigue viendo el techo (su color dice si
  // el centro está urgente o desabastecido).
  const VER_TECHO = THREE.MathUtils.degToRad(28);
  const vista = { cx: 0, cz: 0, mitad: 10 };
  let vistaObjetivo = null;
  const puntosLugares = []; // cimas de torre, cruces y Cristo Rey: entran en el encuadre
  let pinUsuario = null; // "Tú estás aquí" (marcarUsuario)
  let pinFuera = false;

  escena.add(new THREE.HemisphereLight('#FFF6E8', '#C9B79C', 1.6));
  const sol = new THREE.DirectionalLight('#FFFFFF', 2.2);
  sol.position.set(-11, 10, 7);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.radius = 6;
  sol.shadow.bias = -0.0005;
  Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
  sol.shadow.camera.updateProjectionMatrix();
  escena.add(sol);

  // El mapa no tiene gestos: la persona no arrastra ni acerca; la cámara
  // solo se mueve sola al elegir una zona.
  function aplicarVista() {
    const { clientWidth: ancho, clientHeight: alto } = lienzo;
    const aspecto = ancho && alto ? ancho / alto : 1;
    camara.left = -vista.mitad * aspecto;
    camara.right = vista.mitad * aspecto;
    camara.top = vista.mitad;
    camara.bottom = -vista.mitad;
    // Casi cenital: inclinada INCLINACION desde el sur, para que se vean
    // los costados de la torre, las cruces y el Cristo Rey (sin perspectiva).
    camara.position.set(vista.cx, 40 * Math.cos(INCLINACION), vista.cz + 40 * Math.sin(INCLINACION));
    camara.lookAt(vista.cx, 0, vista.cz);
    camara.updateProjectionMatrix();
    camara.updateMatrixWorld(true);
  }

  // --- Base, río y montañas (decoración) ---------------------------------

  const formaBase = new THREE.Shape();
  {
    const [x0, x1, z0, z1, r] = [-7.8, 6.9, -9.0, 9.0, 1.6];
    formaBase.moveTo(x0 + r, z0);
    formaBase.lineTo(x1 - r, z0);
    formaBase.quadraticCurveTo(x1, z0, x1, z0 + r);
    formaBase.lineTo(x1, z1 - r);
    formaBase.quadraticCurveTo(x1, z1, x1 - r, z1);
    formaBase.lineTo(x0 + r, z1);
    formaBase.quadraticCurveTo(x0, z1, x0, z1 - r);
    formaBase.lineTo(x0, z0 + r);
    formaBase.quadraticCurveTo(x0, z0, x0 + r, z0);
  }
  const base = new THREE.Mesh(
    registrar(new THREE.ExtrudeGeometry(formaBase, { depth: 0.4, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.15, bevelSegments: 4 })),
    registrar(new THREE.MeshStandardMaterial({ color: COLORES.base, roughness: 0.95 }))
  );
  // La forma se dibuja en (x, z) y se acuesta sobre el suelo.
  base.rotation.x = Math.PI / 2;
  base.position.y = -0.17; // su cara superior queda justo bajo el suelo (y ≈ 0)
  base.receiveShadow = true;
  // Sin el plano de base visible: el mapa flota sobre el fondo. Se deja
  // invisible solo para "Marcar dónde estoy" (detectar el toque).
  base.material.visible = false;
  escena.add(base);

  // Plano que solo recibe sombras: la ciudad y las colinas proyectan una
  // sombra suave sobre la superficie donde están, sin mostrar una base.
  const planoSombra = new THREE.Mesh(
    registrar(new THREE.PlaneGeometry(40, 40)),
    registrar(new THREE.ShadowMaterial({ color: '#011E41', opacity: 0.32 }))
  );
  planoSombra.rotation.x = -Math.PI / 2;
  planoSombra.position.y = -0.03;
  planoSombra.receiveShadow = true;
  planoSombra.raycast = () => {}; // no interfiere con los toques
  escena.add(planoSombra);


  // --- Río Cauca -----------------------------------------------------------
  // Corre de sur a norte por el oriente de la ciudad (Navarro, Juanchito,
  // Paso del Comercio): baja desde Jamundí (suroccidente), bordea Cali por
  // fuera de las zonas y sigue hacia Yumbo (noroccidente). Detalles, todo
  // mate como el resto del mapa: meandros suaves, playa de arena en las
  // orillas, agua con borde más oscuro, reflejos claros al centro, bancos
  // de arena en las curvas y arbolitos en las orillas.
  const puntosRio = []; // entran en el encuadre de "Toda Cali"
  {
    // x más al oriente de las zonas a la altura z (para no pisar la ciudad)
    const bordeOriente = (z) => {
      let max = -Infinity;
      for (const pts of Object.values(ZONAS_PLANO)) {
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          if ((a.z - z) * (b.z - z) > 0 || a.z === b.z) continue;
          max = Math.max(max, a.x + ((z - a.z) / (b.z - a.z)) * (b.x - a.x));
        }
      }
      return max;
    };
    // Puntos reales del río (proyectados) y, donde la ciudad está, por fuera.
    const curso = [
      [-76.513, 3.27], [-76.505, 3.3], [-76.49, 3.33], [-76.478, 3.35], [-76.47, 3.37], [-76.468, 3.39],
      [-76.466, 3.42], [-76.468, 3.445], [-76.472, 3.46], [-76.478, 3.47], [-76.482, 3.485], [-76.486, 3.5],
      [-76.49, 3.52], [-76.495, 3.54], [-76.5, 3.57],
    ].map(([lng, lat]) => {
      const p = proyectar([lng, lat]);
      const borde = bordeOriente(p.z);
      return new THREE.Vector3(Number.isFinite(borde) ? Math.max(p.x, borde + 0.75) : p.x, 0, p.z);
    });
    const base = new THREE.CatmullRomCurve3(curso, false, 'centripetal');
    // Meandros: una onda suave hacia los lados, sin acercarse a la ciudad.
    const n = 320;
    const centro = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const p = base.getPointAt(u);
      const tg = base.getTangentAt(u);
      const lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
      const onda = Math.sin(u * Math.PI * 9) * 0.22 + Math.sin(u * Math.PI * 23 + 1.3) * 0.06;
      const q = p.clone().addScaledVector(lado, onda);
      const borde = bordeOriente(q.z);
      if (Number.isFinite(borde)) q.x = Math.max(q.x, borde + 0.55);
      centro.push(q);
    }
    const curva = new THREE.CatmullRomCurve3(centro, false, 'centripetal');
    for (let i = 0; i <= 24; i++) {
      const p = curva.getPointAt(i / 24);
      if (Math.abs(p.z) < 7.5) puntosRio.push({ x: p.x, z: p.z, y: 0 }); // solo el tramo junto a la ciudad
    }
    const anchoEn = (u) => 0.85 + 0.15 * Math.sin(u * Math.PI * 5 + 0.7); // varía despacio
    const cinta = (ancho, y, color, { desde = 0, hasta = 1 } = {}) => {
      const m = 260;
      const pos = [];
      const idx = [];
      for (let i = 0; i <= m; i++) {
        const u = desde + ((hasta - desde) * i) / m;
        const p = curva.getPointAt(u);
        const tg = curva.getTangentAt(u);
        const nx = -tg.z;
        const nz = tg.x;
        const l = Math.hypot(nx, nz) || 1;
        // más angosto en las puntas y con ancho que cambia a lo largo
        const a = (ancho / 2) * anchoEn(u) * (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.15)));
        pos.push(p.x + (nx / l) * a, y, p.z + (nz / l) * a, p.x - (nx / l) * a, y, p.z - (nz / l) * a);
        if (i < m) idx.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
      }
      const geo = registrar(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const malla = new THREE.Mesh(geo, registrar(new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide })));
      malla.receiveShadow = true;
      malla.raycast = () => {};
      escena.add(malla);
    };
    cinta(0.98, 0.006, '#E4D3A8'); // playa de arena
    cinta(0.66, 0.012, '#6FA6C2'); // orilla del agua
    cinta(0.48, 0.018, '#93C6DC'); // agua
    // reflejos claros, en tramos
    for (const [d, h] of [[0.06, 0.13], [0.2, 0.27], [0.34, 0.4], [0.5, 0.57], [0.66, 0.72], [0.8, 0.87]]) {
      cinta(0.09, 0.024, '#C4E3F0', { desde: d, hasta: h });
    }

    // Bancos de arena en algunas curvas (óvalos aplanados a un lado).
    const matArena = registrar(new THREE.MeshStandardMaterial({ color: '#E8D8AE', roughness: 0.95 }));
    const geoBanco = registrar(new THREE.SphereGeometry(1, 20, 8));
    for (const u of [0.17, 0.43, 0.61, 0.78]) {
      const p = curva.getPointAt(u);
      const tg = curva.getTangentAt(u);
      const lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
      const banco = new THREE.Mesh(geoBanco, matArena);
      banco.scale.set(0.09, 0.012, 0.32);
      banco.position.copy(p).addScaledVector(lado, 0.1 * (u > 0.5 ? 1 : -1)).setY(0.022);
      banco.rotation.y = Math.atan2(tg.x, tg.z);
      banco.raycast = () => {};
      escena.add(banco);
    }

    // Arbolitos en las orillas (copas redondas, como los del cerro).
    const matsArbol = ['#468550', '#5E9A56', '#7AA255'].map((c) => registrar(new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })));
    const geoCopa = registrar(new THREE.SphereGeometry(1, 14, 10));
    const aleatorioRio = crearAleatorio(20261030);
    for (let i = 0; i < 26; i++) {
      const u = 0.04 + (i / 26) * 0.92 + (aleatorioRio() - 0.5) * 0.02;
      const p = curva.getPointAt(u);
      const tg = curva.getTangentAt(u);
      const lado = new THREE.Vector3(-tg.z, 0, tg.x).normalize();
      const s = i % 2 ? 1 : -1;
      const q = p.clone().addScaledVector(lado, s * (0.62 + aleatorioRio() * 0.25));
      const borde = bordeOriente(q.z);
      if (Number.isFinite(borde) && q.x < borde + 0.25) continue; // no sobre la ciudad
      const r = 0.12 + aleatorioRio() * 0.08;
      const copa = new THREE.Mesh(geoCopa, matsArbol[i % matsArbol.length]);
      copa.scale.set(r, r * 0.85, r);
      copa.position.set(q.x, r * 0.8, q.z);
      copa.castShadow = true;
      copa.raycast = () => {};
      escena.add(copa);
    }
  }

  // --- Geografía de Cali (escena_mapa.blend del equipo) -------------------
  // Cordillera occidental (Farallones) con el Cristo Rey y las Tres Cruces
  // sobre los cerros, y la Torre de Cali en el centro de la ciudad. Ver
  // cargarGeografia() más abajo.

  // --- Zonas -------------------------------------------------------------

  const zonas = new Map(); // nombre → { malla, material, puntos, centro, etiqueta, ... }

  for (const [nombre, puntos] of Object.entries(ZONAS_PLANO)) {
    const forma = new THREE.Shape(puntos.map((p) => new THREE.Vector2(p.x, p.z)));
    const geometria = registrar(
      new THREE.ExtrudeGeometry(forma, {
        depth: ALTO_ZONA,
        bevelEnabled: true,
        bevelThickness: BISEL,
        bevelSize: 0.05,
        bevelOffset: -0.08, // hunde el borde: deja una ranura entre zonas
        bevelSegments: 3,
      })
    );
    // Shape en (x, z) → acostada: la extrusión apunta hacia arriba (+y).
    geometria.rotateX(Math.PI / 2);
    geometria.translate(0, ALTO_ZONA + BISEL, 0); // queda entre y = 0 y y = Y_SUPERFICIE

    const colorBase = new THREE.Color(COLORES.zonas[nombre]);
    const material = registrar(new THREE.MeshStandardMaterial({ color: colorBase.clone(), roughness: 0.85 }));
    const malla = new THREE.Mesh(geometria, material);
    malla.position.y = 0;
    // La ciudad no proyecta sombra sobre el suelo (se veía como una mancha
    // oscura alrededor de Cali); solo recibe la de las casas.
    malla.castShadow = false;
    malla.receiveShadow = true;
    malla.userData.zona = nombre;
    escena.add(malla);

    const etiqueta = document.createElement('span');
    etiqueta.className = 'mapa3d__etiqueta-zona';
    etiqueta.textContent = nombre;
    capaEtiquetas.appendChild(etiqueta);

    zonas.set(nombre, {
      malla,
      material,
      colorBase,
      puntos,
      centro: pxAPlano(ETIQUETAS_PX[nombre]),
      etiqueta,
      yObjetivo: 0,
      colorObjetivo: colorBase.clone(),
      hover: false,
    });
  }

  // Árboles decorativos dentro de cada zona (lejos de las casitas).
  const usadosPorZona = {};
  const posicionesCentros = centros.map((c) => ubicarCentro(c, usadosPorZona));
  // Separa casitas demasiado cercanas para que no se encimen.
  for (let pasada = 0; pasada < 4; pasada++) {
    for (let i = 0; i < posicionesCentros.length; i++) {
      for (let j = i + 1; j < posicionesCentros.length; j++) {
        const a = posicionesCentros[i];
        const b = posicionesCentros[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz) || 0.01;
        if (d < 0.85) {
          const empuje = (0.85 - d) / 2;
          a.x -= (dx / d) * empuje;
          a.z -= (dz / d) * empuje;
          b.x += (dx / d) * empuje;
          b.z += (dz / d) * empuje;
        }
      }
    }
  }
  // (Sin árboles sobre las zonas de la ciudad.)

  // Ubica un centro sobre el mapa con sus coordenadas reales. Si en este
  // mapa esquemático no caen bien adentro de su zona, toma el siguiente
  // puesto libre de la zona (PUESTOS_PX).
  function ubicarCentro(centro, usados) {
    const zona = ZONAS_PLANO[centro.zona] ? centro.zona : 'Centro';
    const p = proyectar([centro.lng, centro.lat]);
    if (dentroConMargen(p.x, p.z, ZONAS_PLANO[zona], 0.4)) return p;
    const puestos = PUESTOS_PX[zona];
    const i = usados[zona] ?? 0;
    usados[zona] = i + 1;
    if (i < puestos.length) return pxAPlano(puestos[i]);
    // Más centros que puestos: alrededor del nombre de la zona.
    const base = pxAPlano(ETIQUETAS_PX[zona]);
    const angulo = i * 2.4;
    return { x: base.x + Math.cos(angulo) * 0.6, z: base.z + 0.5 + Math.sin(angulo) * 0.6 };
  }

  // --- Casitas (centros de acopio) -----------------------------------------

  const geoPared = registrar(new THREE.BoxGeometry(0.5, 0.4, 0.5));
  const geoTecho = registrar(new THREE.ConeGeometry(0.46, 0.36, 4));
  const geoPuerta = registrar(new THREE.BoxGeometry(0.14, 0.2, 0.02));
  const geoAnillo = registrar(new THREE.RingGeometry(0.42, 0.56, 40));
  const matPared = registrar(new THREE.MeshStandardMaterial({ color: COLORES.pared, roughness: 0.8 }));
  const matPuerta = registrar(new THREE.MeshStandardMaterial({ color: COLORES.puerta, roughness: 0.8 }));

  const casas = centros.map((centro, i) => {
    const estado = necesidades[centro.id] ?? null;
    const grupo = new THREE.Group();

    const pared = new THREE.Mesh(geoPared, matPared);
    pared.position.y = 0.2;
    pared.castShadow = true;

    const colorInicial = estado === 'urgente' ? COLORES.techoUrgente : estado ? COLORES.techoDesabastecido : COLORES.techoNeutro;
    const matTecho = registrar(new THREE.MeshStandardMaterial({ color: colorInicial, roughness: 0.7 }));
    const techo = new THREE.Mesh(geoTecho, matTecho);
    techo.position.y = 0.58;
    techo.rotation.y = Math.PI / 4;
    techo.castShadow = true;

    const puerta = new THREE.Mesh(geoPuerta, matPuerta);
    puerta.position.set(0, 0.1, 0.26);

    // Anillo que late bajo los centros urgentes.
    const matAnillo = registrar(
      new THREE.MeshBasicMaterial({ color: COLORES.techoUrgente, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    const anillo = new THREE.Mesh(geoAnillo, matAnillo);
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.y = 0.02;

    // La casa se ve de frente (como un dibujo), no desde arriba: la figura
    // se inclina hacia la cámara; el anillo sigue plano en el suelo.
    const figura = new THREE.Group();
    figura.rotation.x = -(Math.PI / 2 - INCLINACION) + VER_TECHO;
    figura.add(pared, techo, puerta);
    grupo.add(figura, anillo);
    // Mientras cargan los modelos se ve una casita simple; luego se cambia
    // por casa_roja.glb (urgente) o casa_amarilla.glb (desabastecido).
    const provisional = [pared, techo, puerta];
    const p = posicionesCentros[i];
    grupo.position.set(p.x, Y_SUPERFICIE, p.z);
    grupo.scale.setScalar(movimientoReducido ? 1 : 0.001);
    grupo.userData.centroId = centro.id;
    escena.add(grupo);

    return {
      centro,
      estado,
      grupo,
      figura,
      provisional,
      matTecho,
      matAnillo,
      anillo,
      escalaObjetivo: 1,
      elevacion: 0,
      elevacionObjetivo: 0,
      colorObjetivo: new THREE.Color(colorInicial),
      retrasoEntrada: movimientoReducido ? 0 : 0.05 * i,
    };
  });

  // --- Casas 3D del equipo (roja = urgente, amarilla = desabastecido) ---
  const ALTO_CASA = 1.2; // un poco más grandes (oct 2026)
  const cargadorCasas = new GLTFLoader();
  for (const estado of ['urgente', 'desabastecido']) {
    const conEsteEstado = casas.filter((c) => c.estado === estado);
    if (!conEsteEstado.length) continue;
    cargarGLB(cargadorCasas, MODELO_CASA[estado])
      .then((gltf) => {
        const modelo = estilizarCasa(gltf.scene, estado);
        modelo.updateMatrixWorld(true);
        const caja = new THREE.Box3().setFromObject(modelo);
        const tam = caja.getSize(new THREE.Vector3());
        const centro = caja.getCenter(new THREE.Vector3());
        const escala = ALTO_CASA / tam.y;
        modelo.scale.setScalar(escala);
        modelo.position.set(-centro.x * escala, -caja.min.y * escala, -centro.z * escala);
        modelo.traverse((n) => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
            desechables.push(n.geometry);
            (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => desechables.push(m));
          }
        });
        const molde = new THREE.Group();
        molde.add(modelo);
        // De frente (antes: tres cuartos).
        conEsteEstado.forEach((casa) => {
          const copia = molde.clone(true);
          casa.figura.add(copia);
          casa.provisional.forEach((m) => (m.visible = false));
        });
      })
      .catch((e) => console.warn('Se usan casas simples:', e));
  }

  // --- Estado de la interacción ------------------------------------------

  // Se entra directo al mapa filtrado: solo aparecen (crecen) las casitas
  // de los centros que necesitan la subcategoría; nunca se ven en gris.
  let fase = 'filtrado';
  let zonaSeleccionada = null;
  let centroResaltado = null;
  let zonaHover = null;
  let tiempo = 0;

  const colorAtenuado = new THREE.Color(COLORES.zonaAtenuada);

  function aplicarObjetivos() {
    for (const [nombre, zona] of zonas) {
      const activa = !zonaSeleccionada || zonaSeleccionada === nombre;
      zona.colorObjetivo.copy(activa ? zona.colorBase : colorAtenuado);
      if (zona.hover && activa) zona.colorObjetivo.copy(zona.colorBase).offsetHSL(0, 0.05, 0.05);
      zona.yObjetivo = zonaSeleccionada === nombre ? 0.12 : zona.hover ? 0.06 : 0;
    }

    for (const casa of casas) {
      const necesita = fase === 'filtrado' && casa.estado;
      const enZonaActiva = !zonaSeleccionada || zonaSeleccionada === casa.centro.zona;

      if (fase === 'entrada') {
        casa.escalaObjetivo = 1;
        casa.colorObjetivo.set(COLORES.techoNeutro);
      } else if (!necesita) {
        casa.escalaObjetivo = 0; // se hunde: no necesita esta subcategoría
      } else {
        const base = casa.estado === 'urgente' ? 1.3 : 1.05;
        casa.escalaObjetivo = enZonaActiva ? base : base * 0.7;
        casa.colorObjetivo.set(casa.estado === 'urgente' ? COLORES.techoUrgente : COLORES.techoDesabastecido);
        if (!enZonaActiva) casa.colorObjetivo.lerp(colorAtenuado, 0.65);
      }
      casa.elevacionObjetivo = centroResaltado === casa.centro.id ? 0.35 : 0;
    }
  }

  // Lleva la cámara a la zona elegida (o a toda Cali), animada.
  function enfocarCamara(zona, { animar = true } = {}) {
    const objetivo = encuadreDe(zona);
    if (!objetivo) return;
    if (!animar || movimientoReducido) {
      Object.assign(vista, objetivo);
      vistaObjetivo = null;
      aplicarVista();
    } else {
      vistaObjetivo = objetivo;
    }
  }

  function seleccionarZona(zona) {
    const nueva = zona && zona === zonaSeleccionada ? null : zona;
    zonaSeleccionada = nueva;
    aplicarObjetivos();
    enfocarCamara(nueva); // la cámara se acerca a la zona elegida
    alCambiarZona(nueva);
  }

  function resaltarCentro(id) {
    if (centroResaltado === id) return;
    centroResaltado = id;
    aplicarObjetivos();
    alResaltarCentro(id);
  }

  function acercar(factor) {
    vistaObjetivo = { ...(vistaObjetivo ?? vista), mitad: THREE.MathUtils.clamp(vista.mitad * factor, 1.5, 30) };
  }

  // --- Puntero: hover y clic (distinguiendo clic de arrastre) -------------

  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let inicioToque = null;

  function objetoBajoPuntero(evento) {
    const rect = renderer.domElement.getBoundingClientRect();
    puntero.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    puntero.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camara);

    if (fase === 'filtrado') {
      const visibles = casas.filter((c) => c.estado).map((c) => c.grupo);
      const golpeCasa = raycaster.intersectObjects(visibles, true)[0];
      if (golpeCasa) {
        let obj = golpeCasa.object;
        while (obj && !obj.userData.centroId) obj = obj.parent;
        if (obj) return { tipo: 'centro', id: obj.userData.centroId };
      }
    }
    // Solo las casas se pueden tocar; las zonas se eligen con los botones.
    return null;
  }

  function alMoverPuntero(evento) {
    if (evento.pointerType === 'touch') return; // en táctil no hay hover
    const golpe = objetoBajoPuntero(evento);
    const nuevaZonaHover = golpe?.tipo === 'zona' ? golpe.id : null;
    if (nuevaZonaHover !== zonaHover) {
      if (zonaHover) zonas.get(zonaHover).hover = false;
      if (nuevaZonaHover) zonas.get(nuevaZonaHover).hover = true;
      zonaHover = nuevaZonaHover;
    }
    resaltarCentro(golpe?.tipo === 'centro' ? golpe.id : null);
    aplicarObjetivos();
    renderer.domElement.style.cursor = golpe ? 'pointer' : 'default';
  }

  function alSalirPuntero() {
    if (zonaHover) zonas.get(zonaHover).hover = false;
    zonaHover = null;
    resaltarCentro(null);
    aplicarObjetivos();
  }

  function alPresionar(evento) {
    inicioToque = { x: evento.clientX, y: evento.clientY, t: performance.now() };
  }

  let alMarcarUbicacion = null; // modo "Marcar dónde estoy"

  function puntoEnElSuelo(evento) {
    const rect = renderer.domElement.getBoundingClientRect();
    puntero.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    puntero.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camara);
    const golpe = raycaster.intersectObjects([base, ...[...zonas.values()].map((z) => z.malla)], true)[0];
    return golpe ? golpe.point : null;
  }

  function alSoltar(evento) {
    if (!inicioToque) return;
    const movimiento = Math.hypot(evento.clientX - inicioToque.x, evento.clientY - inicioToque.y);
    const duracion = performance.now() - inicioToque.t;
    inicioToque = null;
    if (movimiento > 8 || duracion > 600) return; // fue un arrastre, no un clic

    if (alMarcarUbicacion) {
      const punto = puntoEnElSuelo(evento);
      if (punto) {
        const ubicacion = { ...desproyectar({ x: punto.x, z: punto.z }), manual: true };
        const avisar = alMarcarUbicacion;
        alMarcarUbicacion = null;
        renderer.domElement.classList.remove('mapa3d__canvas--marcando');
        avisar(ubicacion);
      }
      return;
    }
    const golpe = objetoBajoPuntero(evento);
    if (golpe?.tipo === 'centro') {
      if (evento.pointerType === 'touch' && centroResaltado !== golpe.id) {
        // Primer toque en táctil: muestra el nombre; el segundo abre la ficha.
        resaltarCentro(golpe.id);
        return;
      }
      alClicCentro(golpe.id);
    } else if (golpe?.tipo === 'zona') {
      seleccionarZona(golpe.id);
    }
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', alMoverPuntero);
  canvas.addEventListener('pointerleave', alSalirPuntero);
  canvas.addEventListener('pointerdown', alPresionar);
  canvas.addEventListener('pointerup', alSoltar);

  // --- Tamaño responsive --------------------------------------------------

  function ajustarTamano() {
    const { clientWidth: ancho, clientHeight: alto } = lienzo;
    if (!ancho || !alto) return;
    renderer.setSize(ancho, alto, false);
    // Al cambiar el tamaño se vuelve a encuadrar lo que se estaba viendo.
    enfocarCamara(zonaSeleccionada, { animar: false });
  }

  // Encuadre cenital: la ciudad (o la zona elegida) llena el espacio libre
  // de la pantalla, descontando lo que tapan los controles de encima
  // (opciones.margenes() en píxeles: arriba, abajo, izquierda, derecha).
  const RELLENO = { ciudad: 0.99, zona: 0.74 };
  const CORRIMIENTO_DERECHA_PX = 70;
  function encuadreDe(zona) {
    const { clientWidth: ancho, clientHeight: alto } = lienzo;
    if (!ancho || !alto) return null;
    // Toda Cali incluye las cimas de la torre, las cruces y el Cristo Rey
    // (en pantallas angostas solo la ciudad: si no, queda muy pequeña).
    const conLugares = ancho >= alto ? [...puntosLugares, ...puntosRio] : [];
    const puntos = zona && zonas.has(zona)
      ? zonas.get(zona).puntos
      : [...[...zonas.values()].flatMap((z) => z.puntos), ...conLugares];
    // Con la cámara inclinada, la altura de un punto lo sube en pantalla:
    // "v" es la posición vertical en pantalla (hacia arriba) en unidades.
    const cos = Math.cos(INCLINACION);
    const sen = Math.sin(INCLINACION);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of puntos) {
      const v = -p.z * cos + (p.y ?? Y_SUPERFICIE) * sen;
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
      z0 = Math.min(z0, v); z1 = Math.max(z1, v);
    }
    const m = { arriba: 0, abajo: 0, izquierda: 0, derecha: 0, ...(opciones.margenes?.() ?? {}) };
    const libreAncho = Math.max(ancho - m.izquierda - m.derecha, ancho * 0.4);
    const libreAlto = Math.max(alto - m.arriba - m.abajo, alto * 0.4);
    const relleno = zona ? RELLENO.zona : RELLENO.ciudad;
    // unidades del mundo por píxel
    const s = Math.max((x1 - x0) / libreAncho, (z1 - z0) / libreAlto) / relleno;
    // El centro del espacio libre, en píxeles respecto al centro del lienzo.
    const dx = m.izquierda + libreAncho / 2 - ancho / 2;
    const dy = m.arriba + libreAlto / 2 - alto / 2;
    // Respecto al centro de la cámara (cx, 0, cz), un punto se ve a
    // v + cz·cos; se elige cz para que el centro de [z0, z1] quede en el
    // centro del espacio libre (dy píxeles más abajo que el del lienzo).
    let cx = (x0 + x1) / 2 - dx * s;
    // Toda Cali con la ubicación de la persona: el mapa se corre a la
    // derecha para que su pin quede a 2 cm del globo del gato
    // (opciones.objetivoUsuario() = x en píxeles), sin sacar la ciudad
    // de la pantalla.
    const objetivoPin = !zona && pinUsuario?.visible && !pinFuera ? opciones.objetivoUsuario?.() : null;
    // Sin la ubicación, "Toda Cali" queda un poco corrida a la derecha
    // (oct 2026, pedido del equipo).
    if (!zona && !Number.isFinite(objetivoPin)) cx -= CORRIMIENTO_DERECHA_PX * s;
    if (Number.isFinite(objetivoPin)) {
      const deseado = pinUsuario.position.x - (objetivoPin - ancho / 2) * s;
      const minimo = x1 - (ancho / 2 - 12) * s; // el borde derecho de la ciudad sigue a la vista
      const maximo = x0 + (ancho / 2 - (m.izquierda || 12)) * s; // y el izquierdo
      cx = Math.min(Math.max(deseado, minimo), maximo);
    }
    return {
      cx,
      cz: (-dy * s - (z0 + z1) / 2) / cos,
      mitad: (alto * s) / 2,
    };
  }
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(lienzo);
  ajustarTamano();

  // --- Etiquetas HTML proyectadas sobre el 3D ------------------------------

  const vector = new THREE.Vector3();
  function proyectarAPantalla(x, y, z) {
    vector.set(x, y, z).project(camara);
    return {
      x: (vector.x * 0.5 + 0.5) * lienzo.clientWidth,
      y: (-vector.y * 0.5 + 0.5) * lienzo.clientHeight,
      visible: vector.z < 1,
    };
  }

  // --- "Tú estás aquí": pin con la ubicación del usuario ---------------
  let anilloUsuario = null;
  const etiquetaUsuario = document.createElement('span');
  etiquetaUsuario.className = 'mapa3d__etiqueta-zona mapa3d__etiqueta-tu';
  etiquetaUsuario.textContent = 'Tú estás aquí';
  etiquetaUsuario.hidden = true;
  capaEtiquetas.appendChild(etiquetaUsuario);

  function marcarUsuario({ lat, lng }) {
    let p = proyectar([lng, lat]);
    // Fuera del mapa (p. ej. otro municipio): el pin se pone en el borde
    // del mapa, en la dirección donde está la persona.
    const LIM_X = 6.6;
    const LIM_Z = 8.2;
    let fuera = false;
    if (Math.abs(p.x) > LIM_X || Math.abs(p.z) > LIM_Z) {
      fuera = true;
      const f = Math.min(LIM_X / Math.abs(p.x || 1e-6), LIM_Z / Math.abs(p.z || 1e-6));
      p = { x: p.x * f, z: p.z * f };
    }
    const kmCali = (() => {
      const rad = (g) => (g * Math.PI) / 180;
      const a = { lat: 3.4516, lng: -76.532 };
      const h =
        Math.sin(rad(lat - a.lat) / 2) ** 2 +
        Math.cos(rad(a.lat)) * Math.cos(rad(lat)) * Math.sin(rad(lng - a.lng) / 2) ** 2;
      return 6371 * 2 * Math.asin(Math.sqrt(h));
    })();
    etiquetaUsuario.textContent = fuera ? `Tú · a ${Math.round(kmCali)} km` : 'Tú estás aquí';
    if (!pinUsuario) {
      pinUsuario = new THREE.Group();
      const matPin = registrar(new THREE.MeshStandardMaterial({ color: '#426D8C', roughness: 0.5 }));
      const cabeza = new THREE.Mesh(registrar(new THREE.SphereGeometry(0.28, 24, 16)), matPin);
      cabeza.position.y = 1.05;
      const punta = new THREE.Mesh(registrar(new THREE.ConeGeometry(0.2, 0.7, 20)), matPin);
      punta.rotation.x = Math.PI;
      punta.position.y = 0.62;
      const centro = new THREE.Mesh(
        registrar(new THREE.SphereGeometry(0.11, 16, 12)),
        registrar(new THREE.MeshBasicMaterial({ color: '#FFFFFF' }))
      );
      centro.position.set(0, 1.08, 0.2);
      // Aro que late alrededor del pin, para encontrarlo rápido.
      anilloUsuario = new THREE.Mesh(
        registrar(new THREE.RingGeometry(0.35, 0.5, 40)),
        registrar(new THREE.MeshBasicMaterial({ color: '#426D8C', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }))
      );
      anilloUsuario.rotation.x = -Math.PI / 2;
      anilloUsuario.position.y = 0.03;
      // El pin también se ve de frente (inclinado hacia la cámara).
      const figuraPin = new THREE.Group();
      figuraPin.rotation.x = -(Math.PI / 2 - INCLINACION) + VER_TECHO;
      figuraPin.add(cabeza, punta, centro);
      pinUsuario.add(figuraPin, anilloUsuario);
      pinUsuario.traverse((o) => (o.castShadow = o !== anilloUsuario));
      pinUsuario.scale.setScalar(0.95); // más pequeño (antes 1,5)
      escena.add(pinUsuario);
    }
    pinUsuario.visible = true;
    pinUsuario.position.set(p.x, fuera ? 0.05 : Y_SUPERFICIE, p.z);
    pinFuera = fuera;
    enfocarCamara(zonaSeleccionada); // el mapa se acomoda al pin (ver encuadreDe)
    return fuera ? 'borde' : true;
  }

  function actualizarEtiquetas() {
    if (anilloUsuario && pinUsuario?.visible && !movimientoReducido) {
      const ciclo = (performance.now() / 1600) % 1;
      anilloUsuario.scale.setScalar(1 + ciclo * 1.6);
      anilloUsuario.material.opacity = 0.55 * (1 - ciclo);
    }
    if (pinUsuario?.visible) {
      const pu = proyectarAPantalla(pinUsuario.position.x, pinUsuario.position.y + 0.4, pinUsuario.position.z - 1.3);
      etiquetaUsuario.hidden = !pu.visible;
      etiquetaUsuario.style.transform = `translate(-50%, -50%) translate(${pu.x}px, ${pu.y}px)`;
    }
    for (const [nombre, zona] of zonas) {
      const p = proyectarAPantalla(zona.centro.x, Y_SUPERFICIE + 0.3 + zona.malla.position.y, zona.centro.z);
      zona.etiqueta.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`;
      zona.etiqueta.classList.toggle('mapa3d__etiqueta-zona--activa', zonaSeleccionada === nombre);
      zona.etiqueta.classList.toggle(
        'mapa3d__etiqueta-zona--atenuada',
        Boolean(zonaSeleccionada) && zonaSeleccionada !== nombre
      );
      zona.etiqueta.hidden = !p.visible;
    }

    const casa = casas.find((c) => c.centro.id === centroResaltado);
    if (casa && casa.estado && fase === 'filtrado') {
      const g = casa.grupo;
      const p = proyectarAPantalla(g.position.x, g.position.y + 0.95 * g.scale.y, g.position.z);
      tooltip.hidden = false;
      tooltip.textContent = casa.centro.nombre;
      tooltip.style.transform = `translate(-50%, -100%) translate(${p.x}px, ${p.y}px)`;
    } else {
      tooltip.hidden = true;
    }
  }

  // --- Bucle de animación ----------------------------------------------------

  const reloj = new THREE.Clock();
  let idFrame = 0;
  let filtroAnunciado = false;

  function animar() {
    idFrame = requestAnimationFrame(animar);
    const dt = Math.min(reloj.getDelta(), 0.05);
    tiempo += dt;

    // Cambio de fase: el mapa "reacciona" a la subcategoría elegida.
    if (fase === 'entrada' && (movimientoReducido || tiempo > 1.1)) {
      fase = 'filtrado';
      aplicarObjetivos();
    }
    if (fase === 'filtrado' && !filtroAnunciado && (movimientoReducido || tiempo > 0.7)) {
      filtroAnunciado = true;
      alTerminarFiltro();
    }

    const k = movimientoReducido ? 1 : suavizar(9, dt);

    for (const zona of zonas.values()) {
      zona.malla.position.y += (zona.yObjetivo - zona.malla.position.y) * k;
      zona.material.color.lerp(zona.colorObjetivo, k);
    }

    for (const casa of casas) {
      if (tiempo < casa.retrasoEntrada) continue;
      const kCasa = movimientoReducido ? 1 : suavizar(casa.escalaObjetivo > casa.grupo.scale.x ? 10 : 7, dt);
      const escala = casa.grupo.scale.x + (casa.escalaObjetivo - casa.grupo.scale.x) * kCasa;
      casa.grupo.scale.setScalar(Math.max(escala, 0.001));
      casa.grupo.visible = escala > 0.01;
      casa.elevacion += (casa.elevacionObjetivo - casa.elevacion) * k;

      const zona = zonas.get(casa.centro.zona);
      const yZona = zona ? zona.malla.position.y : 0;
      casa.grupo.position.y = Y_SUPERFICIE + yZona + casa.elevacion;
      casa.matTecho.color.lerp(casa.colorObjetivo, k);

      // Anillo que late en los urgentes (fijo con movimiento reducido).
      const urgenteVisible = fase === 'filtrado' && casa.estado === 'urgente';
      if (urgenteVisible) {
        if (movimientoReducido) {
          casa.anillo.scale.setScalar(1.2);
          casa.matAnillo.opacity = 0.35;
        } else {
          const ciclo = ((tiempo + casa.retrasoEntrada) % 1.5) / 1.5;
          casa.anillo.scale.setScalar(1 + ciclo * 1.3);
          casa.matAnillo.opacity = 0.55 * (1 - ciclo);
        }
      } else {
        casa.matAnillo.opacity = 0;
      }
    }

    // La torre está sobre la zona Centro: sube y baja con ella.
    if (torre) torre.position.y = Y_SUPERFICIE + (zonas.get('Centro')?.malla.position.y ?? 0);

    if (vistaObjetivo) {
      const kc = suavizar(4, dt);
      vista.cx += (vistaObjetivo.cx - vista.cx) * kc;
      vista.cz += (vistaObjetivo.cz - vista.cz) * kc;
      vista.mitad += (vistaObjetivo.mitad - vista.mitad) * kc;
      if (
        Math.abs(vistaObjetivo.cx - vista.cx) + Math.abs(vistaObjetivo.cz - vista.cz) +
          Math.abs(vistaObjetivo.mitad - vista.mitad) < 0.005
      ) {
        Object.assign(vista, vistaObjetivo);
        vistaObjetivo = null;
      }
    }

    aplicarVista();
    actualizarEtiquetas();
    renderer.render(escena, camara);
  }

  // --- Geografía (escena_mapa.blend del equipo) -----------------------------
  // cali_montanas.glb: cerros, arbustos y árboles (los Farallones), y sobre
  // ellos el Cristo Rey (con su plaza) y las Tres Cruces. torre_cali.glb: la
  // Torre de Cali. En el archivo los cerros están "de frente"; aquí van a lo
  // largo del borde occidental de la ciudad (espejados para que las Tres
  // Cruces queden al norte del Cristo Rey, como en Cali). Los tres lugares
  // se sacan del bloque y se ponen donde quedan en la realidad.
  const ESCALA_CERROS = 0.38;
  const ESCALA_LUGARES = 0.62; // más grandes que los cerros: que se vean los detalles
  const ESCALA_TORRE = 0.45;
  const LUGARES = {
    tresCruces: { partes: ['Cruz_Izq', 'Cruz_Centro', 'Cruz_Der'], en: proyectar([-76.5486, 3.4706]) },
    // El Cristo Rey real cae dentro de Occidente (barrios de ladera): se
    // pone a su misma latitud, sobre los cerros al borde de la zona.
    cristoRey: {
      partes: ['Plaza_Muro', 'Plaza_Piso', 'Plaza_Baranda', 'Jardinera_Borde', 'Jardinera_Pasto', 'Pedestal', 'Pedestal_Tapa', 'Cristo_Rey'],
      en: { x: -6.3, z: proyectar([-76.5652, 3.4357]).z },
    },
  };
  // Torre de Cali: centro, junto al río, un poco al norte de la Plazoleta
  // Jairo Varela (para no taparle la casita).
  const LUGAR_TORRE = { x: -0.55, z: -4.2 };
  let torre = null;

  function noTocable(objeto) {
    objeto.traverse((n) => {
      if (!n.isMesh) return;
      n.raycast = () => {};
      n.castShadow = true;
      n.receiveShadow = true;
      (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
        m.roughness = 0.9;
        m.metalness = 0;
      });
    });
  }

  // Agrupa partes sueltas en un grupo centrado en x/z y apoyado en y = 0.
  function agruparPartes(raiz, nombres, escala) {
    const grupo = new THREE.Group();
    const partes = nombres.map((n) => raiz.getObjectByName(n)).filter(Boolean);
    const caja = new THREE.Box3();
    partes.forEach((p) => caja.expandByObject(p));
    const centro = caja.getCenter(new THREE.Vector3());
    partes.forEach((p) => {
      p.removeFromParent();
      p.position.sub(new THREE.Vector3(centro.x, caja.min.y, centro.z));
      grupo.add(p);
    });
    grupo.scale.setScalar(escala);
    return grupo;
  }

  const rayoSuelo = new THREE.Raycaster();
  function alturaDelTerreno(cerros, x, z) {
    rayoSuelo.set(new THREE.Vector3(x, 60, z), new THREE.Vector3(0, -1, 0));
    const golpe = rayoSuelo.intersectObject(cerros, true)[0];
    return golpe ? golpe.point.y : 0;
  }

  function cargarGeografia() {
    const cargador = new GLTFLoader();
    cargador.setDRACOLoader(
      new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/')
    );

    cargarGLB(cargador, MODELO_CERROS)
      .then(({ scene: modelo }) => {
        if (destruido) return;
        modelo.updateMatrixWorld(true);
        const lugares = Object.fromEntries(
          Object.entries(LUGARES).map(([id, l]) => [id, agruparPartes(modelo, l.partes, ESCALA_LUGARES)])
        );
        // Bloque de cerros: (x, y, z) del archivo → occidente de la ciudad.
        // x del mapa = s·z + c (el frente de los cerros en x ≈ -5,5),
        // z del mapa = s·x + cz (espejado), y = s·y.
        const s = ESCALA_CERROS;
        const cerros = new THREE.Group();
        cerros.add(...modelo.children);
        cerros.matrixAutoUpdate = false;
        cerros.matrix.set(0, 0, s, -5.5 - 7 * s, 0, s, 0, -0.02, s, 0, 0, 0.5, 0, 0, 0, 1);
        noTocable(cerros);
        escena.add(cerros);
        cerros.updateMatrixWorld(true);
        // (La cordillera completa ya no entra en el encuadre: así Cali y
        // los cerros se ven mucho más grandes; los cerros siguen hacia el
        // occidente por fuera de la pantalla.)

        // Cada lugar, sobre el cerro (o sobre una lomita si cae en plano).
        for (const [id, grupo] of Object.entries(lugares)) {
          const { x, z } = LUGARES[id].en;
          let y = alturaDelTerreno(cerros, x, z);
          if (y < 0.3) {
            const lomita = new THREE.Mesh(
              registrar(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
              registrar(new THREE.MeshStandardMaterial({ color: '#6B9A59', roughness: 0.95 }))
            );
            lomita.scale.set(1.1, 0.6, 0.9);
            lomita.position.set(x, -0.02, z);
            noTocable(lomita);
            escena.add(lomita);
            y = 0.55;
          }
          grupo.position.set(x, y - 0.04, z);
          noTocable(grupo);
          escena.add(grupo);
          // Arbustos o árboles del bloque que caen encima del lugar: se quitan.
          const radio = new THREE.Box3().setFromObject(grupo).getSize(new THREE.Vector3()).length() / 2 + 0.3;
          const p = new THREE.Vector3();
          cerros.children.forEach((n) => {
            if (!/^(Arbusto|Arbol)/.test(n.name)) return;
            n.getWorldPosition(p);
            if (Math.hypot(p.x - x, p.z - z) < radio) n.visible = false;
          });
          const caja = new THREE.Box3().setFromObject(grupo);
          puntosLugares.push({ x, z, y: caja.max.y });
        }
        enfocarCamara(zonaSeleccionada, { animar: false });
      })
      .catch((e) => console.warn('No se pudieron cargar los cerros de Cali:', e));

    cargarGLB(cargador, MODELO_TORRE)
      .then(({ scene: modelo }) => {
        if (destruido) return;
        modelo.updateMatrixWorld(true);
        torre = agruparPartes(modelo, modelo.children.map((n) => n.name), ESCALA_TORRE);
        torre.position.set(LUGAR_TORRE.x, Y_SUPERFICIE, LUGAR_TORRE.z);
        noTocable(torre);
        escena.add(torre);
        const caja = new THREE.Box3().setFromObject(torre);
        puntosLugares.push({ x: LUGAR_TORRE.x, z: LUGAR_TORRE.z, y: caja.max.y });
        enfocarCamara(zonaSeleccionada, { animar: false });
      })
      .catch((e) => console.warn('No se pudo cargar la Torre de Cali:', e));
  }
  cargarGeografia();

  // Encuadre inicial (ya con el tamaño real del contenedor): si se vuelve
  // de la ficha con una zona elegida, el mapa abre enfocado en ella.
  if (zonaInicial && zonas.has(zonaInicial)) zonaSeleccionada = zonaInicial;
  enfocarCamara(zonaSeleccionada, { animar: false });
  aplicarObjetivos();
  animar();

  // --- Limpieza (se llama al salir de la pantalla) ---------------------------

  function destruir() {
    destruido = true;
    cancelAnimationFrame(idFrame);
    observador.disconnect();
    canvas.removeEventListener('pointermove', alMoverPuntero);
    canvas.removeEventListener('pointerleave', alSalirPuntero);
    canvas.removeEventListener('pointerdown', alPresionar);
    canvas.removeEventListener('pointerup', alSoltar);
    desechables.forEach((d) => d.dispose());
    renderer.dispose();
    canvas.remove();
    capaEtiquetas.replaceChildren();
  }

  return {
    seleccionarZona,
    marcarUsuario,
    // Espera un toque en el mapa y devuelve esa ubicación (lat/lng).
    esperarToqueUbicacion(callback) {
      alMarcarUbicacion = callback;
      renderer.domElement.classList.add('mapa3d__canvas--marcando');
    },
    resaltarCentro,
    acercar,
    restablecerVista: () => seleccionarZona(null),
    getZonaSeleccionada: () => zonaSeleccionada,
    destruir,
  };
}

// Exportado para pruebas: permite verificar que cada centro cae en su zona.
export const _interno = { ZONAS_PLANO, proyectar, puntoEnPoligono };
