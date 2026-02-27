# CHECKLIST: P1 - TENANT ISOLATION

**Objetivo:** Crear fronteras lógicas entre plantas, previniendo visualización o alteración cruzada de datos críticos (Tickets, Requisiciones, Inventario).

## ETAPA 1: DATA MODELING MULTI-PLANTA
- [ ] Crear catálogo/tabla puente: `corporate_plants` o similar con PK `plant_id`.
- [ ] Crear tabla de asignación de usuarios: `user_plants` (Permite múltiples plantas por perfil, ej. Gerentes Generales vs Almacenistas Locales).
- [ ] Agregar columna `tenant_id` (NOT NULL, o default validado) a: `inventory_ledger_v2`, `requisitions`, `tickets`, `materials_stock`.

## ETAPA 2: ACTUALIZACIÓN DE IDENTIDAD Y JWT (OPCIONAL/RECOMENDADO)
- [ ] Si usamos Supabase, actualizar los "Custom Claims" del JWT al loguear, inyectando los `plant_ids` autorizados del usuario.
- [ ] Si delegamos al Backend, crear middleware de FastAPI que extraiga el JWT, consulte el dict de plantas y lo anexe en `request.state`.

## ETAPA 3: POLÍTICAS RLS (Row-Level Security) FIRMES
- [ ] Modificar RLS Select de `tickets`: Que exija que el `auth.uid()` o el claim contentivo coincida con `ticket.tenant_id`.
- [ ] Cautela con Gerentes Grales: Asegurar lógica "Global View" `IF is_global = true`.

## ETAPA 4: VERIFICACIÓN
- [ ] Crear script test (`test_tenant_isolation.py/js`) impersonando a Empleado de Planta A.
- [ ] Script intenta hacer SELECT o INSERT forzando `tenant_id` de Planta B. Debe retornar `[]` (Array vacío) o fallar RLS.
- [ ] Adjuntar logs a `evidence/`.
