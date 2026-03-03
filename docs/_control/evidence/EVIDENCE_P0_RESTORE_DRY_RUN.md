# P0 Restore Seco — Dry Run Controlado

## Metadata
- Fecha ejecución:
- Entorno destino:
- Responsable:
- Método restore:
- Tiempo ejecución:
- Resultado restore:

## Validaciones Ejecutadas

### Validación 1 — FKs hacia auth.users
```sql
SELECT
  tc.table_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_schema = 'auth'
  AND ccu.table_name = 'users';
```

Resultado:

### Validación 2 — FKs hacia public.profiles
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_schema = 'public'
  AND ccu.table_name = 'profiles'
ORDER BY tc.table_name;
```

Resultado:

### Validación 3 — Existencia tablas críticas
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
AND table_name IN (
  'profiles',
  'materials',
  'material_events',
  'tickets',
  'requisitions',
  'inventory_ledger_v2',
  'inventory_movements'
);
```

Resultado:

### Validación 4 — Conteos mínimos
```sql
SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL SELECT 'materials', COUNT(*) FROM public.materials
UNION ALL SELECT 'tickets', COUNT(*) FROM public.tickets
UNION ALL SELECT 'requisitions', COUNT(*) FROM public.requisitions;
```

Resultado:

## Resultado Global
- Restore Seco: PASS / FAIL (NO COMPLETAR)

## Notas
- Restore debe ejecutarse en entorno limpio.
- Prohibido restaurar sobre PROD.
