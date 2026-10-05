# 🛑 PROTOCOLO OBLIGATORIO — se cumple en TODA respuesta, en TODA cuenta, sin excepción

Inty (dueño de Libre Pedal y de CIBER STAK SPA) lo exigió el 2026-10-04 después de demasiadas
entregas con errores evitables: *"no quiero errores; si no sabes, busca e investiga"*. Este
archivo se carga solo (lo importa `CLAUDE.md`). No es una sugerencia: un incumplimiento es un error.

## 1. Antes de hacer cualquier cosa
1. **Leer los protocolos que aplican** (todos se cargan con `CLAUDE.md`): este archivo,
   `METODO-DE-TRABAJO-INTY.md`, `diseno-ui/METODO-TRABAJO-DISENO.md`,
   `diseno-ui/LEY-DISENO-BENCHMARK.md` y `vision-doctrina/PROMPT-MAESTRO-CALIDAD.md`.
2. **Sincronizar** (`git fetch`) y mirar qué hicieron las otras cuentas en las últimas horas
   (ramas, `COORDINACION-IA/`). Nunca trabajar sobre un estado viejo.
3. **Si no sabes algo, INVESTIGA antes de hacerlo**: web, documentación oficial, código real.
   Nunca de memoria, nunca "debería ser así".

## 2. Diseño (cualquier cosa visual: pantallas, Pistero, accesorios, íconos)
1. **Referencias reales PRIMERO.** Buscar en la web el producto real (p. ej. lentes de ciclismo
   Oakley/POC/Shimano/Decathlon) y las mejores apps/personajes del rubro. Mostrarle a Inty un
   **panel de referencias** con lo que se extrae de cada una. Recién después, dibujar.
2. **Actuar como diseñador senior experto.** Nada genérico, nada "suficiente". Si el resultado
   no estaría en una app profesional, no se muestra.
3. **Geometría real, nunca aproximada.** Pistero (viewBox 0 0 100 84): ojos (40,63)/(60,63)
   rx 6.2 ry 7.6; el casco termina en y≈54 (x 12–88); cara x 16–84, mentón y≈80; **sin orejas**;
   correas x≈18/82; mejillas (30,71)/(70,71); boca y≈74. Toda pieza se ancla a estas medidas.
4. **Una pieza a la vez**: dibujar → renderizar en grande, en contexto y al tamaño real →
   revisarla uno mismo con lupa → corregir → recién mostrarla. Esperar el ✓ antes de la siguiente.
5. **Mockup aprobado antes de programar cualquier UI.** Íconos a medida, nunca emoji.

## 3. Código y pruebas
1. Tests (`node tests/run.mjs`) y el gate de calidad verdes; probar la función real en el
   navegador en tamaño de teléfono; si es posible, en el teléfono de Inty.
2. **Nunca tocar datos de producción al probar.** `db` es `const` en `index.html`: reemplazar
   `window.db` NO lo intercepta. Usar una copia sin Firebase o un mock verificado antes de navegar.
3. Causa raíz, nunca parche. Buscar el mismo error en todo el código.
4. Nada entra a `main` sin ✓ de Inty. Versión en los 3 lugares.

## 4. Antes de entregar (revisión obligatoria, cada vez)
- [ ] ¿Investigué/usé referencias reales, o lo inventé?
- [ ] ¿Lo vi yo mismo renderizado/probado, con ojo crítico, y corregí lo que encontré?
- [ ] ¿Las medidas salen del código/dato real?
- [ ] ¿Dije con honestidad qué NO pude probar?
- [ ] ¿La respuesta es corta, sin excusas ni narración, con lo que Inty tiene que hacer (si algo)?

Si algún punto falla, **no se entrega**: se corrige primero.

## 5. Cuando Inty corrige
Su corrección es un requisito. Se aplica de inmediato y, si es una regla nueva, **se agrega a
este archivo en el mismo trabajo** (rama + aviso a Inty) para que ninguna cuenta la repita.
