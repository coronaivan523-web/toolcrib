# EVIDENCE: P0 FK MAP (auth.users)

| Schema | Tabla | Columna | Restricción Original (Estimada) | Acción Propuesta | Justificación / Excepto |
|---|---|---|---|---|---|
| public | profiles | id | profiles_id_fkey | **DROP** | Desacople total. `profiles` pasará a ser la tabla base de Identidad en public. |
| public | materials | requested_by | materials_requested_by_fkey | **DROP & REPOINT** | Se enlaza a `public.profiles(id)` para mantener integridad DB local. |
| public | materials | registered_by | materials_registered_by_fkey | **DROP & REPOINT** | Idem. |
| public | materials | deactivated_by | materials_deactivated_by_fkey | **DROP & REPOINT** | Idem. |
| public | material_events | performed_by | material_events_performed_by_fkey | **DROP & REPOINT** | Idem. |
| public | material_events | requested_by | material_events_requested_by_fkey | **DROP & REPOINT** | Idem. |
| public | tickets | requester_id | tickets_requester_id_fkey | **DROP & REPOINT** | Idem. |
| public | tickets | assigned_to | tickets_assigned_to_fkey | **DROP & REPOINT** | Idem. |
| public | requisitions | requester_id | requisitions_requester_id_fkey | **DROP & REPOINT** | Idem. |
| public | requisitions | approver_id | requisitions_approver_id_fkey | **DROP & REPOINT** | Idem. |
| public | requisitions | gerente_mx_id | requisitions_gerente_mx_id_fkey | **DROP & REPOINT** | Idem. |
| public | requisitions | gerente_ch_id | requisitions_gerente_ch_id_fkey | **DROP & REPOINT** | Idem. |
| public | requisitions | gerente_gral_id | requisitions_gerente_gral_id_fkey | **DROP & REPOINT** | Idem. |
| public | requisitions | assigned_to_user_id | requisitions_assigned_to_user_id_fkey | **DROP & REPOINT** | Idem. |
| public | requisitions | action_by_user_id | requisitions_action_by_user_id_fkey | **DROP & REPOINT** | Idem. |
| public | requisitions | uploaded_by | requisitions_uploaded_by_fkey | **DROP & REPOINT** | Idem. |
| public | inventory_ledger_v2 | created_by | inventory_ledger_v2_created_by_fkey | **DROP & REPOINT** | Idem. |
| public | inventory_movements | created_by | inventory_movements_created_by_fkey | **DROP & REPOINT** | Idem. |
| public | messages | sender_id | messages_sender_id_fkey | **DROP & REPOINT** | Idem. |
| public | messages | recipient_id | messages_recipient_id_fkey | **DROP & REPOINT** | Idem. |
| public | notifications | sender_id | notifications_sender_id_fkey | **DROP & REPOINT** | Idem. |
| public | cycle_count_lines | counted_by | cycle_count_lines_counted_by_fkey | **DROP & REPOINT** | Identificada en crasheos v7.3. |

*Nota: La acción "REPOINT" significa crear un `FOREIGN KEY REFERENCES public.profiles(id)`.*
