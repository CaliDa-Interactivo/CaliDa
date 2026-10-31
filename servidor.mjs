// ============================================================
// servidor.mjs — servidor local para abrir CaliDa en el navegador.
// Uso: `npm run dev` (o `node servidor.mjs`) y abrir la dirección que
// muestra. No necesita instalar nada: solo Node.js.
//
// CaliDa no se puede abrir con doble clic en index.html: el navegador
// bloquea los módulos de JavaScript y la carga de los modelos 3D desde
// file://. Este servidor sirve la carpeta en http://localhost, sin caché
// (siempre se ve la última versión de los archivos).
// ============================================================

import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(process.argv[2] ?? fileURLToPath(new URL('.', import.meta.url)));
const PUERTO = Number(process.argv[3] ?? process.env.PORT ?? 8000);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
};

const servidor = http.createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let archivo = normalize(join(RAIZ, ruta));
  // No se sale de la carpeta del proyecto.
  if (archivo !== RAIZ && !archivo.startsWith(RAIZ + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html');
    const tam = statSync(archivo).size;
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': tam,
      'Cache-Control': 'no-store',
    });
    createReadStream(archivo).pipe(res);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
});

servidor.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PUERTO} ya está en uso. Prueba con otro: node servidor.mjs . 8080`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

servidor.listen(PUERTO, () => {
  console.log(`\n  CaliDa está lista en  http://localhost:${PUERTO}\n  (Ctrl + C para detener)\n`);
});
