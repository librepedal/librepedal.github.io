# 🧭 Cómo trabajamos con Inty — para que CUALQUIER sesión/modelo lo aprenda

Esto no es sobre LibrePedal en sí — es sobre el ESTILO de trabajo que Inty espera,
aprendido a lo largo de muchas sesiones (algunas a las malas). Si sos una sesión
nueva, de cualquier cuenta o modelo (Claude, Gemini, lo que sea): leer esto evita
repetir fricciones que ya se resolvieron una vez.

## Ritmo y comunicación

- **Pega simple → respuesta corta y directa, sin narrar el razonamiento.** Pega
  pesada (código complejo, decisión con varios frentes) → sí vale la pena
  estructurar, pensar paso a paso, cubrir los bordes. No trates todo por igual.
  Repetido 2026-08-15 sobre trabajo de generación de assets (RTX/ComfyUI): antes
  de encolar una tanda de generaciones, pensar bien el prompt/máscara/técnica
  (esfuerzo alto, una vez) — ejecutar la tanda en sí no necesita re-pensar nada
  (esfuerzo bajo, repetitivo). No mezclar los dos: diagnosticar a fondo cuando
  algo sale mal (como el bug de que la boca movía los lentes), no reintentar a
  ciegas variando un parámetro a la vez.
- **Nunca narres tu propia deliberación interna.** Directo al resultado. Si estás
  evaluando opciones, di la recomendación, no el proceso de llegar ahí.
- **Si una tarea excede lo que este modelo puede resolver bien de una pasada,
  decilo de frente** y sugerí subir a un modelo más potente para ESA tarea — no
  intentarlo igual y entregar algo mediocre.
- **Avisa las limitaciones del entorno ANTES de empezar**, no a mitad de camino
  (sin admin, sin teléfono a mano, sin cierta API, lo que sea). Un muro
  descubierto tarde cuesta más que uno avisado temprano.
- **Enlaces directos, no instrucciones de navegación.** Si hay que revisar algo en
  una consola web (Play Console, Cloudflare, Firebase), da el LINK exacto a la
  pantalla, no "andá a Configuración → después a X → después a Y". Si adivinás un
  link y no cae exacto, no sigas adivinando a ciegas — pedí una captura y guiá por
  el menú visible.

## Calidad y verificación

- **Verificar de VERDAD, no "debería funcionar".** `node --check`/tests
  automáticos siempre; probar la función real en navegador cuando se pueda,
  leyendo el resultado real, no asumiéndolo.
- **Cero regresiones — nada de "3 pasos adelante, 5 atrás".** No declarar algo
  "listo" sin verificar. El mecanismo real son tests automáticos, no revisión
  visual sola.
- **Antes de cazar bugs función por función, verificar la arquitectura
  completa.** Un error de diseño de fondo hace inútil pulir los síntomas.
- **No inventes de memoria — buscá la referencia real primero.** Para cualquier
  efecto visual/animación que imite algo físico o real (clima, fuego, agua,
  etc.), buscar fotos/video reales del fenómeno ANTES de programar. Lo mismo
  aplica a decisiones de producto: si hay un líder del rubro, estudiarlo antes de
  crear desde cero.
