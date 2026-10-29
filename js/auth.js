// ============================================================
// auth.js — autenticación del administrador (pantalla 3).
//
// Reglas:
//  - Cada cuenta está ligada a un centro de acopio. Además de las
//    cuentas de prueba, un líder de centro puede registrarse
//    (registrar(); se guardan en localStorage, clave CLAVE_CUENTAS).
//  - Nunca se guardan contraseñas en texto plano: solo una huella
//    PBKDF2-SHA256 (100 000 iteraciones, sal por cuenta).
//
// ⚠️ PROTOTIPO SIN BACKEND. Esto valida en el navegador contra
// cuentas de prueba. Para conectar la autenticación real, reemplazar
// el cuerpo de login() por una llamada al servidor, por ejemplo:
//
//   const r = await fetch('/api/auth/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ correo, contrasena }),
//   });
//   if (!r.ok) return { ok: false };
//   const { centroId } = await r.json();   // el servidor dice a qué centro pertenece
//   iniciarSesion(centroId);
//   return { ok: true, centroId };
//
// y quitar CUENTAS_PRUEBA. El resto de la app no cambia.
// ============================================================

import { iniciarSesion } from './store.js';

// Cuentas de prueba (ver CLAUDE.md): jairo.varela@calida.co y admin@calida.co
// La contraseña NO está en el código; solo su huella.
const CUENTAS_PRUEBA = [
  {
    correo: 'jairo.varela@calida.co',
    centroId: 'centro-jairo-varela',
    sal: 'z/mleJpBUHikTaR+lNyb0A==',
    huella: '/YSKzZuRB1bYfF8QQiRUJZ5U0cMX1LWTCFNLcFRE+jA=',
  },
  // Cuenta general de prueba del equipo (admin@calida.co), ligada al
  // mismo centro.
  {
    correo: 'admin@calida.co',
    centroId: 'centro-jairo-varela',
    sal: 'JNzufilmFTOPonALFfTmPw==',
    huella: '7ke+3FdC0luKQXU9aOD55kpTkWLxUAmNhgi5AyESb6A=',
  },
];

const ITERACIONES = 100000;

// Cuentas creadas con "Regístrate" (solo en este navegador).
const CLAVE_CUENTAS = 'calida_cuentas_v1';

function leerCuentasRegistradas() {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE_CUENTAS) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function todasLasCuentas() {
  return [...CUENTAS_PRUEBA, ...leerCuentasRegistradas()];
}

function normalizarCorreo(correo) {
  return correo.trim().toLowerCase();
}

function base64ABytes(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesABase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

async function huellaDe(contrasena, salB64) {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(contrasena),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64ABytes(salB64), iterations: ITERACIONES },
    clave,
    256
  );
  return bytesABase64(bits);
}

// Compara sin cortar en el primer carácter distinto.
function iguales(a, b) {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

/**
 * Valida correo y contraseña. Si coinciden, inicia la sesión del
 * centro de acopio ligado a la cuenta.
 * @returns {Promise<{ok: boolean, centroId?: string}>}
 */
export async function login(correo, contrasena) {
  const cuenta = todasLasCuentas().find((c) => c.correo === normalizarCorreo(correo));
  // Se calcula la huella aunque el correo no exista, para no revelar
  // por el tiempo de respuesta qué correos tienen cuenta.
  const huella = await huellaDe(contrasena, cuenta?.sal ?? CUENTAS_PRUEBA[0].sal);
  if (!cuenta || !iguales(huella, cuenta.huella)) return { ok: false };

  iniciarSesion(cuenta.centroId);
  return { ok: true, centroId: cuenta.centroId };
}

/**
 * Crea una cuenta de administrador ligada a un centro y abre su sesión.
 * @returns {Promise<{ok: boolean, motivo?: 'existe'}>}
 */
export async function registrar({ nombre, correo, centroId, contrasena }) {
  const correoNormal = normalizarCorreo(correo);
  if (todasLasCuentas().some((c) => c.correo === correoNormal)) {
    return { ok: false, motivo: 'existe' };
  }

  const sal = bytesABase64(crypto.getRandomValues(new Uint8Array(16)));
  const huella = await huellaDe(contrasena, sal);
  const cuentas = leerCuentasRegistradas();
  cuentas.push({ nombre: nombre.trim(), correo: correoNormal, centroId, sal, huella });
  localStorage.setItem(CLAVE_CUENTAS, JSON.stringify(cuentas));

  iniciarSesion(centroId);
  return { ok: true, centroId };
}
