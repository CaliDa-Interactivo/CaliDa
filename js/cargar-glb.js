// ============================================================
// cargar-glb.js — carga de modelos .glb (compartida).
// En la vista previa publicada los modelos van embebidos en
// window.__CALIDA_MODELOS (base64); en el proyecto se descargan
// de assets/modelos/.
// ============================================================

export const RUTA_MODELOS = 'assets/modelos/';
export const MODELO_GATO = `${RUTA_MODELOS}gato.glb`;
export const MODELO_CASA = {
  urgente: `${RUTA_MODELOS}casa_roja.glb`,
  desabastecido: `${RUTA_MODELOS}casa_amarilla.glb`,
};

const bufferes = new Map(); // url → Promise<ArrayBuffer>

function leerBuffer(url) {
  if (!bufferes.has(url)) {
    const embebido = window.__CALIDA_MODELOS?.[url];
    bufferes.set(
      url,
      embebido
        ? Promise.resolve(Uint8Array.from(atob(embebido), (c) => c.charCodeAt(0)).buffer)
        : fetch(url).then((r) => {
            if (!r.ok) throw new Error(`No se pudo cargar ${url}`);
            return r.arrayBuffer();
          })
    );
  }
  return bufferes.get(url);
}

export async function cargarGLB(cargador, url) {
  const datos = await leerBuffer(url);
  // parse() no modifica el buffer: se puede reutilizar para varias copias.
  return new Promise((ok, falla) => cargador.parse(datos.slice(0), '', ok, falla));
}

// Casas con el estilo de la página: paredes crema, techo del color del
// estado (rojo urgente / amarillo desabastecido), madera cálida y piedra
// clara, todo mate (aspecto de arcilla, como los demás elementos).
const ESTILO_CASA = {
  Walls: '#FFF8ED', // marfil
  Stone: '#E8E1D5', // beige arena
  Wood: '#B07A52', // madera
  Wood_Light: '#DBA878', // madera de la estantería
};
// Techos con los colores de estado de la paleta: rojo carmín (urgente)
// y amarillo (desabastecido), bien visibles sobre fondos claros u oscuros.
const TECHO = { urgente: '#CC0100', desabastecido: '#F2B33D' };

export function estilizarCasa(escena, estado) {
  // El modelo es largo de fondo: se acorta para que quede compacto,
  // como los productos de la estantería.
  escena.children.forEach((hijo) => {
    hijo.scale.z *= 0.62;
  });
  escena.traverse((n) => {
    if (!n.isMesh) return;
    const mats = Array.isArray(n.material) ? n.material : [n.material];
    mats.forEach((m) => {
      const nombre = m.name || '';
      const color = nombre.startsWith('Main') ? TECHO[estado] : ESTILO_CASA[nombre];
      if (color && m.color) m.color.set(color);
      m.roughness = 0.9;
      m.metalness = 0;
      if (m.emissive) {
        // Muy poca luz propia: el color se ve firme, sin lavarse.
        m.emissive.set(color ?? '#000000');
        m.emissiveIntensity = 0.1;
      }
    });
  });
  return escena;
}
