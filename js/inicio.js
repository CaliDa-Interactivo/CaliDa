// ============================================================
// inicio.js — pantallas 1 y 2.
//   #/        Pantalla 1 · Bienvenida
//   #/entrar  Pantalla 2 · Elige tu perfil
// ============================================================

import { renderEncabezado, LOGO_CRUZ_ROJA } from './encabezado.js';
import { renderMascota, decir } from './mascota.js';
import { isLoggedIn } from './store.js';
import { montarGatos } from './gatos.js';

// Recorrido del donante: estantería → subcategorías → mapa → ficha.
export const RUTA_DONANTE = '#/donante/estanteria';

// --- Pantalla 1 · Bienvenida --------------------------------------------
// 1) Intro: la cámara baja desde el cielo hasta el gato, que dice dos
//    mensajes en un globo grande (el principal y luego una invitación).
//    Se ve cada vez que se llega a esta pantalla, se puede saltar y no
//    aparece si el sistema pide reducir el movimiento.
// 2) Portada (distribución de la referencia del equipo): a la izquierda
//    "CaliDa" con los colores del logo, la colaboración con la Cruz Roja,
//    el mensaje y "Siguiente"; a la derecha una isla flotante en 3D con
//    mesas, cajas llenas de donaciones y el gato; de fondo, un sol y
//    formas suaves que flotan.

const MENSAJE_PRINCIPAL = 'En una emergencia, ayudar también es saber dónde hace falta.';
const MENSAJE_SEGUNDO = 'Aquí te mostraré a dónde llevar tus donaciones.';
const DURACION_INTRO = 11400; // ms (bajada de cámara + dos mensajes)

export function renderBienvenida() {
  return {
    html: `
    <section class="vista pantalla-entrada portada">
      <div class="portada__fondo" aria-hidden="true">
        <span class="portada__mancha portada__mancha--1"></span>
        <span class="portada__mancha portada__mancha--2"></span>
        <span class="portada__mancha portada__mancha--3"></span>
        <span class="portada__punto portada__punto--2"></span>
        <span class="portada__punto portada__punto--3"></span>
      </div>

      <div class="portada__contenido">
        <div class="portada__texto">
          <h1 class="portada__titulo">
            <span class="portada__cali">Cali</span><span class="portada__da">Da</span><span class="visually-hidden">: ${MENSAJE_PRINCIPAL}</span>
          </h1>
          <p class="portada__colabora">
            En colaboración con
            <span class="portada__logo-cr"><img src="${LOGO_CRUZ_ROJA}" alt="Cruz Roja" width="401" height="104" /></span>
          </p>
          <div class="portada__acciones">
            <a class="boton-principal" href="#/entrar" data-siguiente>
              Siguiente
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </div>

        <div class="portada__escena" aria-hidden="true">
          <span class="portada__sol"></span>
          <div class="portada__isla"></div>
          <div class="portada__gato gato3d" data-gato3d-diferido data-pose="saluda" data-encuadre="completo" data-luz="isla"></div>
        </div>
      </div>

      <div class="intro" data-intro hidden>
        <div class="intro__cielo" aria-hidden="true">
          <span class="intro__sol"></span>
          <span class="intro__nube intro__nube--1"></span>
          <span class="intro__nube intro__nube--2"></span>
          <span class="intro__nube intro__nube--3"></span>
        </div>
        <div class="intro__mundo">
          <div class="intro__suelo" aria-hidden="true"></div>
          <div class="intro__escena">
            <p class="intro__globo" aria-hidden="true">
              <span class="intro__mensaje intro__mensaje--1">${MENSAJE_PRINCIPAL}</span>
              <span class="intro__mensaje intro__mensaje--2">${MENSAJE_SEGUNDO}</span>
            </p>
            <div class="intro__gato gato3d" data-gato3d data-pose="saluda" data-encuadre="completo" aria-hidden="true"></div>
          </div>
        </div>
        <button type="button" class="intro__saltar" data-saltar-intro>Saltar</button>
      </div>
    </section>
  `,
    init(contenedor) {
      const intro = contenedor.querySelector('[data-intro]');
      const portada = contenedor.querySelector('.portada');
      const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let temporizador = 0;

      // Para que la intro no se trabe, la isla 3D y el gato de la portada
      // se cargan después de la bajada de la cámara (o al saltar la intro).
      let liberarIsla = null;
      let salir = false;
      let portadaMontada = false;
      let temporizadorPortada = 0;
      function montarPortada() {
        clearTimeout(temporizadorPortada);
        if (portadaMontada || salir) return;
        portadaMontada = true;
        const gato = contenedor.querySelector('[data-gato3d-diferido]');
        if (gato) {
          gato.removeAttribute('data-gato3d-diferido');
          gato.setAttribute('data-gato3d', '');
          montarGatos(contenedor.querySelector('.portada__escena'));
        }
        import('./inicio3d.js?v=20261029e')
          .then(({ montarIsla }) => {
            if (!salir) liberarIsla = montarIsla(contenedor.querySelector('.portada__isla'));
          })
          .catch(() => {});
      }

      function terminarIntro() {
        clearTimeout(temporizador);
        montarPortada();
        if (intro.hidden) return;
        intro.classList.add('intro--saliendo');
        portada.classList.add('portada--entrando');
        setTimeout(() => {
          intro.hidden = true;
          intro.classList.remove('intro--saliendo', 'intro--andando');
        }, 650);
      }

      function mostrarIntro() {
        if (reducido) return;
        intro.hidden = false;
        portada.classList.remove('portada--entrando');
        // reinicia la animación de la cámara
        intro.classList.remove('intro--andando');
        void intro.offsetWidth;
        intro.classList.add('intro--andando');
        temporizador = setTimeout(terminarIntro, DURACION_INTRO);
        // La cámara termina de bajar a los 3,6 s: ahí se carga lo demás,
        // cuando la escena ya está quieta.
        temporizadorPortada = setTimeout(() => {
          (window.requestIdleCallback ?? ((f) => setTimeout(f, 0)))(montarPortada, { timeout: 1500 });
        }, 4200);
      }

      // La intro se ve cada vez que se llega a la pantalla principal.
      if (reducido) {
        portada.classList.add('portada--entrando');
        montarPortada();
      } else mostrarIntro();

      contenedor.querySelector('[data-saltar-intro]').addEventListener('click', terminarIntro);

      // "Siguiente": la portada se desvanece y la pantalla de perfiles
      // aparece también con un desvanecimiento (sin deslizarse).
      contenedor.querySelector('[data-siguiente]').addEventListener('click', (evento) => {
        if (reducido) return;
        evento.preventDefault();
        portada.classList.add('portada--saliendo');
        setTimeout(() => {
          document.getElementById('app').dataset.transicion = 'desvanecer';
          location.hash = '#/entrar';
        }, 450);
      });

      return () => {
        salir = true;
        clearTimeout(temporizador);
        clearTimeout(temporizadorPortada);
        liberarIsla?.();
      };
    },
  };
}

