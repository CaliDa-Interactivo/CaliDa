// ============================================================
// admin/registro.js — Registro de un líder de centro de acopio.
// Se llega desde el login ("¿No tienes cuenta? Regístrate").
// La cuenta queda ligada al centro elegido (auth.js, registrar()).
// ============================================================

import { isLoggedIn, getCentros } from '../store.js';
import { registrar } from '../auth.js?v=20261029a';
import { renderEncabezado } from '../encabezado.js';
import { renderMascota, decir } from '../mascota.js';
import { renderPaisaje } from '../paisaje.js';

const MENSAJES = {
  reposo: '¡Qué bueno que te unas! Cuéntame de ti y de tu centro.',
  escribiendo: 'Vas muy bien, sigue así.',
  error: 'Falta algo por revisar. ¡Tú puedes!',
  exito: '¡Bienvenido al equipo! Vamos a tu centro.',
};

const LARGO_MINIMO = 8;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapar(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

export function render() {
  if (isLoggedIn()) {
    location.replace('#/admin/menu');
    return '<section class="vista"></section>';
  }

  const centros = [...getCentros()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const opciones = centros
    .map((c) => `<option value="${escapar(c.id)}">${escapar(c.nombre)} · ${escapar(c.zona)}</option>`)
    .join('');

  return {
    html: `
      <section class="vista pantalla-entrada vista-registro">
        ${renderEncabezado()}
        <a class="enlace-volver" href="#/admin/login">← Volver</a>

        <div class="login-admin">
          <div class="login-dividido">
          <div class="login-dividido__arte">
            ${renderPaisaje()}
            <p class="login-dividido__bienvenida" aria-hidden="true">BIENVENIDO</p>
          </div>
          <div class="tarjeta-entrada">
            <h1>Crea tu cuenta</h1>
            <p>Registra tu centro de acopio para manejar sus insumos, donaciones y despachos.</p>

            <form novalidate>
              <div class="campo-entrada">
                <label for="registro-nombre">Nombre completo</label>
                <input id="registro-nombre" name="nombre" type="text" autocomplete="name" required />
              </div>

              <div class="campo-entrada">
                <label for="registro-correo">Correo</label>
                <input id="registro-correo" name="correo" type="email" autocomplete="email"
                       inputmode="email" required />
              </div>

              <div class="campo-entrada">
                <label for="registro-centro">Centro de acopio</label>
                <select id="registro-centro" name="centro" class="campo__select" required>
                  <option value="">Elige tu centro</option>
                  ${opciones}
                </select>
              </div>

              <div class="campo-entrada">
                <label for="registro-contrasena">Contraseña</label>
                <input id="registro-contrasena" name="contrasena" type="password"
                       autocomplete="new-password" minlength="${LARGO_MINIMO}" required
                       aria-describedby="registro-contrasena-ayuda" />
                <small class="campo__ayuda" id="registro-contrasena-ayuda">Mínimo ${LARGO_MINIMO} caracteres.</small>
              </div>

              <div class="campo-entrada">
                <label for="registro-confirmar">Confirma la contraseña</label>
                <input id="registro-confirmar" name="confirmar" type="password"
                       autocomplete="new-password" required />
              </div>

              <p class="alerta-entrada" role="alert" hidden></p>

              <button class="boton-principal boton-ancho" type="submit">Crear cuenta</button>
            </form>

            <p class="login-admin__registro">
              ¿Ya tienes cuenta? <a class="enlace-azul" href="#/admin/login">Inicia sesión</a>
            </p>
          </div>

          </div>
          ${renderMascota({ pose: 'quieto', mensaje: MENSAJES.reposo })}
        </div>
      </section>
    `,
    init(contenedor) {
      const form = contenedor.querySelector('form');
      const { nombre, correo, centro, contrasena, confirmar } = form;
      const campos = [nombre, correo, centro, contrasena, confirmar];
      const alerta = contenedor.querySelector('.alerta-entrada');
      const botonCrear = form.querySelector('[type="submit"]');
      let enviando = false;

      campos.forEach((campo) =>
        campo.addEventListener(campo === centro ? 'change' : 'input', () => {
          if (enviando) return;
          alerta.hidden = true;
          campo.removeAttribute('aria-invalid');
          decir(contenedor, MENSAJES.escribiendo);
        })
      );

      function mostrarError(texto, campo) {
        alerta.textContent = texto;
        alerta.hidden = false;
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
        decir(contenedor, MENSAJES.error);
      }

      // Devuelve el primer problema del formulario, o null si está bien.
      function validar() {
        if (!nombre.value.trim()) return ['Escribe tu nombre completo.', nombre];
        if (!CORREO_VALIDO.test(correo.value.trim())) return ['Escribe un correo válido, por ejemplo nombre@correo.com.', correo];
        if (!centro.value) return ['Elige el centro de acopio que lideras.', centro];
        if (contrasena.value.length < LARGO_MINIMO) return [`La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`, contrasena];
        if (confirmar.value !== contrasena.value) return ['Las contraseñas no coinciden.', confirmar];
        return null;
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (enviando) return;
        const problema = validar();
        if (problema) {
          mostrarError(...problema);
          return;
        }

        enviando = true;
        botonCrear.setAttribute('aria-busy', 'true');
        let resultado = { ok: false };
        try {
          resultado = await registrar({
            nombre: nombre.value,
            correo: correo.value,
            centroId: centro.value,
            contrasena: contrasena.value,
          });
        } catch (error) {
          console.error('No se pudo crear la cuenta:', error);
        }
        botonCrear.removeAttribute('aria-busy');

        if (resultado.ok) {
          decir(contenedor, MENSAJES.exito);
          contrasena.value = '';
          confirmar.value = '';
          setTimeout(() => (location.hash = '#/admin/bienvenida'), 900);
          return;
        }
        enviando = false;
        mostrarError(
          resultado.motivo === 'existe'
            ? 'Ya hay una cuenta con ese correo. Inicia sesión o usa otro correo.'
            : 'No pudimos crear la cuenta. Inténtalo de nuevo.',
          correo
        );
      });
    },
  };
}
