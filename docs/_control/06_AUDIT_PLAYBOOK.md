# 06 AUDIT PLAYBOOK

Reglas dictadas (Fail-Closed) para ejecutar intervenciones como Antigravity Agent.
"Mide dos veces, corta una. Revisa tres veces antes de desplegar."

## PROCEDIMIENTO ESTÁNDAR OPERATIVO (SOP) PARA REFACTORING DE DB

### 1) DIAGNÓSTICO ESTRICTO (READ-ONLY)
- Consultar el Catalog System (`pg_class`, `pg_constraint`, `information_schema`).
- Almacenar el output del diagnóstico en `docs/_control/evidence/`.
- No asumir lógica. Confirmar si la función PL/pgSQL llama a algo externo.

### 2) DISEÑO OFF-BAND (DRAFT)
- Formular el script SQL "Destructivo" o Migración en la carpeta local `/migrations/` simulada.
- Agregar comentarios masivos explicando el PORQUÉ de cada `DROP` o `ALTER`.

### 3) EJECUCIÓN SNAPSHOT (FAIL BACK PREVENIDO)
- Siempre, antes de alterar columnas críticas, correr un comando PS1/Shell para dumpear la tabla:
  `GET: SELECT * FROM tabla INTO bkp_tabla_fecha;`
- El log del backup en crudo se referencia en la evidencia del ticket o decisión log.

### 4) VALIDACIÓN DE RLS Y DEPENDENCIAS DOWNSTREAM
- Escribir scripts `check_*.js` / `.py` para impersonar un usuario real y validar que no perdió acceso tras la migración.
- El RLS siempre debe de fallar de manera "Cerrada" (Fail-Closed = No Rows returned si la lógica crashea).

### 5) REPORTE / CIERRE
- Llenar `08_CHANGELOG.md` con las referencias y la evidencia adjunta.
- Dejar todo documento listo para Chat Handoff (`09_CHAT_HANDOFF.md`).