// --- Pantalla 2 · Elige tu perfil -------------------------------------------
const MENSAJES_PERFIL = {
  reposo: '¿Cómo vas a ayudar hoy?',
  donador: '¡Vamos a ver qué necesita Cali!',
  admin: '¡Hola, equipo! Entra con tu usuario.',
};

export function renderEntrar() {
  // Si el administrador ya tiene la sesión abierta, entra directo a su menú.
  const destinoAdmin = isLoggedIn() ? '#/admin/menu' : '#/admin/login';

  return {
    html: `
      <section class="vista pantalla-entrada">
        ${renderEncabezado()}
        <a class="boton-atras enlace-volver" href="#/">← Volver</a>

        <div class="perfiles">
          <div>
            <h1>¿Cómo quieres entrar a CaliDa?</h1>
            <div class="perfiles__tarjetas">
              <article class="tarjeta-entrada tarjeta-entrada--hover tarjeta-entrada--donador" data-perfil="donador">
                <div class="tarjeta-ilustracion tarjeta-ilustracion--foto" aria-hidden="true">
                  <img src="assets/entrar/donador.jpg" alt="" width="1300" height="500" loading="eager" />
                </div>
                <h2>Quiero ayudar</h2>
                <p>Mira qué necesita cada centro de acopio, en qué zona está y cómo llegar. No necesitas registrarte.</p>
                <a class="boton-principal boton-ancho" href="${RUTA_DONANTE}">
                  Entrar como donador <span aria-hidden="true">→</span>
                </a>
              </article>

              <article class="tarjeta-entrada tarjeta-entrada--hover" data-perfil="admin">
                <div class="tarjeta-ilustracion tarjeta-ilustracion--admin tarjeta-ilustracion--foto" aria-hidden="true">
                  <img src="assets/entrar/admin.jpg" alt="" width="1300" height="500" loading="eager" />
                </div>
                <h2>Administro un centro</h2>
                <p>Actualiza lo que necesita tu centro y registra donaciones y despachos.</p>
                <a class="boton-contorno boton-ancho" href="${destinoAdmin}">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                    <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Iniciar sesión
                </a>
              </article>
            </div>
          </div>

          ${renderMascota({ pose: 'quieto', mensaje: MENSAJES_PERFIL.reposo })}
        </div>
      </section>
    `,
    init(contenedor) {
      // La burbuja del gato reacciona al hover o al foco en cada tarjeta.
      contenedor.querySelectorAll('[data-perfil]').forEach((tarjeta) => {
        const perfil = tarjeta.dataset.perfil;
        // Si ya se cambió de pantalla, la tarjeta no está en la página:
        // no se toca la burbuja de la pantalla nueva.
        const entrar = () => tarjeta.isConnected && decir(contenedor, MENSAJES_PERFIL[perfil]);
        const salir = () => {
          if (!tarjeta.isConnected) return;
          if (!tarjeta.matches(':hover') && !tarjeta.contains(document.activeElement)) {
            decir(contenedor, MENSAJES_PERFIL.reposo);
          }
        };
        tarjeta.addEventListener('pointerenter', entrar);
        tarjeta.addEventListener('focusin', entrar);
        tarjeta.addEventListener('pointerleave', salir);
        tarjeta.addEventListener('focusout', () => setTimeout(salir, 0));
      });

    },
  };
}
