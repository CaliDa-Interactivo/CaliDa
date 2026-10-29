// ============================================================
// admin/registro.js — Registro de un líder de centro de acopio.
// Se llega desde el login ("¿No tienes cuenta? Regístrate").
// Crea el centro con los datos que ve el donante en el mapa y en la
// ficha (nombre, dirección, zona, horario, teléfono, ubicación) y una
// cuenta ligada a él (auth.js, registrar()).
// ============================================================

import { isLoggedIn, crearCentro } from '../store.js?v=20261029b';
import { ZONAS } from '../data.js';
import { registrar } from '../auth.js?v=20261029b';
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

// Punto aproximado de cada zona, si el líder no comparte la ubicación
// exacta del centro (el mapa acomoda la casa dentro de su zona).
const PUNTO_ZONA = {
  Norte: [3.485, -76.515],
  Occidente: [3.445, -76.555],
  Centro: [3.451, -76.532],
  Oriente: [3.43, -76.495],
  Sur: [3.39, -76.54],
};
const ORDEN_ZONAS = ['Norte', 'Occidente', 'Centro', 'Oriente', 'Sur'].filter((z) => ZONAS.includes(z));

// Área de Cali: una ubicación fuera de aquí no puede ser la del centro.
function estaEnCali(lat, lng) {
  return lat > 3.3 && lat < 3.53 && lng > -76.6 && lng < -76.45;
}

