// ============================================================
// gatos.js — monta el gato 3D (gato3d.js) sin cargar three.js al
// arrancar la página: se importa solo cuando hay un gato en pantalla.
// ============================================================

let modulo = null;
const cargar = () => (modulo ??= import('./gato3d.js?v=20261030m'));

export function montarGatos(raiz) {
  if (!raiz.querySelector('[data-gato3d]')) return;
  cargar()
    .then((m) => m.montarGatos(raiz))
    .catch(() => {
      // sin three.js: se muestra el gato 2D
      raiz.querySelectorAll('[data-gato3d]').forEach((el) => el.classList.add('gato3d--sin3d'));
    });
}

export function limpiarGatos() {
  modulo?.then((m) => m.limpiarGatos()).catch(() => {});
}