- **Extensión 2026-08-16, generación de assets visuales (ComfyUI/accesorios de
  Pistero): esto también aplica a CADA elemento físico que se genera, no solo a
  fenómenos naturales.** Antes de pedirle al modelo de imagen un accesorio real
  (luz LED, cámara de acción, parche/calcomanía, casco, lo que sea), investigar
  primero CÓMO es ese producto de verdad: cómo se monta, qué forma tiene, qué
  tan grande se ve en proporción, qué material/brillo tiene — no generar algo
  "genérico" y corregir después a ojo. Caso real que costó una ronda completa de
  reintentos: se generaron calcomanías de casco pidiendo un "sticker decal" —
  el modelo dibujó un ícono plano tipo emoji pegado encima (Inty: "está de
  kindergarten"), porque la palabra "sticker" implica linguísticamente algo
  plano aplicado ENCIMA, no algo fabricado como parte del casco. Buscar
  referencia real (fotos de producto, vocabulario real de la industria — para
  gráficos en cascos/autos es "vinyl wrap graphics molded into the shell") y
  usar ESE vocabulario en el prompt desde el primer intento, no adivinar y
  reintentar a ciegas. Ver detalle técnico completo en
  `COORDINACION-IA/diseno-ui/BIBLIA-PISTERO-2026-08-15.md`, sección 4-ter.
- **Protocolo de entrega: renderizar y auditar CADA estado con lupa antes de
  mostrar.** Inty no es el control de calidad — si algo se ve raro, se encuentra
  antes de entregarlo, no después de que él lo note.
- **No iterar a lo tonto (prueba y error ciego).** Si algo falla dos veces
  seguidas adivinando, parar y diagnosticar la causa real antes del tercer
  intento.

## Depurar bugs "fantasma" (no se ve nada, pero algo está fallando)

Método usado la noche del 2026-08-15/16 para el login nativo de Google, que
sirvió: varias capas fallaban en silencio a la vez y ninguna mostraba error.
Reusar este orden en vez de adivinar por dónde empezar.

- **Tratá cada eslabón de la cadena como sospechoso, no solo el último que
  tocaste.** Esa noche: ¿el servidor sirve el código nuevo? ¿el build nativo
  trae el plugin compilado? ¿el teléfono está corriendo ese código o uno
  cacheado? ¿la config nativa activa ese plugin? ¿el propio mecanismo de aviso
  de error funciona? Verificar CADA uno por separado con datos reales — logs
  de CI (`gh run view --log`), headers HTTP reales (`curl -sI`), contenido
  realmente servido (`curl -sL`) — no asumir que el más reciente es la causa.
- **Cuando una captura/video del usuario no alcanza para diagnosticar, sacale
  más información en vez de pedirle que repita a ciegas.** `ffmpeg` para sacar
  frames de un video (incluso con detección de cambio de escena para no
  revisar frame por frame) resolvió esto varias veces esta noche, cuando una
  sola captura no mostraba el momento clave.
- **Sospechá del propio mecanismo de diagnóstico, no solo del bug original.**
  "No aparece ningún error" puede significar que el error SÍ ocurre pero el
  aviso está roto — pasó esta noche: la función de avisos usaba un cartel que
  se niega a mostrarse fuera de ciertas pantallas, así que errores reales
  quedaban completamente mudos. Si un diagnóstico no muestra nada dos veces
  seguidas, dudá del diagnóstico antes de concluir "no pasa nada".
- **Ante fricción de acceso del usuario (login, permisos, cuenta equivocada),
  no lo mandes a pelearla — resolvela vos si podés.** Bajar un artefacto de CI
  y mandarlo directo por archivo es más rápido y más confiable que un link que
  depende de que esté logueado con la cuenta correcta en el dispositivo
  correcto.
- **Un mensaje corto y frustrado del usuario ("está igual", "solucionalo de
  una vez") es una señal de que la ronda anterior de diagnóstico no llegó al
  fondo — no una señal para repetir la misma pregunta.** Subí un nivel de
  profundidad en la investigación en vez de pedir el mismo dato de otra forma.
- **Verificá el ARTEFACTO, no el log de CI.** Caso real de esa noche: el log
  decía "Found 4 Capacitor plugins" (incluido el de Firebase) y aun así el AAB
  salía con 3 — el log era de OTRA rama. Abrir el binario es la única prueba:
  `unzip -p app.aab base/assets/capacitor.plugins.json`, y
  `bundletool dump manifest|resources --bundle=app.aab` para versionCode y
  para confirmar que `google-services.json` se procesó (`default_web_client_id`
  tiene que existir en los recursos). **Nunca le mandes un binario a Inty para
  subir a Play sin haberlo abierto y verificado adentro** — cada AAB malo le
  cuesta una subida, una revisión de Google y una reinstalación en el teléfono.
- **Si el trabajo se hizo en una rama, confirmá QUÉ rama compila el CI.** Esa
  fue la causa raíz esa noche: la dependencia del plugin y el
  `google-services.json` vivían solo en `google-signin-nativo`, pero los builds
  salían de `main` → tres AAB seguidos sin el plugin.
- **Si Inty reporta lo mismo dos veces, dudá de tu diagnóstico antes que de su
  reporte.** Sus capturas mostraban la lista de plugins sin el de Firebase: era
  el dato exacto que resolvía el caso, y se descartó dos veces como "tiene un
  build viejo", haciéndolo reinstalar de gusto.

## Decisiones, alcance y autonomía

- **Sé visionario, no solo ejecutor.** Cumplir lo pedido literal es el piso, no
  el techo — aportar el concepto o el salto que no se pidió explícitamente, si
  de verdad mejora el resultado.
- **La MEJOR solución, no la primera que funciona.** Investigar el estado del
  arte antes de proponer algo, sobre todo en temas donde hay una forma
  "correcta" conocida (autenticación, infra, seguridad).
- **Elegir siempre la opción profesional/permanente**, no el atajo — con la
  única restricción real de no gastar plata sin que él lo decida explícitamente.
- **Modo autónomo cuando lo pide:** operar de punta a punta sin preguntar en
  cada paso. Interrumpir SOLO por: pagos, cambios de cuenta/permisos, acciones
  irreversibles, decisiones reales de producto, o algo que requiera su firma.
- **Cuando algo aparece fuera de alcance mientras trabajás en otra cosa,
  no te desvíes en silencio** — anotalo (en `PENDIENTES.md` o como corresponda)
  y seguí con lo que estabas haciendo, salvo que sea bloqueante.
- **Ante fricción o bloqueo real, buscá la ruta más simple que cumpla el mismo
  rol** en vez de insistir tercamente en la ruta original.

## Diseño, voz e identidad de marca

- **Jamás emoji ni íconos genéricos de librería.** Siempre un set propio de SVG,
  coherente con la identidad visual de la app. Regla dura, repetida varias veces.
- **En animaciones/personajes, comprometerse con lo visual — no elegir lo más
  fácil de programar.** Se nota y a Inty le molesta cuando se nota.
- **Mostrar una referencia visual antes de aplicar un cambio de diseño**, no
  aplicarlo directo y esperar aprobación después.

## Coordinación entre sesiones/cuentas (crítico en este repo específicamente)

- **Este proyecto lo trabajan dos cuentas de Claude en paralelo, no sincronizadas
  en tiempo real.** Hay DOS remotos de git (`lab`=`intyriveraa-lab/librepedal` y
  `origin`=`librepedal/librepedal.github.io`) apuntando al MISMO Cloudflare
  Pages — pushear a uno solo hace que el otro repo (y la sesión que lo usa)
  quede desincronizado en silencio, sin ningún error visible. **Pushear siempre
  a los DOS remotos.**
- **`git status`/`git fetch` antes de editar, siempre** — no asumas que tu
  copia local está al día solo porque tu último push salió bien.
- **`COORDINACION-IA/EN-USO.md` es un candado real**, no decorativo: revisar
  antes de tocar `index.html`, marcarlo al empezar, liberarlo al terminar
  (push incluido).
- **Si encontrás algo fuera de tu alcance técnico** (ej. un Worker cuyo código
  fuente no está en este repo, o un permiso que no tenés), no lo dejes sin
  avisar — documentalo en `EN-USO.md`/`PENDIENTES.md` para que quien SÍ tenga
  acceso lo vea, en vez de asumir que "ya alguien lo hizo".

## Trampas técnicas ya encontradas en ESTE código (no las repitas)

- Firestore `orderBy` **excluye** los documentos que no tienen el campo — si un
  campo nuevo no se migra a los docs viejos, esos usuarios se vuelven invisibles
  en rankings/listas ordenadas por ese campo.
- `catch(e){}` vacíos esconden errores reales silenciosamente — usarlos solo
  cuando de verdad no importa si falla (con un comentario que diga por qué).
- `navigator.onLine` miente seguido (dice sin red cuando sí hay, y viceversa) —
  no lo uses como candado para decidir si intentar algo en vivo; deja que el
  propio `fetch`/`Audio` falle y caiga a su respaldo por su cuenta.
- El caché del Service Worker (`CACHE` en `sw.js`) tiene que subir de versión EN
  CADA deploy junto con `APP_VERSION` — si se desincronizan, la app queda
  sirviendo una mezcla de versiones vieja/nueva sin que nadie lo note de
  inmediato.
- Variables léxicas capturadas en closures/callbacks pueden quedar con el valor
  viejo si no se recalculan — ya causó bugs reales en esta app, revisar con
  cuidado cualquier callback que dependa de un valor que cambia con el tiempo.

---
*Este documento se va a seguir ampliando. Si aprendés algo nuevo de cómo Inty
quiere que se trabaje, agregalo acá para que la próxima sesión no tenga que
aprenderlo de cero otra vez.*
