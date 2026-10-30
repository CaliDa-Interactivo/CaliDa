// ============================================================
// escala.js — pantallas muy grandes (p. ej. 4480 × 2520).
// Todo se diseñó para ~1920 × 1080. En pantallas más grandes la
// página entera se escala en proporción (recuadros, elementos y
// tipografía por igual) con `zoom` en <html>; en pantallas normales
// y en celular el factor es 1 y no cambia nada.
//
// Con zoom, el navegador también multiplica las unidades de pantalla
// (vh, vw…): el CSS usa var(--vh), var(--vw)… que se dividen por el
// factor (--z), así lo de "pantalla completa" sigue midiendo la pantalla.
// Ojo en JS: getBoundingClientRect() y clientX vienen ya escalados
// (multiplicados por el factor); clientWidth, offsetWidth y los px de
// style están sin escalar. Para pasar de unos a otros: factorEscala().
// ============================================================

const BASE = { ancho: 1920, alto: 1080 };

export function factorEscala() {
  return Number(document.documentElement.dataset.escala) || 1;
}

export function aplicarEscala() {
  const z = Math.max(1, Math.min(window.innerWidth / BASE.ancho, window.innerHeight / BASE.alto));
  const factor = Math.round(z * 100) / 100;
  const raiz = document.documentElement;
  if (factor === factorEscala() && raiz.dataset.escala) return;
  raiz.dataset.escala = String(factor);
  raiz.style.setProperty('--z', String(factor));
  raiz.style.zoom = factor === 1 ? '' : String(factor);
}

/** Resolución de un lienzo 3D: con el zoom se dibuja con más píxeles (si no, se vería borroso). */
export function resolucion(maximo) {
  return Math.min(Math.min(window.devicePixelRatio || 1, maximo) * factorEscala(), 3);
}
