# CHECKLIST: P0 - IDENTITY DECOUPLE

**Objetivo:** Remover la dependencia de Supabase Auth en las Constraints de PostgreSQL, permitiendo Restore offline.

## ETAPA 1: AUDITORÍA EXACTA
- [ ] Listar todas las FKs que apuntan a `auth.users(id)` (Evidencia en `evidence/`).
- [ ] Checar todos los Triggers o Políticas RLS que usan `auth.users` en JOINs.
- [ ] Mapear flujos de backend que asumen que el ID de SupabaseAuth = Profile ID.

## ETAPA 2: PREPARACIÓN DE BBDD
- [ ] Asegurarse de que `public.profiles` sea un clon exacto de todos los IDs válidos actuales.
- [ ] Crear script manual/automatizado para el hook "On Auth Invite / Sign Up" (Si existe, que siga creando el profile sin la FK inversa obligatoria si falla).

## ETAPA 3: REFACTORIZACIÓN SQL (FAIL-BACK READY)
- [ ] Realizar BKP Completo (`clone_runner`, simular a `.dump` sin restaurar).
- [ ] Drop `REFERENCES auth.users(id)` en `tickets`, `requisitions`, `material_events`, etc.
- [ ] Agregar `REFERENCES public.profiles(id)` a dichas tablas.
- [ ] Ejecutar simulación local de `pg_restore` hacia el pooler temporal.

## ETAPA 4: VERIFICACIÓN (DOD)
- [ ] Logramos clonar Producción sin error de `auth.users violates foreign key constraint`.
- [ ] El Frontend y las políticas RLS reaccionan bien al interactuar con IDs.
- [ ] Reporte a Scorecard y Registro en Changelog de éxito.
