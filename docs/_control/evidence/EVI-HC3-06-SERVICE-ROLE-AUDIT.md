# EVI-HC3-06-SERVICE-ROLE-AUDIT

## 1. Mapeo de Evasión (Bypass RLS) en Runtime

Tras realizar el barrido profundo en el código fuente, se identificaron inyecciones activas del cliente `supabase_admin` (instanciado con `SUPABASE_SERVICE_KEY`) que rompen el aislamiento del RLS en tiempo de ejecución.

### Clasificación de Usos

| Archivo | Endpoint / Función | Tipo | Público? | Riesgo | Necesario? |
|---|---|---|---|---|---|
| `materials.py:20` | `read_materials` | READ | SÍ (Auth) | CRÍTICO | NO |
| `materials.py:32` | `search_materials` | READ | SÍ (Auth) | CRÍTICO | NO |
| `materials.py:71` | `read_material` | READ | SÍ (Auth) | CRÍTICO | NO |
| `materials.py:117` | `get_material_kardex_report` | READ | SÍ (Auth) | CRÍTICO | NO |
| `materials.py:157` | `get_material_tickets_report` | READ | SÍ (Auth) | CRÍTICO | NO |
| `materials.py:220` | `get_material_requisitions_report` | READ | SÍ (Auth) | CRÍTICO | NO |
| `inventory_service.py:31` | `create_movement` (atomic rpc) | WRITE | Interno (Delegado) | ALTO | NO* |
| `inventory_service.py:55` | `create_movement` (ledger rpc) | WRITE | Interno (Delegado) | ALTO | NO* |
| `users.py` (Múltiples) | `create`, `update`, `delete_user` | WRITE | ADMIN (Rol) | BAJO | SÍ** |

> \**Notas:* 
> \** `inventory_service.py` NO necesita `SERVICE_ROLE` si el RPC nativo se invoca desde el JWT del token de usuario. 
> \*** `users.py` requiere estrictamente `SERVICE_ROLE` ya que Supabase Management Auth API lo exige por diseño para alterar identidades de otros usuarios.

## 2. Confirmación de Cuestionamientos

**¿Los endpoints afectados son `materials.py` y `inventory.py`?**
- `app/api/v1/endpoints/materials.py`: **Totalmente afectado.** Todas sus lecturas evaden el JWT y utilizan el cliente administrador.
- `app/api/v1/endpoints/inventory.py`: **Afectado Indirectamente.** El enrutador (`inventory.py`) utiliza el cliente `supabase` ruteado correctamente; SIN EMBARGO, el flujo de POST `/movements` delega la ejecución a `InventoryService.create_movement()`, el cual **SÍ** utiliza en la capa de abajo `supabase_admin`. 

## 3. Veredicto Fail-Closed

- **¿RLS está siendo evadido en runtime?** **SÍ.**
- **Nivel de Criticidad:** **CRÍTICO.** El esfuerzo realizado en la base de datos (Endurecimiento de las Fases 3.0 y 3.1) es **totalmente inútil e invisible** para cualquier endpoint listado en la zona "CRÍTICA", puesto que la inyección de `SUPABASE_SERVICE_KEY` forza a PostgreSQL a ignorar todas las sentencias `USING` y `WITH CHECK` desarrolladas para Multi-Planta. Toda la seguridad perimetral actual descansa frágilmente sobre la lógica cruda de Python (que como se evidencia, no intercepta IDs de plantas cruzados).
