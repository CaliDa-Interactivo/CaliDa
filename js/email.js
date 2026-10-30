// ============================================================
// email.js — correo automático al donante (Fase 5).
//
// El correo NO lo escribe ni lo envía el administrador: se genera
// solo cuando registra el despacho de la semana, con lo que el
// sistema ya guardó al registrar cada donación.
//
// Contenido: fecha en que la persona donó, número de lote (= semana
// del año del despacho), cuántas personas más donaron en ese lote,
// el gato 3D y el mapa real del Valle del Cauca con el trayecto.
//
// Envío: con EmailJS (ver js/config-correo.js). Cada correo también
// queda en la bandeja de prueba (#/correos-enviados) con su estado.
// Si EmailJS no está configurado, solo se guarda en la bandeja.
// ============================================================

import { guardarCorreoEnviado, actualizarCorreoEnviado, getCentro } from './store.js';
import { obtenerMunicipio } from './data.js';
import { distanciaKm, formatoKm } from './ubicacion.js';
import { EMAILJS, URL_PUBLICA } from './config-correo.js';

// Imágenes del correo: URLs públicas (GitHub Pages). El gato es una
// "foto" del modelo 3D y cada mapa es el contorno real del Valle del
// Cauca y sus vecinos, con el trayecto desde Cali (assets/correo/mapas/).
const URL_GATO = `${URL_PUBLICA}assets/correo/gato.png`;
const URL_LOGO = `${URL_PUBLICA}assets/logo-calida.png`;

