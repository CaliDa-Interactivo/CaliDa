// ============================================================
// ajustes-modelos.js — retoques a los modelos de productos:
// colores que venían mal en el archivo y calcomanías (íconos)
// al frente. Lo usan la estantería 3D y las "fotos" de los modelos.
// ============================================================

// Colores por material (nombre del material en el .glb).
const COLORES = {
  'alimento-agua': {
    'Bottle plastic': { color: '#8FD0F2', metalness: 0, roughness: 0.2, opacity: 0.88 },
    'Bottle cap': { color: '#1E6FD9', metalness: 0, roughness: 0.45 },
  },
};

// Íconos dibujados en canvas (fondo transparente).
function dibujarMaiz(ctx, s) {
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(-0.35);
  // hojas
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.42);
  ctx.quadraticCurveTo(-s * 0.36, s * 0.05, -s * 0.12, -s * 0.3);
  ctx.quadraticCurveTo(-s * 0.08, s * 0.1, 0, s * 0.42);
  ctx.fill();
  ctx.fillStyle = '#3E9B43';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.42);
  ctx.quadraticCurveTo(s * 0.36, s * 0.05, s * 0.12, -s * 0.3);
  ctx.quadraticCurveTo(s * 0.08, s * 0.1, 0, s * 0.42);
  ctx.fill();
  // mazorca
  ctx.fillStyle = '#FFC93C';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.05, s * 0.13, s * 0.33, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F2A81D';
  for (let y = -0.3; y <= 0.2; y += 0.085) {
    for (let x = -0.07; x <= 0.07; x += 0.07) {
      ctx.beginPath();
      ctx.arc(x * s, (y - 0.02) * s, s * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function dibujarHuella(ctx, s) {
  ctx.fillStyle = '#FFF6E6';
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6B3A1E';
  ctx.beginPath();
  ctx.ellipse(s * 0.5, s * 0.6, s * 0.15, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  [
    [0.3, 0.42, -0.4],
    [0.42, 0.3, -0.15],
    [0.58, 0.3, 0.15],
    [0.7, 0.42, 0.4],
  ].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.ellipse(s * x, s * y, s * 0.06, s * 0.08, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

const CALCOMANIAS = {
  'alimento-no-perecederos': dibujarMaiz,
  'alimento-animal': dibujarHuella,
};

// --- Ropa con formas orgánicas ------------------------------------------
// Los modelos de ropa eran recortes planos sin forma. Se reemplazan por
// prendas "infladas" (silueta redondeada con mucho bisel), con material
// mate, del mismo tamaño y en el mismo lugar que el modelo original.

function inflar(THREE, forma, { grosor = 0.2, bisel = 0.15 } = {}) {
  const g = new THREE.ExtrudeGeometry(forma, {
    depth: grosor,
    bevelEnabled: true,
    bevelThickness: bisel,
    bevelSize: bisel * 0.8,
    bevelSegments: 10,
    curveSegments: 28,
  });
  g.translate(0, 0, -grosor / 2);
  return g;
}

function rectRedondeado(THREE, ancho, alto, r) {
  const f = new THREE.Shape();
  const [x, y] = [-ancho / 2, -alto / 2];
  f.moveTo(x + r, y);
  f.lineTo(x + ancho - r, y);
  f.quadraticCurveTo(x + ancho, y, x + ancho, y + r);
  f.lineTo(x + ancho, y + alto - r);
  f.quadraticCurveTo(x + ancho, y + alto, x + ancho - r, y + alto);
  f.lineTo(x + r, y + alto);
  f.quadraticCurveTo(x, y + alto, x, y + alto - r);
  f.lineTo(x, y + r);
  f.quadraticCurveTo(x, y, x + r, y);
  return f;
}

const FRENTE = 0.27; // z de la cara delantera de una prenda inflada

const PRENDAS = {
  // Camisa: mangas cortas redondeadas, cuello marfil, botones y bolsillo.
  'ropa-hombre'(THREE, mate) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-0.6, 0.06);
    s.quadraticCurveTo(0, -0.04, 0.6, 0.06);
    s.quadraticCurveTo(0.66, 0.5, 0.64, 0.9);
    s.quadraticCurveTo(0.8, 0.8, 1.02, 0.86);
    s.quadraticCurveTo(1.14, 1.02, 1.04, 1.2);
    s.quadraticCurveTo(0.82, 1.44, 0.4, 1.52);
    s.quadraticCurveTo(0, 1.3, -0.4, 1.52);
    s.quadraticCurveTo(-0.82, 1.44, -1.04, 1.2);
    s.quadraticCurveTo(-1.14, 1.02, -1.02, 0.86);
    s.quadraticCurveTo(-0.8, 0.8, -0.64, 0.9);
    s.quadraticCurveTo(-0.66, 0.5, -0.6, 0.06);
    g.add(new THREE.Mesh(inflar(THREE, s), mate('#5B8DB8')));
    for (const lado of [-1, 1]) {
      const c = new THREE.Shape();
      c.moveTo(0, 0);
      c.quadraticCurveTo(lado * 0.22, 0.02, lado * 0.34, 0.16);
      c.quadraticCurveTo(lado * 0.16, 0.2, 0, 0.16);
      c.lineTo(0, 0);
      const cuello = new THREE.Mesh(inflar(THREE, c, { grosor: 0.04, bisel: 0.05 }), mate('#FFF8ED'));
      cuello.position.set(0, 1.3, FRENTE);
      g.add(cuello);
    }
    [0.98, 0.72, 0.46].forEach((y) => {
      const boton = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 12), mate('#FFF8ED'));
      boton.scale.z = 0.6;
      boton.position.set(0, y, FRENTE + 0.02);
      g.add(boton);
    });
    const bolsillo = new THREE.Mesh(
      inflar(THREE, rectRedondeado(THREE, 0.26, 0.24, 0.06), { grosor: 0.02, bisel: 0.04 }),
      mate('#3E6E96')
    );
    bolsillo.position.set(0.32, 1.02, FRENTE);
    g.add(bolsillo);
    return g;
  },

  // Vestido: cuerpo con tirantes, falda acampanada, cinturón y un moño.
  'ropa-mujer'(THREE, mate) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-0.78, 0.04);
    s.quadraticCurveTo(0, -0.1, 0.78, 0.04);
    s.quadraticCurveTo(0.52, 0.5, 0.3, 0.92);
    s.quadraticCurveTo(0.38, 1.12, 0.34, 1.32);
    s.quadraticCurveTo(0.36, 1.52, 0.24, 1.58);
    s.quadraticCurveTo(0.2, 1.6, 0.16, 1.54);
    s.quadraticCurveTo(0, 1.36, -0.16, 1.54);
    s.quadraticCurveTo(-0.2, 1.6, -0.24, 1.58);
    s.quadraticCurveTo(-0.36, 1.52, -0.34, 1.32);
    s.quadraticCurveTo(-0.38, 1.12, -0.3, 0.92);
    s.quadraticCurveTo(-0.52, 0.5, -0.78, 0.04);
    g.add(new THREE.Mesh(inflar(THREE, s), mate('#F67751')));
    const cinturon = new THREE.Mesh(
      inflar(THREE, rectRedondeado(THREE, 0.66, 0.12, 0.05), { grosor: 0.03, bisel: 0.05 }),
      mate('#FDD794')
    );
    cinturon.position.set(0, 0.93, FRENTE - 0.04);
    g.add(cinturon);
    for (const lado of [-1, 1]) {
      const lazo = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 12), mate('#FDD794'));
      lazo.scale.set(1.3, 0.8, 0.6);
      lazo.position.set(lado * 0.09, 0.93, FRENTE + 0.03);
      g.add(lazo);
    }
    // ruedo marfil abajo
    const ruedo = new THREE.Shape();
    ruedo.moveTo(-0.78, 0.04);
    ruedo.quadraticCurveTo(0, -0.1, 0.78, 0.04);
    ruedo.quadraticCurveTo(0.74, 0.11, 0.71, 0.16);
    ruedo.quadraticCurveTo(0, 0.04, -0.71, 0.16);
    ruedo.quadraticCurveTo(-0.74, 0.11, -0.78, 0.04);
    const franja = new THREE.Mesh(inflar(THREE, ruedo, { grosor: 0.03, bisel: 0.04 }), mate('#FFF8ED'));
    franja.position.z = FRENTE - 0.06;
    g.add(franja);
    return g;
  },

  // Overol de niño: pantalón corto, peto con bolsillo y tirantes.
  'ropa-ninos'(THREE, mate) {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-0.58, 0.04);
    s.quadraticCurveTo(-0.33, -0.04, -0.08, 0.04);
    s.quadraticCurveTo(0, 0.26, 0.08, 0.04);
    s.quadraticCurveTo(0.33, -0.04, 0.58, 0.04);
    s.quadraticCurveTo(0.64, 0.5, 0.52, 0.84);
    s.quadraticCurveTo(0.4, 0.86, 0.36, 0.92);
    s.lineTo(0.36, 1.28);
    s.quadraticCurveTo(0.36, 1.38, 0.26, 1.38);
    s.lineTo(-0.26, 1.38);
    s.quadraticCurveTo(-0.36, 1.38, -0.36, 1.28);
    s.lineTo(-0.36, 0.92);
    s.quadraticCurveTo(-0.4, 0.86, -0.52, 0.84);
    s.quadraticCurveTo(-0.64, 0.5, -0.58, 0.04);
    g.add(new THREE.Mesh(inflar(THREE, s), mate('#86B5A9')));
    for (const lado of [-1, 1]) {
      const tirante = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 8, 16), mate('#86B5A9'));
      tirante.position.set(lado * 0.27, 1.6, -0.02);
      tirante.rotation.z = lado * -0.25;
      g.add(tirante);
      const boton = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 12), mate('#FDD794'));
      boton.scale.z = 0.6;
      boton.position.set(lado * 0.24, 1.28, FRENTE + 0.02);
      g.add(boton);
    }
    const bolsillo = new THREE.Mesh(
      inflar(THREE, rectRedondeado(THREE, 0.32, 0.24, 0.08), { grosor: 0.02, bisel: 0.04 }),
      mate('#5E9C8E')
    );
    bolsillo.position.set(0, 1.08, FRENTE);
    g.add(bolsillo);
    return g;
  },
};

