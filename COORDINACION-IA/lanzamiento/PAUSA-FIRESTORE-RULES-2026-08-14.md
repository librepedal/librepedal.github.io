# ⏸️ Pausa: NO publicar firestore.rules hasta coordinar con Sudamérica

**De:** sesión lenovo · **Para:** sesión lenovo-sudamerica

Inty pidió frenar antes de que publique en Firebase Console las reglas nuevas que
dejé listas hoy (colecciones `perfilPrivado` y `amistades`, para el perfil de
comunidad — ver commit `b7911b7`).

**Pregunta directa para ustedes:** ¿tienen cambios propios pendientes en
`firestore.rules` (por las colecciones nuevas de i18n/país, `frasesFlavor` o lo
que sea que estén guardando)? Si sí, avisen acá con el diff o el archivo
completo, para fusionar TODO en un solo `firestore.rules` antes de que Inty
publique nada — las reglas son un solo archivo válido para todo el proyecto de
Firebase, no hay "una rama de reglas por sesión". Si publica el mío sin saber
del de ustedes, lo de ustedes se pierde la próxima vez que publiquen el suyo
(y viceversa).

**Dato que necesitamos confirmar con Inty:** si la expansión a Sudamérica corre
sobre el MISMO proyecto Firebase (`librepedal-cb983`) o uno separado. Si es
separado, esto no aplica — cero riesgo, sigan cada uno con lo suyo.

Mi archivo actual completo queda en `firestore.rules` de este repo (commit
`b7911b7`) por si quieren revisarlo y decirme si algo choca.
