# CaliDa

Plataforma de coordinación de donaciones para la Cruz Roja en Cali tras el terremoto del
10 de agosto de 2026. Conecta lo que el donante tiene con lo que cada centro de acopio
necesita en tiempo real, para que la ayuda no se acumule en unos centros mientras otros se
quedan sin insumos críticos.

Proyecto universitario de Diseño Interactivo (Cali, Colombia).

## Cómo abrirlo

El proyecto usa módulos de JavaScript, así que **no funciona abriendo `index.html` con
doble clic**: necesita un servidor local.

- **VS Code:** instalar la extensión *Live Server*, clic derecho en `index.html` → *Open with Live Server*.
- **Terminal:** en esta carpeta, `python3 -m http.server 8000` y abrir `http://localhost:8000`.

Necesita internet para cargar three.js (versión fija 0.160.0 desde jsDelivr, por importmap),
las tipografías y los íconos. La geolocalización y Web Crypto solo funcionan en `localhost`
o https. Sin internet o sin WebGL, el mapa se reemplaza por la lista de centros y el gato
3D por el gato 2D.

## Publicar con GitHub Pages

Repositorio: `CaliDa-Interactivo/CaliDa`, rama `main`.

1. En el repositorio: **Settings → Pages**.
2. En *Source* elige **Deploy from a branch**, rama **main** y carpeta **/ (root)**. Guarda.
3. En uno o dos minutos queda en `https://<usuario>.github.io/<repositorio>/`.

El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll.

## Usuarios

- **Donante** (Carlos, 42 años): no necesita registro.
- **Administrador** (Martha, 52 años, líder de centro). Acceso de prueba desde
  **Siguiente → Iniciar sesión** (tarjeta "Administrador"):
  - Correo: `jairo.varela@calida.co`
  - Contraseña: `calida2026`
  - Centro asignado: Plazoleta Jairo Varela, zona Centro (lat 3.4528, lng -76.5318)

No hay registro público: las cuentas las crea la Cruz Roja y cada una está ligada a un
centro. La validación está aislada en `js/auth.js` (`login(correo, contraseña)`), que guarda
solo la huella PBKDF2 de la contraseña, nunca el texto plano. Ahí mismo está comentado
cómo conectar la autenticación real cuando haya backend.

## Estados de un insumo (cantidad 0–5)

| Cantidad | Estado | Color |
|---|---|---|
| 0 | **Urgente** | rojo |
| 1–2 | **Desabastecido** | amarillo |
| 3–4 | **Provisionado** | — |
| 5 | **Abastecido** | — |

El mapa del donante solo muestra los centros en 0–2: casa roja = urgente, casa amarilla = desabastecido.

## Recorridos

**Inicio:** bienvenida `#/` → "Siguiente" → elige tu perfil `#/entrar` → login del administrador.

**Donante (sin registro):**
estantería 3D `#/donante/estanteria` (al tocar una categoría la cámara se acerca en la misma
pantalla) → producto (subcategoría) → mapa 3D `#/donante/mapa/:sub` → ficha del centro (cantidad
de 0 a 5 y lo que le falta) → pre-registro (cédula, fecha y ubicación opcional; vale 24 horas) →
pantalla final con "Cómo llegar" (Google Maps) y "Regresar al mapa".

**Administrador:** login → bienvenida → menú principal →
- *Gestionar insumos* (dos pasos en pantallas distintas):
  1. cantidad de 0 a 5 por subcategoría con − / +;
  2. palabras exactas de lo que falta, como etiquetas (se agregan con Enter o coma).
- *Registrar donación:* fecha, cédula y correo. Si la cédula tiene un pre-registro vigente
  (24 h) de esa categoría, se valida y la donación hereda la ubicación del donante.
- *Registrar despacho:* fecha, municipio de destino (los 42 del Valle del Cauca) y placa.
  Arma el lote (número = semana del año) y genera automáticamente el correo de cada donante,
  visible en la bandeja de prueba `#/correos-enviados`.

Todas las confirmaciones muestran al gato contento y vuelven solas al menú principal.

## Guion sugerido para la demostración