function cambiarPrenda(subcategoriaId, objeto, THREE) {
  objeto.updateMatrixWorld(true);
  const mallas = [];
  objeto.traverse((n) => n.isMesh && mallas.push(n));
  if (!mallas.length) return;
  const padre = mallas[0].parent;
  // Caja del modelo original en el espacio de su padre.
  const caja = new THREE.Box3();
  mallas.forEach((m) => {
    m.geometry.computeBoundingBox();
    caja.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix));
  });
  mallas.forEach((m) => m.parent.remove(m));

  const mate = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
  const prenda = PRENDAS[subcategoriaId](THREE, mate);
  prenda.rotation.y = -0.3; // un poco de lado: se nota el volumen
  prenda.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  prenda.updateMatrixWorld(true);
  const propia = new THREE.Box3().setFromObject(prenda);
  const tam = propia.getSize(new THREE.Vector3());
  const objetivo = caja.getSize(new THREE.Vector3());
  const escala = Math.min(objetivo.x / tam.x, objetivo.y / tam.y);
  const raiz = new THREE.Group();
  raiz.add(prenda);
  prenda.position.set(
    -(propia.min.x + propia.max.x) / 2,
    -propia.min.y,
    -(propia.min.z + propia.max.z) / 2
  );
  raiz.scale.setScalar(escala);
  raiz.position.set((caja.min.x + caja.max.x) / 2, caja.min.y, (caja.min.z + caja.max.z) / 2);
  padre.add(raiz);
}

