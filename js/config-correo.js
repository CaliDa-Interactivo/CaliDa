// ============================================================
// config-correo.js — datos para enviar los correos de verdad.
//
// El envío usa EmailJS (https://www.emailjs.com), que funciona sin
// servidor. Mientras estos tres datos estén vacíos, los correos solo
// se guardan en la bandeja de prueba (#/correos-enviados).
//
// Cómo obtenerlos (una sola vez, con la cuenta de correo del equipo):
//   1. Crear una cuenta gratis en emailjs.com.
//   2. "Email Services" → Add New Service → Gmail (u otro) → conectar
//      el correo desde el que saldrán los avisos. Copiar el Service ID.
//   3. "Email Templates" → Create New Template:
//        · To Email:  {{destinatario}}
//        · Subject:   {{asunto}}
//        · Content:   cambiar a modo código (<>) y dejar solo {{{html}}}
//          (con TRES llaves, para que no se escape el HTML).
//      Guardar y copiar el Template ID.
//   4. "Account" → copiar la Public Key.
// La Public Key está pensada para ir en la página (no es una contraseña).
// ============================================================

export const EMAILJS = {
  publicKey: 'C6TfMFEzqfpDjMeXO',
  serviceId: 'service_dbwzd6e',
  templateId: 'template_myd3yt5',
};

// Dirección pública del sitio: las imágenes del correo (gato, logo y
// mapas) se cargan desde aquí, porque los clientes de correo no pueden
// leer archivos del computador.
export const URL_PUBLICA = 'https://calida-interactivo.github.io/CaliDa/';