1. Como administrador, en *Gestionar insumos → Alimento*, poner **Agua** en 0 (*Urgente*) y guardar.
2. Cerrar sesión y, como donante, ir a **Alimento → Agua**: la Plazoleta Jairo Varela aparece
   en el mapa como urgente (casa roja).
3. Abrir la ficha del centro, hacer el pre-registro y mostrar "Cómo llegar".
4. Como administrador, registrar 2 o 3 donaciones con correos distintos (una persona dos
   veces) y luego el despacho.
5. Abrir **Bandeja de correos (prueba)** desde el menú y mostrar los correos generados.

## Estantería 3D — `js/estanteria3d.js`

- Mueble `assets/modelos/estanteria.glb`, girado de frente, en madera clara de un solo tono.
- Compartimientos: Alimento y Aseo arriba, Ropa y Medicamentos en el medio, Construcción abajo.
- **Cámara fija** (no se arrastra) que llena la pantalla. Las placas de categoría y las
  etiquetas de producto están clavadas a la madera.
- Al tocar una categoría la cámara se acerca y queda fija; "← Ver toda la estantería" va en la
  esquina inferior derecha y el mensaje de ayuda en la inferior izquierda.
- Buscador que entiende palabras parecidas y sinónimos (`SINONIMOS_SUBCATEGORIA` en `js/data.js`).
- Un modelo por subcategoría (`MODELOS_SUBCATEGORIA`). Los ajustes de color y las calcomanías
  (maíz en la lata, huella en la bolsa de mascotas, botella de agua azul) están en
  `js/ajustes-modelos.js`. La ropa (camisa, vestido, overol) y el papel higiénico se generaron
  para el proyecto.
- Todos los íconos de productos de la página son "fotos" de los modelos 3D
  (`js/miniaturas3d.js`, `iconoProducto()` en `js/ilustraciones.js`).
- Si el navegador no puede mostrar 3D, se usa la estantería 2D.

## Mapa 3D — `js/mapa3d.js`

- Zonas del área urbana trazadas sobre el mapa oficial, con colinas y pocos pinos alrededor
  (sin árboles sobre la ciudad, sin río y sin plano de base visible).
- **Mapa fijo** (sin gestos) con encuadre automático: la ciudad ocupa cerca del 80 % del
  recuadro (valor `0.8` en `encuadrarCiudad`).
- Casas `casa_roja.glb` y `casa_amarilla.glb` estilizadas con la paleta y giradas a tres cuartos.
- Ubicación del usuario (`js/ubicacion.js`): si está fuera de Cali, el pin va al borde con la
  distancia. Si el navegador no la da, el botón **"📌 Marcar dónde estoy"** permite tocar el mapa.
  Si se niega el permiso, todo funciona igual.
- En computador, el gato va en su propia columna al lado del mapa con un mensaje compacto
  arriba; nunca tapa el mapa. Explica los colores y cuál es el centro más cercano.

## Gato (mascota) — `js/gato3d.js`

Modelo del equipo (`assets/modelos/gato.glb`) simplificado, suavizado, con colores por partes,
brazo derecho articulado en el hombro y pupilas. Las animaciones están hechas en código y son
suaves, sin temblores:

- **Pantalla principal** (`saluda`): solo mueve la mano.
- **Elegir perfil, login y mapa** (`quieto`): respira, se balancea apenas, mueve la cola despacio
  y de vez en cuando hace un saludito.
- **Mapa con urgencias** (`alerta`): levanta la mano y la mueve despacio.
- **Confirmaciones** (`feliz`).
- Parpadea con párpados reales (los dos ojos a la vez) y a veces mira hacia un lado.

En el pre-registro se asoma de medio cuerpo desde la esquina. Habla en primera persona, con
frases cortas y cálidas; al administrador le dice "tu centro". Sus mensajes por subcategoría
están en `IMPORTANCIA_SUBCATEGORIA` (`js/data.js`). Si no hay WebGL, se usa el gato 2D.

## Datos

- Todo se guarda en el navegador (`localStorage`, clave `calida_store_v3`). `js/store.js` migra
  los datos guardados (subcategorías nuevas, zona de Jairo Varela) sin borrarlos. Para
  reiniciar la demo, borrar los datos del sitio en el navegador.
