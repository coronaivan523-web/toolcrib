# 11 RELEASE GATES (BARRERAS DE DEFENSA)

Lista estricta de condiciones (*Gates*) inquebrantables antes de fusionar cualquier rama operativa de desarrollo (`feature/*` o `hardening/*`) hacia la rama `main` de ToolCrib.

## GATE-1: NO SECRETS EN REPOSITORIO / LOGS 
- Ningún path, log, o archivo estático puede contener contraseñas directas, hashes estáticos descodificables, ni JWT tokens validos.
- Fallo detectado: FAIL-CLOSED -> Purgar historial o revertir PR.

## GATE-2: DOCS CONTROL ROOM ACTUALIZADO
- Toda característica que añada nuevas columnas en DB o altere la seguridad estructural debe estar referida en el Changelog y actualizar documentos Target Architecture (02) o Tenant Isolation. 

## GATE-3: AUDIT [PASS] OBLIGATORIO PARA MERGE
- La Rama sólo ingresa si el equipo o Autómata generó un `AUDIT_YYYY-MM-DD_FEATURE.md` que indica **Veredicto: PASS**.
- PR sin Audit -> PR Denegado.

## GATE-4: CLONACIÓN STAGING PASS (SI APLICA)
- Si la rama involucró alteraciones de esquema SQL, debe correr con éxito la rutina de clonación completa entre Producción -> Staging sin errores de Constraint de FK.