// 'Guadalajara de Buga' → 'guadalajara-de-buga'
export function slugMunicipio(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ?v= para que Gmail no use la versión vieja guardada (sin el océano, oct 2026).
const urlMapa = (destino) => `${URL_PUBLICA}assets/correo/mapas/${slugMunicipio(destino.nombre)}.png?v=20261030i`;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// '06/10/2026' → '6 de octubre de 2026'
export function fechaLarga(ddmmaaaa) {
  const [dia, mes, anio] = ddmmaaaa.split('/').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

// Une varias fechas en orden. Si son del mismo mes: "6 y 8 de octubre
// de 2026"; si no: "30 de septiembre de 2026 y 2 de octubre de 2026".
function unirFechas(fechas) {
  const aOrdenable = (f) => f.split('/').reverse().join('');
  const unicas = [...new Set(fechas)].sort((a, b) => aOrdenable(a).localeCompare(aOrdenable(b)));
  const unir = (lista) => (lista.length === 1 ? lista[0] : `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}`);

  const mismoMes = unicas.every((f) => f.slice(3) === unicas[0].slice(3));
  if (unicas.length > 1 && mismoMes) {
    const dias = unicas.map((f) => String(Number(f.slice(0, 2))));
    return `${unir(dias)}${fechaLarga(unicas[0]).replace(/^\d+/, '')}`;
  }
  return unir(unicas.map(fechaLarga));
}

// --- Plantilla HTML del correo ---------------------------------------
// Tablas y estilos en línea: es lo único que respetan todos los
// clientes de correo (Gmail, Outlook, celular). Mismo estilo de la
// página: fondo salvia, tarjeta marfil muy redondeada, botones en
// píldora con relieve y la paleta oficial.

const FUENTE = 'font-family:Montserrat,Arial,Helvetica,sans-serif;';

export function plantillaCorreo({ fechas, numeroLote, otrasPersonas, destino, origen, centroNombre }) {
  const variasDonaciones = new Set(fechas).size > 1;
  const textoDonacion = variasDonaciones
    ? `Tus donaciones del <strong>${unirFechas(fechas)}</strong> ya fueron entregadas.`
    : `Tu donación del <strong>${unirFechas(fechas)}</strong> ya fue entregada.`;

  const textoLote =
    otrasPersonas > 0
      ? `Viajó en el <strong>Lote #${numeroLote}</strong> junto con la ayuda de otras <strong>${otrasPersonas} ${otrasPersonas === 1 ? 'persona' : 'personas'}</strong>.`
      : `Viajó en el <strong>Lote #${numeroLote}</strong>.`;

  const esCali = destino.nombre === 'Santiago de Cali';
  const km = formatoKm(distanciaKm(origen, destino));
  const urlRuta = `https://www.google.com/maps/dir/?api=1&origin=${origen.lat},${origen.lng}&destination=${destino.lat},${destino.lng}`;
  const textoTrayecto = esCali
    ? `Se quedó en <strong>Santiago de Cali</strong>, donde más hacía falta.`
    : `Salió de <strong>${centroNombre}</strong> en Cali y llegó a <strong>${destino.nombre}</strong> · unos ${km} en línea recta.`;

  // Pensado para Gmail: fondos también con bgcolor (Gmail a veces ignora
  // "background" en style), relieve con bordes en vez de sombras, cada
  // style en una sola línea y la fuente con respaldo (Gmail no carga
  // Montserrat: usa Arial).
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CaliDa</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#86B5A9;" bgcolor="#86B5A9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#86B5A9" style="background-color:#86B5A9;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFF8ED" style="width:100%;max-width:560px;background-color:#FFF8ED;border-radius:32px;border:3px solid #FFFFFF;border-bottom:8px solid #6E9F92;${FUENTE}color:#011E41;">
<tr><td align="center" style="padding:24px 24px 6px;">
<img src="${URL_LOGO}" alt="CaliDa" width="150" style="display:block;width:150px;height:auto;border:0;outline:none;">
</td></tr>
<tr><td align="center" style="padding:10px 24px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#E3EFEA" style="background-color:#E3EFEA;border-radius:28px;border-bottom:5px solid #C3DAD2;">
<tr><td align="center" style="padding:18px 36px 8px;">
<img src="${URL_GATO}" alt="El gato de CaliDa" width="170" style="display:block;width:170px;height:auto;border:0;outline:none;">
</td></tr>
</table>
</td></tr>
<tr><td align="center" style="padding:20px 28px 0;${FUENTE}font-size:34px;line-height:1.1;font-weight:800;color:#011E41;">¡Gracias!</td></tr>
<tr><td align="center" style="padding:12px 34px 0;${FUENTE}font-size:17px;line-height:1.5;color:#011E41;">${textoDonacion}</td></tr>
<tr><td align="center" style="padding:20px 28px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#FDD794" style="background-color:#FDD794;border-radius:22px;border-bottom:5px solid #F2C14E;">
<tr><td align="center" style="padding:12px 32px 10px;${FUENTE}color:#011E41;">
<span style="display:block;font-size:12px;font-weight:700;letter-spacing:2px;">NÚMERO DE LOTE</span>
<span style="display:block;font-size:34px;line-height:1.15;font-weight:800;">#${numeroLote}</span>
<span style="display:block;margin-top:2px;font-size:14px;font-weight:700;">Destino: ${destino.nombre}</span>
</td></tr>
</table>
</td></tr>
<tr><td align="center" style="padding:16px 34px 0;${FUENTE}font-size:16px;line-height:1.5;color:#514B46;">${textoLote}</td></tr>
<tr><td align="center" style="padding:26px 24px 0;${FUENTE}font-size:18px;font-weight:800;color:#011E41;">El camino de tu ayuda</td></tr>
<tr><td align="center" style="padding:12px 24px 0;">
<img src="${urlMapa(destino)}" alt="Mapa del Valle del Cauca con el trayecto de Cali a ${destino.nombre}" width="500" style="display:block;width:100%;max-width:500px;height:auto;border:0;outline:none;border-radius:24px;">
</td></tr>
<tr><td align="center" style="padding:12px 32px 0;${FUENTE}font-size:14px;line-height:1.5;color:#514B46;">${textoTrayecto}</td></tr>
<tr><td align="center" style="padding:20px 24px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" bgcolor="#CC0100" style="background-color:#CC0100;border-radius:999px;border-bottom:4px solid #A5121A;">
<a href="${urlRuta}" target="_blank" style="display:inline-block;padding:14px 28px;${FUENTE}font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">Ver el trayecto en Google Maps</a>
</td></tr>
</table>
</td></tr>
<tr><td align="center" style="padding:26px 34px 28px;${FUENTE}font-size:15px;line-height:1.5;color:#011E41;">Gracias por ayudar donde más hacía falta.</td></tr>
<tr><td align="center" bgcolor="#011E41" style="background-color:#011E41;padding:16px 24px;border-radius:0 0 28px 28px;${FUENTE}">
<span style="display:block;color:#FFFFFF;font-size:14px;font-weight:700;">CaliDa · Cruz Roja</span>
<span style="display:block;margin-top:4px;color:#B4CBDC;font-size:12px;">Recibes este correo porque registraste una donación en un centro de acopio.</span>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// --- Envío --------------------------------------------------------------
// Cada correo se guarda primero en la bandeja de prueba. Si EmailJS está
// configurado (js/config-correo.js) se envía de verdad y su estado pasa
// a "enviado" (o "error" si falla); si no, queda como "simulado".

const URL_EMAILJS = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js';
let cargaEmailJS = null;

export const emailjsConfigurado = () => Boolean(EMAILJS.publicKey && EMAILJS.serviceId && EMAILJS.templateId);

function cargarEmailJS() {
  cargaEmailJS ??= new Promise((ok, falla) => {
    if (window.emailjs) return ok(window.emailjs);
    const script = document.createElement('script');
    script.src = URL_EMAILJS;
    script.onload = () => ok(window.emailjs);
    script.onerror = () => falla(new Error('No se pudo cargar EmailJS'));
    document.head.appendChild(script);
  });
  return cargaEmailJS;
}

export function enviarCorreo({ destinatario, asunto, html, loteId, numeroLote }) {
  const real = emailjsConfigurado();
  const registro = guardarCorreoEnviado({
    destinatario,
    asunto,
    html,
    loteId,
    numeroLote,
    estado: real ? 'enviando' : 'simulado',
  });
  if (!real) return Promise.resolve(registro);

  return cargarEmailJS()
    .then((emailjs) =>
      emailjs.send(
        EMAILJS.serviceId,
        EMAILJS.templateId,
        // Los mismos datos con los nombres que EmailJS usa por defecto
        // ({{to_email}}, {{subject}}, {{message}}…), por si la plantilla
        // no usa {{destinatario}} / {{asunto}} / {{{html}}}.
        {
          destinatario,
          asunto,
          html,
          to_email: destinatario,
          email: destinatario,
          to: destinatario,
          user_email: destinatario,
          subject: asunto,
          title: asunto,
          message: html,
          message_html: html,
          name: 'CaliDa · Cruz Roja',
          from_name: 'CaliDa · Cruz Roja',
        },
        { publicKey: EMAILJS.publicKey }
      )
    )
    .then(() => actualizarCorreoEnviado(registro.id, { estado: 'enviado' }))
    .catch((e) => {
      console.warn('No se pudo enviar el correo a', destinatario, e);
      return actualizarCorreoEnviado(registro.id, { estado: 'error', error: String(e?.text ?? e?.message ?? e) });
    });
}

// --- Correos de un despacho -----------------------------------------------
// Un correo por persona (cédula + correo). Si alguien donó dos veces en
// la misma semana, recibe un solo correo con ambas fechas.

export function generarCorreosDespacho({ despacho, donaciones }) {
  const centro = getCentro(despacho.centroId);
  const destino = obtenerMunicipio(despacho.destino) ?? obtenerMunicipio('Santiago de Cali');

  const porPersona = new Map();
  for (const donacion of donaciones) {
    const clave = `${donacion.cedula}|${donacion.correo}`;
    if (!porPersona.has(clave)) porPersona.set(clave, { correo: donacion.correo, fechas: [], ubicacion: null });
    const persona = porPersona.get(clave);
    persona.fechas.push(donacion.fecha);
    // Ubicación que compartió en su pre-registro (si lo hizo).
    if (!persona.ubicacion && donacion.ubicacion) persona.ubicacion = donacion.ubicacion;
  }

  const totalPersonas = porPersona.size;
  return [...porPersona.values()].map(({ correo, fechas, ubicacion }) => {
    // Punto de partida (distancia y Google Maps): la ubicación del donante
    // o, si no la compartió, su centro de acopio.
    const origen = ubicacion ?? { lat: centro.lat, lng: centro.lng };
    return enviarCorreo({
      destinatario: correo,
      asunto:
        new Set(fechas).size > 1
          ? `¡Gracias! Tus donaciones ya fueron entregadas · Lote #${despacho.numeroLote}`
          : `¡Gracias! Tu donación ya fue entregada · Lote #${despacho.numeroLote}`,
      html: plantillaCorreo({
        fechas,
        numeroLote: despacho.numeroLote,
        otrasPersonas: totalPersonas - 1,
        destino,
        origen,
        centroNombre: centro.nombre,
      }),
      loteId: despacho.id,
      numeroLote: despacho.numeroLote,
    });
  });
}
