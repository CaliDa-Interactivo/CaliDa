# CaliDa — contexto para Claude Code

Proyecto universitario de Diseño Interactivo (Cali, Colombia). Plataforma web de la Cruz Roja
para coordinar donaciones tras un terremoto en Cali (10 ago 2026): evita que unos centros de
acopio se llenen mientras otros se quedan sin nada. Este archivo resume las decisiones tomadas
con el equipo en una conversación larga en claude.ai. **Respétalas salvo que el equipo pida lo
contrario.** Responde siempre en español.

## Flujo de trabajo con GitHub
- Repositorio: `CaliDa-Interactivo/CaliDa` (rama `main`), publicado con GitHub Pages.
- **Después de cada cambio que pida el equipo: commit con mensaje claro en español y push.**
- Sitio estático: HTML + CSS + JS vanilla (módulos ES) + three.js por importmap (CDN jsDelivr,
  versión fija 0.160.0). Sin backend; datos en `localStorage` (clave `calida_store_v3`).
- Probar en `localhost` o en GitHub Pages (https): la geolocalización y Web Crypto lo requieren.

## Usuarios y credenciales de prueba
- Donante (Carlos, 42 años): sin registro.
- Administrador (Martha, 52 años, líder de centro). Login de prueba:
  `jairo.varela@calida.co` / `calida2026` → centro **Plazoleta Jairo Varela, zona Centro**
  (lat 3.4528, lng -76.5318). Contraseña con PBKDF2 en `js/auth.js` (no texto plano).
  Segunda cuenta de prueba del equipo: `admin@calida.co` / `admin123` (mismo centro).

## Flujos
**Donante:** bienvenida `#/` → elegir perfil `#/entrar` → estantería 3D `#/donante/estanteria`
(zoom a la categoría en la misma pantalla) → mapa 3D `#/donante/mapa/:sub` → ficha del centro
→ pre-registro (cédula, fecha, ubicación opcional; vale 24 h) → "Cómo llegar".
**Administrador:** login → menú → (1) Gestionar insumos: **dos pasos en pantallas distintas**:
paso 1 cantidad 0–5 con − / +; paso 2 palabras exactas de lo que falta (etiquetas, Enter o coma);
(2) Registrar donación (detecta pre-registros); (3) Registrar despacho (42 municipios del Valle,
placa) → correos automáticos (bandeja de prueba `#/correos-enviados`).

## Estados (cantidad 0–5)
0 = **Urgente** (rojo) · 1–2 = **Desabastecido** (amarillo) · 3–4 = **Provisionado** · 5 = **Abastecido**.
El mapa solo muestra centros en 0–2. Casas: roja = urgente, amarilla = desabastecido.