- Categorías, subcategorías (incluye "Comida para animales" y "Analgésicos"), zonas y centros
  semilla en `js/data.js`. Lo que le falta a cada centro: `NECESIDADES_SEMILLA`.

## Estructura

```
index.html
css/
  base.css      marca, botones, transiciones
  tema.css      tema visual actual (los ajustes más recientes van al final)
  entrada.css   pantallas de inicio y perfil
  donante.css   estantería, mapa, ficha
  admin.css     pantallas del administrador
js/
  main.js             router por hash, transiciones y foco entre pantallas
  store.js            única fuente de datos (localStorage) y migraciones
  data.js             categorías, sinónimos, zonas, centros y necesidades semilla
  auth.js             login(correo, contraseña) con PBKDF2
  inicio.js           bienvenida y elige tu perfil
  encabezado.js       encabezado con los logos
  boton-inicio.js     botón para volver al inicio
  estanteria3d.js     estantería 3D (cámara fija y zoom por categoría)
  estanteria-vista.js, zoom-estanteria.js   vista y acercamiento de la estantería
  mapa3d.js, paisaje.js   mapa 3D de Cali y colinas
  ubicacion.js        geolocalización
  cargar-glb.js       carga de modelos .glb
  ajustes-modelos.js  colores y calcomanías de los productos
  miniaturas3d.js, cache-miniaturas.js   "fotos" de los modelos para los íconos
  ilustraciones.js    iconoProducto() e ilustraciones 2D de respaldo
  gato3d.js           gato 3D y sus animaciones
  gato.js, gatos.js, mascota.js   gato 2D de respaldo y burbuja de mensaje
  iconos.js           íconos de la interfaz
  email.js            plantilla y envío del correo automático
  correos.js          bandeja de correos de prueba
  donante/            estantería, mapa, ficha, pre-registro, llegar
  admin/              login, bienvenida, menú, insumos, donación, despacho, confirmación
assets/
  modelos/            estantería, gato, casas y un modelo por subcategoría (.glb)
  logo-cruz-roja.png, logo-calida.png, gato.png, gato-saluda.png, icons/
```

## Identidad visual

- Paleta oficial: rojo carmín `#CC0100` (botón principal), rojo profundo `#A5121A`, azul Cruz
  Roja `#011E41` (títulos y textos), azul petróleo `#426D8C`, coral `#F67751` (gato), amarillo
  `#FDD794`, salvia `#86B5A9`, marfil `#FFF8ED`, beige arena `#E8E1D5`, marrón carbón `#514B46`.
- Fondo de toda la página en salvia `#86B5A9`, con contenedores marfil o blancos muy redondeados.
  Los textos sobre el salvia van en azul oscuro (`#011E41` / `#1E3A4F`).
- Estilo ilustrado y cálido (tarjetas redondeadas, botones planos suaves) sin perder el 3D.
  Sin marcos alrededor de las pantallas ni ondas al pie.
- Tipografía: Montserrat.
- El logo de la Cruz Roja va siempre sobre blanco, con espacio libre del tamaño de la cruz.

## Accesibilidad y responsive

- Contraste de texto según WCAG AA (mínimo 4.5:1).
- Al cambiar de pantalla, el foco va al título y el nombre de la pestaña se actualiza.
- Todo se puede usar con teclado; el mapa tiene equivalentes accesibles (lista de centros).
- Controles táctiles de al menos 44 px; probado desde 320 px de ancho hasta escritorio.
- Respeta *reducir movimiento* del sistema.

## Pendientes conocidos

- **Correo real:** el envío está simulado. En `js/email.js` están los pasos para conectarlo a
  EmailJS sin servidor y dónde poner la URL pública de la imagen del gato (`assets/gato.png`).
- **Mapa del correo:** es un SVG y Gmail/Outlook no lo muestran. Para el envío real hay que
  cambiarlo por una imagen de mapa estático (ver comentario en `js/email.js`). El enlace a
  Google Maps sí funciona en cualquier correo.
- **Centros:** varios son de ejemplo (marcados en `js/data.js`). Si las coordenadas de un centro
  no caen dentro de su zona en el mapa, su casa toma un puesto fijo de la zona; "Cómo llegar"
  usa siempre las coordenadas reales.