function ajustarForma(subcategoriaId, objeto, THREE) {
  if (PRENDAS[subcategoriaId]) cambiarPrenda(subcategoriaId, objeto, THREE);
  if (subcategoriaId === 'aseo-bucal') {
    // Los dos cepillos venían uno detrás del otro (de frente se veía uno
    // solo): se giran un cuarto de vuelta alrededor del eje del vaso para
    // que queden uno a cada lado.
    objeto.traverse((n) => {
      if (!n.isMesh) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      if (mats.some((m) => m.map)) n.geometry.rotateZ(Math.PI / 2);
    });
  }
}

/**
 * Corrige colores y agrega la calcomanía al frente (+z) del objeto.
 * @param {string} subcategoriaId
 * @param {THREE.Object3D} objeto  ya ubicado/escalado
 * @param {typeof import('three')} THREE
 */
export function ajustarModelo(subcategoriaId, objeto, THREE) {
  ajustarForma(subcategoriaId, objeto, THREE);
  const colores = COLORES[subcategoriaId];
  if (colores) {
    objeto.traverse((n) => {
      if (!n.isMesh) return;
      (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
        const c = colores[m.name];
        if (!c) return;
        m.color.set(c.color);
        m.metalness = c.metalness;
        m.roughness = c.roughness;
        if (c.opacity !== undefined) {
          m.transparent = true;
          m.opacity = c.opacity;
        }
      });
    });
  }

  const dibujar = CALCOMANIAS[subcategoriaId];
  if (dibujar) {
    objeto.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(objeto);
    const tam = caja.getSize(new THREE.Vector3());
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = 256;
    dibujar(lienzo.getContext('2d'), 256);
    const textura = new THREE.CanvasTexture(lienzo);
    if ('colorSpace' in textura) textura.colorSpace = THREE.SRGBColorSpace;
    const lado = Math.min(tam.x, tam.y) * 0.5;
    const calco = new THREE.Mesh(
      new THREE.PlaneGeometry(lado, lado),
      new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthWrite: false })
    );
    // En coordenadas del mundo: al frente, centrada.
    const centro = caja.getCenter(new THREE.Vector3());
    const pos = new THREE.Vector3(centro.x, centro.y, caja.max.z + tam.z * 0.01);
    objeto.worldToLocal(pos);
    calco.position.copy(pos);
    // Compensa la escala del objeto para que la calcomanía mida "lado".
    const escala = objeto.getWorldScale(new THREE.Vector3());
    calco.scale.set(1 / escala.x, 1 / escala.y, 1);
    calco.renderOrder = 2;
    objeto.add(calco);
  }
  return objeto;
}
