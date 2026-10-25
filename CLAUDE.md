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
- Paleta oficial (`claude_paleta`): rojo carmín #CC0100 (botón principal), rojo profundo #A5121A,
  azul Cruz Roja #011E41 (títulos/textos), azul petróleo #426D8C, coral #F67751 (gato),
  amarillo #FDD794, salvia #86B5A9, marfil #FFF8ED, beige arena #E8E1D5, marrón carbón #514B46.
- **Fondo de toda la página: azul salvia #86B5A9**; contenedores marfil/blancos muy redondeados;
  textos sobre el azul en azul oscuro (#011E41 / #1E3A4F, contraste ≥ 4.5:1).
- Referencias: interfaces ilustradas cálidas (tarjetas redondeadas), **sin perder el estilo 3D**.
  Sin marcos alrededor de las pantallas, sin ondas al pie, sin alfombra ni luz naranja en la
  pantalla principal (solo profundidad suave).
- **Botones, pastillas y tarjetas "gorditos" y MATES** (mismo material que los productos de la
  estantería): relieve suave, sin brillo ni reflejo (variables `--brillo-arriba`, `--relieve`,
  `--relleno-rojo/azul/marfil/amarillo/salvia`, redefinidas al final de `css/tema.css`).
- Pantalla principal: el gato sobre una tarima redonda (marfil, borde rojo, escalón azul
  petróleo) vista desde arriba como escenario (`data-escenario`, `renderMascota({ escenario })`);
  título en letras 3D (cara azul oscuro, costados azul petróleo con `text-shadow`).
- Tarjetas de centros bajo el mapa: urgentes en rojo carmín, desabastecidos en amarillo.
- Menú del admin: cada tarea con su color (insumos amarillo, donación coral, despacho azul claro)
  e íconos 3D mates hechos con three.js (`generarIconoMenu` en `js/miniaturas3d.js`).
- Admin: "Volver a pantalla principal" fijo arriba a la derecha en todas las pantallas.
- Gestionar insumos: recuadros marfil con relieve, franja y pastilla del color del estado.
- **Distribución de mapa, ficha del centro y pre-registro** (clase `vista-columnas` para ficha y
  pre-registro): arriba "← Volver" (azul) + ruta en pastilla roja + "Volver a pantalla principal"
  e "Ir a la estantería" a la derecha; al medio el panel grande (mapa o `pantalla-panel`) con el
  gato en su columna derecha (mensaje con título rojo arriba, gato abajo); al pie los botones de
  acción (en el mapa, además, las zonas en una pastilla segmentada; zonas con urgencias en rojo).
- Tipografía Montserrat. Los ajustes de estilo más recientes están al final de `css/tema.css`.

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
- Mapa, ficha y pre-registro: el gato va **en su propia columna al lado del panel** (computador)
  con su mensaje arriba; nunca tapa el contenido. En celular va en una fila encima del panel.
- three.js cambia los espacios de los nombres de las partes por "_" ("Pupilas_espejo"): buscar
  partes con `parte()` en `gato3d.js`, no con `getObjectByName` directo.
- Si no hay WebGL, se usa el gato 2D (PNG/SVG) como respaldo.
- **Tono de los mensajes:** primera persona, frases cortas y cálidas; al admin le dice
  "tu centro" (p. ej. "Cuéntame cuánto hay de cada cosa en tu centro…").

## Estantería 3D — `js/estanteria3d.js`
- Mueble `estanteria.glb` (girado para quedar de frente), madera de un solo tono (`#DBA878`).
- Compartimientos: Alimento y Aseo arriba, Ropa y Medicamentos al medio, Construcción abajo.
- **Cámara fija** (no se arrastra); llena la pantalla; se ve la placa de Construcción.
- Placas de categoría y etiquetas de producto **clavadas a la madera** (3D, no flotantes).
- Al tocar una categoría la cámara se acerca y queda fija; "← Ver toda la estantería" va en la
  **esquina inferior derecha**; el mensaje de ayuda en la esquina inferior izquierda.
- Buscador con palabras parecidas y sinónimos (`SINONIMOS_SUBCATEGORIA` en `js/data.js`).
- Un modelo por subcategoría (`MODELOS_SUBCATEGORIA`); ajustes de color y calcomanías (maíz en la
  lata, huella en la bolsa de mascotas, botella de agua azul) en `js/ajustes-modelos.js`.
  Ropa (camisa, vestido, overol) y papel higiénico fueron generados para el proyecto.
- **Todos los íconos de productos** de la página usan "fotos" de los modelos 3D
  (`js/miniaturas3d.js`, `iconoProducto()` en `js/ilustraciones.js`).

## Mapa 3D — `js/mapa3d.js`
- Zonas del área urbana trazadas sobre el mapa oficial; colinas con pocos pinos alrededor;
  sin árboles sobre la ciudad; sin río; sin plano de base visible (solo un `ShadowMaterial`
  que recibe la sombra de la ciudad y las colinas).
- **Mapa fijo** (sin gestos); encuadre automático centrado (la ciudad ocupa ~80 % del recuadro;
  ajustable con el valor `0.8` en `encuadrarCiudad`).
- Casas `casa_roja.glb` / `casa_amarilla.glb` estilizadas con la paleta, giradas a tres cuartos.
- Ubicación del usuario: se pide al entrar; si está fuera de Cali el pin va al borde con la
  distancia; botón **"📌 Marcar dónde estoy"** para tocar el mapa si el navegador no la da.
- El gato explica colores (roja urgente / amarilla desabastecido) y el centro más cercano.

## Otros datos
- Subcategorías: incluye "Comida para animales" (Alimento) y "Analgésicos" (sin "y fiebre").
- Mensajes del gato por subcategoría en el pre-registro: `IMPORTANCIA_SUBCATEGORIA` (`js/data.js`).
- Necesidades por centro: `NECESIDADES_SEMILLA` (`js/data.js`); se ven en la ficha del centro.
- `js/store.js` migra datos guardados (subcategorías nuevas, zona de Jairo Varela) sin borrarlos.

## Pendientes conocidos
- Correo real: conectar EmailJS en `js/email.js` (instrucciones comentadas). El mapa del correo es
  SVG (Gmail/Outlook no lo muestran): en producción usar imagen estática.
- Varios centros son de ejemplo (marcados en `js/data.js`).

## Cómo verificar cambios
- Revisar en el navegador las pantallas: `#/`, `#/entrar`, `#/donante/estanteria`,
  `#/donante/mapa/alimento-agua`, `#/donante/ficha/centro-jairo-varela/alimento-agua`,
  pre-registro, y como admin `#/admin/insumos` (dos pasos) y `#/admin/donacion`.
- Comprobar que no haya errores en la consola y que nada tape el mapa.