## Estilo visual (acordado)
- **Paletas por rol (oct 2026, mandan sobre lo de abajo):** `main.js` pone `<html data-rol>`
  (`donante` / `admin` / `inicio`) y el final de `css/tema.css` cambia las variables de color.
  Versión **suave** (el equipo la pidió armoniosa, sencilla y sin saturar):
  - **Donador (cálidos):** fondo #F7CD80, botón principal #B8432A con texto crema #FFF6E6,
    paneles crema #FFF6E6, desabastecido #F4C66E, mapa con fondo café suave.
  - **Admin (azules):** fondo #7DB8DC, botón principal #1F5490 con texto crema, paneles
    #FFF8EC; menú y paneles de función en azules claros (#E3F0F9, #CFE5F4, #B9D9EF).
  - **Volver y botones secundarios:** pastilla crema **sin borde** y texto oscuro del rol
    (#8A3B12 donador, #12406E admin). Ningún botón lleva borde blanco.
  - **Comunes:** estantería y gato #A8623A (mismo color; el gato con su luz original, clara),
    pantalla principal #7FB8CC. Mapa del donante: plano, colinas y pinos verdes; zonas en
    tonos cobrizos y cafés.
  - Tarjetas de centros: infladas sin brillo arriba; desabastecidos en amarillo más oscuro
    (#E6A341); distancia (km) en negrilla; etiqueta "Desabastecido" café (#8A3B12), también
    en la ficha del centro.
  - Paleta de referencia del equipo (más saturada): donador #AF2000, #E47832, #E68D36, #FDC254,
    #FEB454, #FCDEA8; admin #FCDEA8, #58B0DC, #459FD4, #236CB5, #093E7E.
- **Tipografía: Roboto** (títulos 900/700) y **Roboto Condensed** en mensajes pequeños; títulos
  40px, subtítulos 28px, párrafos 14px, pequeños textos 12px (en celular títulos 30px y
  subtítulos 22px). **Pequeños textos sin recuadro** (solo texto: café en donador; en admin,
  blanco sobre el fondo azul y azul oscuro dentro de los paneles). Los letreros 3D también usan Roboto.
- Espacios parejos: misma distancia arriba (24px / 16px celular) y al pie (32px / 24px) en todas
  las pantallas (`--margen-arriba`, `--margen-abajo`); en celular el encabezado del mapa, ficha y
  pre-registro va en una fila con botones de solo ícono, y el "inicio" del admin no flota.
- Cédula: solo de 8 a 10 dígitos (pre-registro y registrar donación), con ayuda debajo.
- Estantería con sombras propias (los productos y tablas dan sombra), sombra en el piso y
  alrededor del mueble; color parejo pero con volumen.
- Letreros de las subcategorías: todos con el mismo tamaño de letra (`fraccionMaxima` en
  `js/estanteria3d.js`), en una o dos líneas, siempre dentro de la placa.
- Paleta oficial (`claude_paleta`): rojo carmín #CC0100 (botón principal), rojo profundo #A5121A,
  azul Cruz Roja #011E41 (títulos/textos), azul petróleo #426D8C, coral #F67751 (gato),
  amarillo #FDD794, salvia #86B5A9, marfil #FFF8ED, beige arena #E8E1D5, marrón carbón #514B46.
- **Fondo de toda la página: azul salvia #86B5A9** como estudio fotográfico (luz que cae desde
  arriba, bordes más oscuros, piso suave con charco de luz; `--fondo-pantalla` al final de
  `css/tema.css`; la línea del piso es un degradado suave, sin corte); contenedores
  marfil/blancos muy redondeados;
  textos sobre el azul en azul oscuro (#011E41 / #1E3A4F, contraste ≥ 4.5:1).
- Referencias: interfaces ilustradas cálidas (tarjetas redondeadas), **sin perder el estilo 3D**.
  Sin marcos alrededor de las pantallas, sin ondas al pie, sin alfombra ni luz naranja en la
  pantalla principal (solo profundidad suave).
- **Botones, pastillas y tarjetas "gorditos" y MATES** (mismo material que los productos de la
  estantería): relieve suave, sin brillo ni reflejo (variables `--brillo-arriba`, `--relieve`,
  `--relleno-rojo/azul/marfil/amarillo/salvia`, redefinidas al final de `css/tema.css`).
- **Pantalla principal (oct 2026, la pidió el equipo así):** `js/inicio.js` + `js/inicio3d.js`.
  1) **Intro**: la cámara baja del cielo (sol, nubes, paralaje) hasta el gato en una colina, que
  dice **dos mensajes** en un globo grande: el principal ("En una emergencia…") y luego "Aquí te
  mostraré a dónde llevar tus donaciones.". **Se ve cada vez que se llega a la pantalla principal**,
  botón "Saltar"; sin intro si el sistema pide reducir el movimiento. Globo proporcional al gato (hasta 32px;
  ojo: la regla general de párrafos a 14px excluye `.intro__globo` y `.portada__colabora`). 2) **Portada** como la referencia: sin
  encabezado de logos; a la izquierda "CaliDa" grande con los colores del logo (Cali #F67751,
  Da #CC0100), "En colaboración con" (16px, negrilla) + logo de la Cruz Roja sobre blanco, el mensaje y
  "Siguiente"; a la derecha la isla 3D con mesas, cajas con donaciones y el gato; de fondo un
  sol, manchas y puntos que flotan.
- Tarjetas de centros bajo el mapa: urgentes en rojo carmín, desabastecidos en amarillo.
- Menú del admin: cada tarea con su color (insumos amarillo, donación coral, despacho azul claro)
  e íconos 3D mates hechos con three.js (`generarIconoMenu` en `js/miniaturas3d.js`). Los
  paneles y formularios de cada función usan ese mismo color (`vista-funcion-insumos/
  donacion/despacho`).
- Admin: en el menú, "Volver a pantalla principal"; en sus funciones (insumos, donación,
  despacho, bandeja) **"Volver al menú"** (`renderBotonInicio({ alMenu })`). Va fijo arriba a la
  derecha (sin taparse con el buscador). Textos sobre el fondo azul del admin en blanco; con
  recuadro (pastilla azul oscuro): nombre del centro, leyenda de estados y la instrucción
  "Selecciona el tipo de donación a registrar";
  leyenda de estados centrada encima de la estantería; ejemplos de "lo que falta" según la
  subcategoría (`EJEMPLOS_NECESIDADES` en `js/data.js`).
- Menú del admin: las tres tareas se reparten todo el alto de la pantalla.
- Panel de estado de insumos (zoom del admin): casi pantalla completa, recuadros que llenan el
  alto; los 5 puestos de cada repisa en una cuadrícula pareja (nada se sale del recuadro).
- Registrar donación y despacho (`vista-formulario-admin`): formulario grande en dos columnas.
- "Iniciar sesión" (elige tu perfil) en azul petróleo; su ilustración muestra cajas con
  donaciones dentro de un centro de acopio (pared, repisas, piso: `renderPaisaje({ centro:
  'cajas' })`), no en el bosque.
- Pre-registro y demás pantallas: sin desplazamiento vacío (el gato 2D de respaldo se oculta con
  `display: none` cuando carga el 3D).
- Gestionar insumos: recuadros marfil con relieve, franja y pastilla del color del estado.
- **Distribución de mapa, ficha del centro y pre-registro** (clase `vista-columnas` para ficha y
  pre-registro): arriba "← Volver" (azul) + ruta en pastilla roja + "Volver a pantalla principal"
  e "Ir a la estantería" a la derecha; al medio el panel grande (mapa o `pantalla-panel`) con el
  gato en su columna derecha (mensaje con título rojo arriba, gato abajo); al pie los botones de
  acción (en el mapa, además, las zonas en una pastilla segmentada; zonas con urgencias en rojo).
- Tipografía Roboto (antes Montserrat). Los ajustes más recientes están al final de `css/tema.css`.

## Gato (mascota) — `js/gato3d.js`, modelo `assets/modelos/gato.glb`
- Modelo del equipo procesado: simplificado, suavizado (Taubin), colores por partes, brazo
  derecho separado (`BrazoDer`, articulado en el hombro) y pupila espejo agregada.
- Animaciones hechas en código, deben ser **orgánicas** (nada de temblores):
  - Pantalla principal (`saluda`): **solo mueve la mano** (brazo blando que se dobla gradual).
  - Elegir perfil / login / mapa (`quieto`): mirando al frente, respira, se balancea apenas,
    mano suave con saludito ocasional, cola lenta.
  - Mapa con urgencias (`alerta`): levanta la mano y la mueve despacio (sin sacudirse).
  - Confirmaciones (`feliz`).
  - **Parpadeo con párpados reales**: ambos ojos se cierran y abren al mismo tiempo, natural.
  - Pupilas: miran juntas hacia un lado de vez en cuando.
- En la ficha del centro el gato **no mueve la mano** (`renderGato(…, { manoQuieta: true })` →
  `data-mano="quieta"`).
- Mapa, ficha y pre-registro: el gato va **en su propia columna al lado del panel** (computador)
  con su mensaje arriba; nunca tapa el contenido. En celular va en una fila encima del panel.
- three.js cambia los espacios de los nombres de las partes por "_" ("Pupilas_espejo"): buscar
  partes con `parte()` en `gato3d.js`, no con `getObjectByName` directo.
- Luz del gato con poco relleno y luz principal de lado: un poco más oscuro, con sombras visibles.
- Si no hay WebGL, se usa el gato 2D (PNG/SVG) como respaldo; mientras carga el 3D el 2D no se ve
  (solo aparece con la clase `gato3d--sin3d` si el 3D falla).
- **Tono de los mensajes:** primera persona, frases cortas y cálidas; al admin le dice
  "tu centro" (p. ej. "Cuéntame cuánto hay de cada cosa en tu centro…").

## Estantería 3D — `js/estanteria3d.js`
- Mueble `estanteria.glb` (girado para quedar de frente), madera de un solo tono y pareja: el
  color sale casi todo del material (`MeshLambertMaterial`, emissive `#B98450`) y la luz solo
  agrega un sombreado suave.
- Compartimientos: Alimento y Aseo arriba, Ropa y Medicamentos al medio, Construcción abajo.
- **Cámara fija** (no se arrastra); llena la pantalla; se ve la placa de Construcción.
- Placas de categoría y etiquetas de producto **clavadas a la madera** (3D, no flotantes).
- Al tocar una categoría la cámara se acerca y queda fija; "← Ver toda la estantería" va en la
  **esquina inferior derecha**; el mensaje de ayuda en la esquina inferior izquierda.
- Buscador con palabras parecidas y sinónimos (`SINONIMOS_SUBCATEGORIA` en `js/data.js`).
- Un modelo por subcategoría (`MODELOS_SUBCATEGORIA`); ajustes de color y calcomanías (maíz en la
  lata, huella en la bolsa de mascotas, botella de agua azul) en `js/ajustes-modelos.js`.
  Camisa, vestido y overol son los modelos finales del equipo (oct 2026, `camisa.glb`,
  `vestido.glb`, `overol.glb`), mates, a la misma altura en la repisa y el vestido rosado tierno
  (`COLORES` en `js/ajustes-modelos.js`); "Limpieza del hogar" usa `jabon.glb` (antes una escoba). Los
  cepillos de dientes se giran un cuarto de vuelta para que se vean los dos.
- **Todos los íconos de productos** de la página usan "fotos" de los modelos 3D
  (`js/miniaturas3d.js`, `iconoProducto()` en `js/ilustraciones.js`).

## Mapa 3D — `js/mapa3d.js`
- Zonas del área urbana trazadas sobre el mapa oficial; colinas con pocos pinos alrededor;
  sin árboles sobre la ciudad; sin río; sin plano de base visible (solo un `ShadowMaterial`
  que recibe la sombra de la ciudad y las colinas).
- **Mapa fijo** (sin gestos); encuadre automático centrado (la ciudad ocupa ~80 % del recuadro;
  ajustable con el valor `0.8` en `encuadrarCiudad`).
- Casas `casa_roja.glb` / `casa_amarilla.glb` estilizadas con la paleta (techo rojo carmín o
  amarillo, paredes marfil), acortadas de fondo para verse compactas, giradas a tres cuartos.
  Las "fotos" de las casas (tarjetas y ficha) son de frente y sin perspectiva (cámara
  ortográfica, `{ plano: true }` en `generarMiniaturaDe`), como un dibujo 2D dentro de su casilla.
- Mapa: plano verde, colinas y pinos verdes; zonas cobrizas y cafés (Norte cobre, Occidente
  arena tostada, Centro siena, Oriente ámbar, Sur café).
- Ubicación del usuario: se pide al entrar; si está fuera de Cali el pin va al borde con la
  distancia. (Se quitó "Marcar dónde estoy".)
- El gato explica colores (roja urgente / amarilla desabastecido) y el centro más cercano.
- En el mapa **solo se pueden tocar las casas**; las zonas se eligen con los botones de abajo.
- Subtítulo de la lista: "Selecciona un centro de acopio que necesita <producto>".
- "← Volver" del pre-registro lleva a la estantería completa (todas las categorías); el del
  mapa vuelve a la categoría acercada.

## Otros datos
- Subcategorías: incluye "Comida para animales" (Alimento) y "Analgésicos" (sin "y fiebre").
- Mensajes del gato por subcategoría en el pre-registro: `IMPORTANCIA_SUBCATEGORIA` (`js/data.js`).
- Necesidades por centro: `NECESIDADES_SEMILLA` (`js/data.js`); se ven en la ficha del centro.
- `js/store.js` migra datos guardados (subcategorías nuevas, zona de Jairo Varela) sin borrarlos.

## Correos al donante — `js/email.js`
- Estilo de la página (fondo salvia, tarjeta marfil, botón rojo en píldora), pensado para Gmail
  (fondos con `bgcolor`, relieve con bordes y no con sombras, styles en una línea), gato 3D
  (`assets/correo/gato.png`, "foto" del modelo) y **mapa real del Valle del Cauca** con el trayecto
  desde Cali (`assets/correo/mapas/<municipio>.png`, uno por cada uno de los 42 municipios,
  dibujados con el contorno real de los departamentos). Las imágenes se cargan desde GitHub Pages
  (`URL_PUBLICA` en `js/config-correo.js`).
- Envío real con EmailJS: llenar `publicKey`, `serviceId` y `templateId` en `js/config-correo.js`
  (pasos ahí mismo; plantilla con `{{{html}}}`). Sin eso, solo se guardan en la bandeja
  `#/correos-enviados`, que muestra el estado de cada correo (simulado / enviado / error).

## Pendientes conocidos
- EmailJS ya está conectado (cuenta del equipo, datos en `js/config-correo.js`). El plan gratis
  envía unos 200 correos al mes. Se mandan los datos también como `to_email`, `subject`,
  `message`, por si la plantilla usa los nombres por defecto de EmailJS.
- Varios centros son de ejemplo (marcados en `js/data.js`).

## Cómo verificar cambios
- Revisar en el navegador las pantallas: `#/`, `#/entrar`, `#/donante/estanteria`,
  `#/donante/mapa/alimento-agua`, `#/donante/ficha/centro-jairo-varela/alimento-agua`,
  pre-registro, y como admin `#/admin/insumos` (dos pasos) y `#/admin/donacion`.
- Comprobar que no haya errores en la consola y que nada tape el mapa.

## Ajustes de oct 2026 (5)
- Intro: texto del globo proporcional al cuerpo del gato (`clamp(18px,3.6vh,32px)`, ancho del
  globo ~2,6 veces el del gato; bloque AJUSTES 6 en `css/tema.css`).
- Pre-registro: "Tu ubicación" y la confirmación sin recuadro azul claro; textos en marrón #5A2A0C,
  nombre del producto grande (32px).
- Admin: el nombre del centro va en pastilla azul oscuro con texto blanco; cada estado de la
  leyenda (arriba de la estantería) en su propia pastilla crema con texto azul y el punto de
  su color, para diferenciarlos.
- Registrar donación y despacho: títulos de 52px (34px en celular).
- `index.html` carga CSS y `main.js` con `?v=AAAAMMDD`: **subir la versión en cada cambio de
  estilos** para que GitHub Pages no muestre la versión vieja.

## Ajustes de oct 2026 (7)
- **"Pantalla principal" = Elige tu perfil (`#/entrar`)**, la de los botones de donador y admin;
  la intro/portada (`#/`) solo se ve al abrir el sitio. `RUTA_PRINCIPAL` en `js/boton-inicio.js`;
  "Cerrar sesión" del admin también lleva a `#/entrar`.
- Mapa: la ciudad (zonas) ya no proyecta sombra sobre el suelo (se veía una mancha oscura);
  el gato del lado baja (`translateY(9%)`) para que sus pies queden en el borde inferior del
  mapa y el globo en el borde superior.
- Los módulos que cambian también llevan `?v=` en sus `import` (main.js, mapa.js, ficha.js,
  prerregistro.js), porque el navegador guarda los módulos JS aunque cambie `main.js?v=`.
  Al cambiar uno de esos archivos, subir la versión en todos (buscar el `?v=` actual).
- Intro: cada mensaje va centrado en el globo (horizontal y vertical).
- Mapa (computador): **alto fijo** `max(360px, min(62vh, 640px))` (no debe crecer). El gato se
  acomoda a su columna: globo arriba (`order: -1`) y el gato ocupa lo que queda (máx. 340px),
  con los pies en la línea del borde inferior del mapa (`translateY(7%)`). Probar también con
  pantallas al 125 % (1536 × 730) y con el mensaje largo del gato.
- Botón de zona elegido ("Toda Cali"…): mismo estilo que los botones rojos de las zonas con
  urgencias (sin sombra hundida arriba), con el conteo en café.

## Ajustes de oct 2026 (9)
- Al abrir el sitio, la pantalla aparece con un desvanecimiento desde crema (`body::before`,
  1,2 s) antes de la intro.
- Estantería del donante: "Toca un compartimiento para ver sus productos" va arriba, debajo de
  la pregunta (`renderEscena3D({ ayudaArriba: true })`; el texto en `TEXTO_AYUDA_ESTANTERIA`).
- Los centros de ejemplo ya no dicen "(ejemplo)" en el nombre (`js/data.js`; `store.js` lo
  quita también de los datos guardados).
- Ficha: "Toma un minuto…" centrado con los botones. "¡Todo listo…!": el botón de volver va
  separado del cuadro.
- El logo de CaliDa del encabezado (elegir perfil, login) es un enlace a la página inicial `#/`.

## Ajustes de oct 2026 (10) — isla 3D de la portada (`js/inicio3d.js`)
- Nada flota: cada producto se apoya en el fondo de una caja (`EN_CAJA`), en un tablero
  (`SOBRE_MESA`) o en la tapa de una caja cerrada.
- La caja del papel higiénico (mesa del frente) va cerrada (`cajaCerrada`); el papel y el
  analgésico van encima.
- Mesita nueva (`mesaC`) para el vaso de los cepillos; la bolsa roja de comida para animales va
  encima de la pila de cajas cerradas; en la caja de la camisa también va el vestido.
- Portada: todo el bloque de texto un 25 % más grande (`zoom: 1.25` en `.portada__texto`).

## Ajustes de oct 2026 (11)
- "Siguiente" de la portada: la portada se desvanece (450 ms, `portada--saliendo`) y "Elige tu
  perfil" aparece con desvanecimiento (`#app[data-transicion="desvanecer"]`, solo esa entrada).
- Menos lag al cargar: la isla 3D y el gato de la portada (`data-gato3d-diferido`) se montan
  después de la bajada de la cámara de la intro (o al saltarla), no al mismo tiempo que la intro.
  La isla usa `pixelRatio` máx. 1,5.
- Correos reales: **funcionan** (28 oct 2026). La plantilla `template_myd3yt5` ("Feedback
  Request" en el panel de EmailJS) tenía **To Email** = `{{asunto}}` (error 422); ahora
  To Email = `{{to_email}}`, Subject = `{{asunto}}`, contenido `{{{html}}}`.

## Ajustes de oct 2026 (12) — registro del administrador
- En el login, debajo de "¿Olvidaste tu contraseña?", va "¿No tienes cuenta? **Regístrate**" →
  `#/admin/registro` (`js/admin/registro.js`). El registro **crea un centro nuevo** con los datos
  que ve el donante (el equipo no quiere lista desplegable para el centro):
  - Tus datos: nombre completo y correo.
  - Tu centro: nombre (escrito), dirección, zona (pastillas Norte…Sur), horario (abre / cierra),
    teléfono (10 o 7 dígitos) y ubicación opcional ("Usar mi ubicación actual", solo si está en
    Cali; si no, punto de la zona y "Cómo llegar" usa la dirección: `ubicacionExacta: false`).
  - Contraseña: **mínimo 8 caracteres** (contador "Faltan N caracteres") y confirmación.
- `crearCentro()` en `js/store.js` (insumos en 3 = Provisionado; aparece en el mapa cuando el
  líder marca algo en 0–2). La ficha y "Todo listo" muestran la **Dirección** si el centro la tiene.
- Las cuentas nuevas se guardan en `localStorage` (`calida_cuentas_v1`, solo en ese navegador)
  con huella PBKDF2 y sal propia (`registrar()` en `js/auth.js`); no se repiten correos.
  Versión actual de módulos y CSS: `?v=20261029b` (registro.js importa `store.js?v=` por
  `crearCentro`; store.js no guarda estado en memoria, así que dos copias no molestan).

## Ajustes de oct 2026 (13) — todos los botones en 3D
- **Regla:** todo botón lleva la misma luz y sombra mate (`--brillo-arriba` + `--relleno-*` +
  `--relieve(-claro)` + sombra `0 5px 12px rgba(1,30,65,.14), 0 1px 2px rgba(1,30,65,.1)`).
  Los "← Volver" usan la clase **`boton-atras`** junto a `enlace-volver` (login y registro no la
  tenían). "Saltar" de la intro: pastilla crema 3D con texto #011E41. Zonas del registro:
  crema 3D; la elegida con el relleno principal del rol.
- La intro mide el alto de la ventana (`#app .intro { height: 100dvh }`): la animación de
  entrada de la vista la estiraba al alto de la página y "Saltar" quedaba fuera de la pantalla.
  Versión actual: `?v=20261029c`.

## Ajustes de oct 2026 (14) — lista grande del equipo (manda sobre lo anterior)
- **Botones de navegación solo con ícono** (Volver, Pantalla principal / Menú, Estantería):
  `botonesNavSoloIcono()` en `js/boton-inicio.js`, llamado por `main.js` después de cada
  pantalla (y con un MutationObserver para los que aparecen después). Convierte `.boton-atras`,
  `.boton-inicio` y `.boton-estanteria` en círculos 3D crema de `--tam-nav` (56px; 48px en
  celular) con ícono de `--tam-nav-icono`; el texto queda en `aria-label` y `title`. En el HTML
  se siguen escribiendo con su texto. Todos quedan arriba al mismo margen: "Volver" en la
  esquina superior izquierda y los demás en la superior derecha, en todas las pantallas.
- **Márgenes iguales en los cuatro bordes:** `--margen-arriba/abajo/lado` = 24px (16px en
  celular). Las vistas usan todo el ancho (sin `max-width`) y el contenido se centra en el alto.
- **Portada:** sin el texto entre logos y "Siguiente" (más espacio, `margin-top: 56px`); sin el
  punto que flotaba detrás de "CaliDa" (`portada__punto--1`).
- **Isla 3D (`js/inicio3d.js`):** termina en punta (`LatheGeometry`, perfil de abajo hacia
  arriba para que las caras miren afuera); el lienzo baja un 45 % más que la escena y se encuadra
  con `setViewOffset` (el gato no se mueve). La isla ya no gira sola (el gato parecía resbalar);
  solo flota toda la escena con CSS. Tarro y papel lado a lado sobre la caja cerrada, sin meterse
  uno en el otro.
- **Gato con la luz de la isla:** `data-luz="isla"` en el gato de la portada → mismas luces que
  la isla (sol desde la izquierda, sombra hacia la derecha). Las normales del brazo se calculan
  en cada cuadro (antes "brincaba" la luz al saludar).
- **Estantería (`js/estanteria3d.js`):** una sola luz frontal (sin ambiente ni relleno); la madera
  sube su `emissive` (#8E4F2C) para no oscurecerse. Hover de una categoría: luz cálida desde el
  fondo del compartimiento (`texturaLuzFondo`, plano aditivo), ya no el plano amarillo encima.
- **Mapa a pantalla completa y cenital (`js/mapa3d.js`, `js/donante/mapa.js`):** cámara
  ortográfica mirando hacia abajo (norte arriba), sin OrbitControls. `encuadreDe(zona)` encuadra
  la ciudad o la zona en el espacio libre (`opciones.margenes()` descuenta encabezado, zonas y
  gato). Las zonas van en columna arriba a la izquierda y al tocarlas la cámara se acerca a esa
  zona. El gato con su globo va abajo a la derecha. La ruta "Categoría › Producto" es solo texto
  (sin pastilla). Se quitó el botón "Usar/Actualizar mi ubicación" (se pide sola al entrar). La
  lista de centros sigue debajo del mapa.
- **Elige tu perfil:** las tarjetas usan capturas de la app (`assets/entrar/donador.jpg`: mapa;
  `assets/entrar/admin.jpg`: mesas con cajas).
- **Admin:** el panel de estado (zoom) ocupa toda la pantalla bajo la fila de navegación;
  "Siguiente" / "Guardar" en su esquina superior derecha; sin el gato: una línea de texto explica
  Urgente (0), Desabastecido (1–2), Provisionado (3–4) y Abastecido (5). Registrar donación y
  despacho a todo el ancho.
- Versión actual de CSS y módulos cambiados: `?v=20261029e`.

## Ajustes de oct 2026 (15) — modelos nuevos del equipo (.blend → .glb)
- Los `.blend` del equipo están en la raíz del proyecto (`estanteria.blend`, `cajas.blend`,
  `escena_mapa.blend`; no se suben a GitHub). Se exportan con Blender 3.6 en modo consola
  (`blender -b archivo.blend --python exportar.py -- <modo> <salida>`): los colores de ruido
  procedural se cambian por un color plano (promedio de la rampa) y todo queda mate. Los del mapa
  van con compresión **Draco** (el cargador de `mapa3d.js` usa `DRACOLoader` del CDN 0.160.0).
- **Estantería:** `assets/modelos/estanteria.glb` sale de `estanteria.blend`, escalada ×2,114
  (mismo tamaño que la anterior, 6,15 × 5,41) y ya de frente (no se gira). `COMPARTIMIENTOS`,
  `FONDO_Z` (-0,567) y `FRENTE_Z` (0,8) medidos en el modelo; la tabla del piso es parte del marco
  y sobresale (`frente: 0.86` en Construcción); placas y etiquetas van en `yTabla(c)`.
- **Cajas de la isla (portada):** `assets/modelos/cajas.glb`; `cajaDelModelo()` en
  `js/inicio3d.js` copia cada caja por nombre (`Caja_Botiquin`, `Caja_Derecha`, `Caja_Base`,
  `Caja_Base`+`Caja_Arriba` apiladas, `Caja_Frontal`), la escala al ancho de la caja anterior y
  apoya las donaciones según su alto real.
- **Mapa con la geografía de Cali:** `assets/modelos/cali_montanas.glb` (cerros, arbustos,
  árboles, Cristo Rey con su plaza y Tres Cruces; sin nubes ni los dos cerros de adelante) y
  `assets/modelos/torre_cali.glb`. Los cerros (Farallones) van como bloque en el borde occidental,
  espejados para que las Tres Cruces queden al norte del Cristo Rey. Los lugares se sacan del
  bloque y van donde quedan en Cali (`proyectar([lng, lat])`): Tres Cruces en su sitio (sobre una
  lomita), Cristo Rey a su latitud sobre los cerros al borde de Occidente (su sitio real cae dentro
  de la zona), Torre de Cali en el norte de Centro, al lado de la Plazoleta Jairo Varela (sube y
  baja con la zona). Arbustos que caían encima de un lugar se ocultan. Nada de esto se puede tocar.
- La cámara del mapa sigue ortográfica pero **inclinada 20°** (`INCLINACION`) para que se vean los
  costados de la torre, las cruces y el Cristo; el encuadre tiene en cuenta la altura de los
  puntos. En computador "Toda Cali" incluye los tres lugares; en celular solo la ciudad.
- Versión actual de los módulos cambiados: `?v=20261029f`.

## Ajustes de oct 2026 (16)
- **Intro:** las nubes son las de `escena_mapa.blend` (`Nube_0…5`), renderizadas en Blender
  (Eevee, fondo transparente) como `assets/intro/nube_N.png`; cinco `<img class="intro__nube">`.
- **Isla de la portada:** sin sombras proyectadas; cada mesa y caja lleva una sombra suave pintada
  (`sombraSuave()` en `js/inicio3d.js`), igual de difusa y del mismo tono que la del gato (verde
  oscuro en el césped, café sobre la madera). La sombra del gato con `data-luz="isla"` es más
  oscura (mismo tono). `montarIsla(el, { camara, capturable })` permite sacar "fotos" de la isla.
- **Elige tu perfil:** `assets/entrar/admin.jpg` es una captura de la isla vista desde la derecha
  (se ven las mesas con las cajas y los productos).
- **Estantería del donante:** la luz volvió a la de antes (ambiente + hemisferio + sol + relleno; la
  madera `#B87048` con emissive `#4E2A14`): los productos se ven del mismo material mate que todo.
  El mueble va a la izquierda (`margenDerecho` en `montarEstanteria3D`) y a la derecha el gato
  pregunta "¿Qué deseas donar?" (`renderEscena3D({ lado })`; el h1 queda oculto para lectores).
  La luz del hover es más sutil y difusa.
- **Mapa:** zonas más cortas; ruta "Categoría › Producto" centrada en la pantalla; **río Cauca** al
  oriente (cinta azul mate con orilla, por fuera de las zonas, de Jamundí hacia Yumbo); las casas y
  el pin se ven **de frente** (la figura se inclina hacia la cámara, `VER_TECHO` deja ver el techo
  de color), casas más grandes (`ALTO_CASA` 1,2), pin más pequeño; sin leyenda; mapa más grande
  (`RELLENO.ciudad` 0,99); gato y globo más grandes; sin tarjetas de centros abajo (solo quedan
  como respaldo si el 3D no carga) y al pie del mapa: "Selecciona un centro de acopio para obtener
  más información."
- **Admin:** menú con las tareas hasta la mitad de la pantalla (izquierda) y el gato a la derecha:
  "Selecciona la tarea que deseas realizar."; en el estado del centro "Volver a las cantidades" es
  solo un ícono; Registrar donación y despacho miden justo el alto de la ventana (sin scroll); el
  panel de estado del centro tiene el mismo tamaño que esas tarjetas (arriba a 116 px del margen).
- Versión actual: `?v=20261030a`.

## Ajustes de oct 2026 (17)
- Nubes de la intro suavizadas (subdivisión + sombreado suave al renderizarlas en Blender).
- `assets/entrar/admin.jpg`: primer plano de la mesa con el tetero y, a la izquierda, la bolsa de
  comida para animales (cámara `montarIsla(..., { camara: { posicion: [-0.32, 1.36, 1.3],
  mira: [0.08, 0.84, -0.58], fov: 28 } })`).
- **Estantería del donante, de frente:** la cámara está centrada y a la altura del mueble (sin
  elevación); para dejar a la derecha el gato se corre la **imagen** (`setViewOffset`,
  `aplicarCorrimiento`), no la cámara. `FRACCION_LADO` (0,36) en `estanteria-vista.js`. El 3D avisa
  dónde queda el mueble (`alMoverMueble`) y el gato con su globo toma su mismo alto y el mismo
  margen al borde derecho que el mueble al izquierdo. Al acercarse a un compartimiento el gato se
  esconde y se usa todo el ancho. La luz del hover es muy difusa (degradado largo y suave).
- **Mapa:** "Toda Cali" encuadra el mapa completo (cordillera, ciudad y río) centrado entre las
  zonas y el gato; zonas y gato a `--margen-mapa` (44 px) del borde; deja libre el mensaje del pie.
  El río Cauca tiene meandros, playa de arena, orilla, reflejos, bancos de arena y arbolitos.
- Versión actual: `?v=20261030b`.

## Ajustes de oct 2026 (18)
- **Portada:** logos y "Siguiente" a la misma distancia del borde izquierdo que la plataforma
  del gato del borde derecho: `inicio3d.js` mide el borde del césped en pantalla
  (`medirMargenIsla`, también al terminar la entrada y al cambiar el tamaño) y pone
  `--margen-isla` en la portada; `.portada__texto` lo usa (dividido entre 1,25 por su `zoom`).
- **Elige tu perfil:** composiciones nuevas en primer plano, hechas con los modelos del proyecto:
  `donador.jpg` = las casas diseñadas (rojas y amarillas) con los cerros, las Tres Cruces y el
  Cristo Rey detrás; `admin.jpg` = una mesa larga con las cajas y productos de la estantería.
- **Estantería:** gato un poco más pequeño (24vw); su globo empieza a la altura del borde
  interno de la tabla de arriba del mueble (`topInterior`, y = 5,079). Luces un poco menos
  intensas (ambiente 0,66, hemisferio 1, sol 1,1, relleno 0,5) con las mismas proporciones.
- **Mapa:** sin el aviso de ubicación encima del mensaje del pie; "Toda Cali" ya no encuadra la
  cordillera completa (Cali y los cerros se ven mucho más grandes; solo entra el tramo del río
  junto a la ciudad y los tres lugares); gato y zonas a `--margen-mapa` 72 px del borde.
- Versión actual: `?v=20261030c`.