// "08:00" → "8:00 a.m." (como el horario de los demás centros).
function horaBonita(valor) {
  const [h, m] = valor.split(':').map(Number);
  const sufijo = h < 12 ? 'a.m.' : 'p.m.';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

export function render() {
  if (isLoggedIn()) {
    location.replace('#/admin/menu');
    return '<section class="vista"></section>';
  }

  const zonas = ORDEN_ZONAS.map(
    (z) => `
      <label class="registro-zona">
        <input type="radio" name="zona" value="${z}" required />
        <span>${z}</span>
      </label>`
  ).join('');

  return {
    html: `
      <section class="vista pantalla-entrada vista-registro">
        ${renderEncabezado()}
        <a class="boton-atras enlace-volver" href="#/admin/login">← Volver</a>

        <div class="login-admin">
          <div class="tarjeta-entrada registro-tarjeta">
            <h1>Crea tu cuenta</h1>
            <p>Registra tu centro de acopio. Los donantes verán estos datos en el mapa y en la ficha del centro.</p>

            <form novalidate>
              <fieldset class="registro-grupo">
                <legend>Tus datos</legend>
                <div class="campo-entrada">
                  <label for="registro-nombre">Tu nombre completo</label>
                  <input id="registro-nombre" name="nombre" type="text" autocomplete="name" required />
                </div>
                <div class="campo-entrada">
                  <label for="registro-correo">Correo</label>
                  <input id="registro-correo" name="correo" type="email" autocomplete="email"
                         inputmode="email" required />
                </div>
              </fieldset>

              <fieldset class="registro-grupo">
                <legend>Tu centro de acopio</legend>
                <div class="campo-entrada">
                  <label for="registro-centro">Nombre del centro</label>
                  <input id="registro-centro" name="centro" type="text" autocomplete="organization"
                         placeholder="Ej.: Polideportivo El Diamante" required />
                </div>
                <div class="campo-entrada">
                  <label for="registro-direccion">Dirección</label>
                  <input id="registro-direccion" name="direccion" type="text" autocomplete="street-address"
                         placeholder="Ej.: Calle 5 # 38-20, barrio San Fernando" required />
                </div>
                <div class="campo-entrada campo-entrada--zonas" role="radiogroup" aria-labelledby="registro-zona-titulo">
                  <span class="campo-entrada__titulo" id="registro-zona-titulo">Zona de Cali</span>
                  <div class="registro-zonas">${zonas}</div>
                </div>
                <div class="registro-fila">
                  <div class="campo-entrada">
                    <label for="registro-abre">Abre a las</label>
                    <input id="registro-abre" name="abre" type="time" value="08:00" required />
                  </div>
                  <div class="campo-entrada">
                    <label for="registro-cierra">Cierra a las</label>
                    <input id="registro-cierra" name="cierra" type="time" value="17:00" required />
                  </div>
                </div>
                <div class="campo-entrada">
                  <label for="registro-telefono">Teléfono del centro</label>
                  <input id="registro-telefono" name="telefono" type="tel" inputmode="numeric"
                         autocomplete="tel" maxlength="10" placeholder="Ej.: 3001234567" required
                         aria-describedby="registro-telefono-ayuda" />
                  <small class="campo__ayuda" id="registro-telefono-ayuda">Celular de 10 dígitos o fijo de 7.</small>
                </div>
                <div class="campo-entrada">
                  <span class="campo-entrada__titulo">Ubicación en el mapa</span>
                  <button type="button" class="boton-contorno registro-ubicacion" data-ubicacion>
                    📍 Usar mi ubicación actual (estoy en el centro)
                  </button>
                  <small class="campo__ayuda" data-ubicacion-estado aria-live="polite">
                    Opcional. Si no la compartes, tu centro aparece en el mapa dentro de su zona y "Cómo llegar" usa la dirección.
                  </small>
                </div>
              </fieldset>

              <fieldset class="registro-grupo">
                <legend>Tu contraseña</legend>
                <div class="campo-entrada">
                  <label for="registro-contrasena">Contraseña (mínimo ${LARGO_MINIMO} caracteres)</label>
                  <input id="registro-contrasena" name="contrasena" type="password"
                         autocomplete="new-password" minlength="${LARGO_MINIMO}" required
                         aria-describedby="registro-contrasena-ayuda" />
                  <small class="campo__ayuda registro-contador" id="registro-contrasena-ayuda" data-contador>
                    Debe tener al menos ${LARGO_MINIMO} caracteres.
                  </small>
                </div>
                <div class="campo-entrada">
                  <label for="registro-confirmar">Confirma la contraseña</label>
                  <input id="registro-confirmar" name="confirmar" type="password"
                         autocomplete="new-password" required />
                </div>
              </fieldset>

              <p class="alerta-entrada" role="alert" hidden></p>

              <button class="boton-principal boton-ancho" type="submit">Crear cuenta</button>
            </form>

            <p class="login-admin__registro">
              ¿Ya tienes cuenta? <a class="enlace-azul" href="#/admin/login">Inicia sesión</a>
            </p>
          </div>

          ${renderMascota({ pose: 'quieto', mensaje: MENSAJES.reposo })}
        </div>
      </section>
    `,
    init(contenedor) {
      const form = contenedor.querySelector('form');
      const { nombre, correo, centro, direccion, abre, cierra, telefono, contrasena, confirmar } = form;
      const radiosZona = [...form.querySelectorAll('input[name="zona"]')];
      const alerta = contenedor.querySelector('.alerta-entrada');
      const botonCrear = form.querySelector('[type="submit"]');
      const botonUbicacion = contenedor.querySelector('[data-ubicacion]');
      const estadoUbicacion = contenedor.querySelector('[data-ubicacion-estado]');
      const contador = contenedor.querySelector('[data-contador]');
      let ubicacion = null;
      let enviando = false;

      form.addEventListener('input', (e) => {
        if (enviando) return;
        alerta.hidden = true;
        e.target.removeAttribute?.('aria-invalid');
        if (e.target.name === 'zona') radiosZona.forEach((r) => r.removeAttribute('aria-invalid'));
        decir(contenedor, MENSAJES.escribiendo);
      });

      // Teléfono: solo números.
      telefono.addEventListener('input', () => {
        telefono.value = telefono.value.replace(/\D/g, '').slice(0, 10);
      });

      // La contraseña muestra cuántos caracteres faltan.
      contrasena.addEventListener('input', () => {
        const faltan = LARGO_MINIMO - contrasena.value.length;
        contador.textContent = faltan > 0
          ? `Faltan ${faltan} ${faltan === 1 ? 'carácter' : 'caracteres'} (mínimo ${LARGO_MINIMO}).`
          : '✓ Tiene al menos 8 caracteres.';
        contador.classList.toggle('registro-contador--ok', faltan <= 0);
      });

      botonUbicacion.addEventListener('click', () => {
        if (!navigator.geolocation) {
          estadoUbicacion.textContent = 'Este navegador no puede compartir la ubicación. Usaremos la dirección.';
          return;
        }
        estadoUbicacion.textContent = 'Buscando tu ubicación…';
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            if (!estaEnCali(coords.latitude, coords.longitude)) {
              ubicacion = null;
              estadoUbicacion.textContent = 'Tu ubicación está fuera de Cali. Usaremos la zona y la dirección.';
              return;
            }
            ubicacion = { lat: coords.latitude, lng: coords.longitude };
            estadoUbicacion.textContent = '✓ Ubicación guardada. Así sale tu centro en el mapa.';
            botonUbicacion.textContent = '📍 Ubicación lista (tocar para actualizar)';
          },
          () => {
            estadoUbicacion.textContent = 'No pudimos obtener la ubicación. Usaremos la zona y la dirección.';
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });

      function mostrarError(texto, campo) {
        alerta.textContent = texto;
        alerta.hidden = false;
        const campos = Array.isArray(campo) ? campo : [campo];
        campos.forEach((c) => c.setAttribute('aria-invalid', 'true'));
        campos[0].focus();
        decir(contenedor, MENSAJES.error);
      }

      // Devuelve el primer problema del formulario, o null si está bien.
      function validar() {
        const zona = radiosZona.find((r) => r.checked);
        const digitos = telefono.value.replace(/\D/g, '');
        if (!nombre.value.trim()) return ['Escribe tu nombre completo.', nombre];
        if (!CORREO_VALIDO.test(correo.value.trim())) return ['Escribe un correo válido, por ejemplo nombre@correo.com.', correo];
        if (centro.value.trim().length < 3) return ['Escribe el nombre de tu centro de acopio.', centro];
        if (direccion.value.trim().length < 5) return ['Escribe la dirección del centro.', direccion];
        if (!zona) return ['Elige la zona de Cali donde está el centro.', radiosZona];
        if (!abre.value || !cierra.value || abre.value >= cierra.value) return ['Revisa el horario: la hora de cierre debe ser después de la de apertura.', cierra];
        if (digitos.length !== 10 && digitos.length !== 7) return ['El teléfono debe tener 10 dígitos (celular) o 7 (fijo).', telefono];
        if (contrasena.value.length < LARGO_MINIMO) return [`La contraseña debe tener mínimo ${LARGO_MINIMO} caracteres.`, contrasena];
        if (confirmar.value !== contrasena.value) return ['Las contraseñas no coinciden.', confirmar];
        return null;
      }

      function telefonoBonito(digitos) {
        return digitos.length === 10
          ? `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`
          : `${digitos.slice(0, 3)} ${digitos.slice(3)}`;
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
        const zona = radiosZona.find((r) => r.checked).value;
        let resultado = { ok: false };
        try {
          resultado = await registrar({
            nombre: nombre.value,
            correo: correo.value,
            contrasena: contrasena.value,
            // El centro se crea solo si el correo está libre.
            crearCentro: () => {
              const [lat, lng] = ubicacion ? [ubicacion.lat, ubicacion.lng] : PUNTO_ZONA[zona];
              return crearCentro({
                nombre: centro.value,
                direccion: direccion.value,
                zona,
                horario: `${horaBonita(abre.value)} – ${horaBonita(cierra.value)}`,
                telefono: telefonoBonito(telefono.value.replace(/\D/g, '')),
                lat,
                lng,
                ubicacionExacta: Boolean(ubicacion),
              }).id;
            },
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
