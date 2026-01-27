from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.deps import get_current_active_user
from app.core.supabase import supabase, supabase_admin
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketItemCreate

router = APIRouter()

@router.get("/", response_model=List[TicketResponse])
def read_tickets(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve tickets.
    """
    # Fetch tickets with nested items and requester profile
    query = supabase.table('tickets').select('*, items:ticket_items(*), requester:profiles!requester_id(*)').order('created_at', desc=True).range(skip, skip + limit - 1)
    
    role_name = getattr(current_user.role, 'name', 'user')
    
    # Define privileged roles for tickets (who can see ALL tickets)
    privileged_roles = ['admin', 'toolroom_staff', 'supervisor']

    # If not privileged, only show own tickets
    if role_name not in privileged_roles:
         query = query.eq('requester_id', current_user.id)
         
    res = query.execute()
    return res.data

@router.post("/", response_model=TicketResponse)
def create_ticket(
    *,
    ticket_in: TicketCreate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Create new ticket.
    """
    # 1. Create Ticket
    ticket_data = {
        "requester_id": str(current_user.id),
        "status": "PENDIENTE"
    }
    
    res = supabase.table('tickets').insert(ticket_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create ticket")
    
    ticket = res.data[0]
    ticket_id = ticket['id']
    
    # 2. Create Items
    items_data = []
    # Deduplicate items if necessary or validate
    
    for item in ticket_in.items:
        # Check if material exists
        mat = supabase.table('materials').select('id').eq('id', item.material_id).execute()
        if not mat.data:
             # Rollback ticket creation if possible? Or just fail this item.
             # Ideally we should rollback. For now, we will delete the ticket.
             supabase.table('tickets').delete().eq('id', ticket_id).execute()
             raise HTTPException(status_code=404, detail=f"Material {item.material_id} not found")
             
        items_data.append({
            "ticket_id": ticket_id,
            "material_id": item.material_id,
            "quantity_requested": item.quantity_requested,
            "quantity_fulfilled": 0
        })
        
    if items_data:
        items_res = supabase.table('ticket_items').insert(items_data).execute()
        ticket['items'] = items_res.data
    else:
        ticket['items'] = []
        
    # Attach requester ID for response model validation
    ticket['requester_id'] = str(current_user.id)
    
    return ticket

@router.post("/{ticket_id}/close", response_model=Any)
def close_ticket(
    ticket_id: str,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Approve and Close ticket.
    TRIGGERS STOCK DEDUCTION.
    Only Admins or Tool Crib Managers should do this.
    """
    role_name = current_user.role.name if (current_user and current_user.role) else 'user'
    allowed_roles = ["admin", "toolroom_staff", "supervisor", "manager"]
    if role_name not in allowed_roles:
        raise HTTPException(status_code=403, detail=f"Role '{role_name}' not authorized to close tickets")

    # 1. Optimistic RPC Call (Handles Status, Stock, Movement in DB Transaction)
    # Use standard supabase client (Anon) - 'deliver_ticket' is security definer so permissions handled by DB
    try:
        print(f"[DEBUG] Calling deliver_ticket RPC for {ticket_id}")
        rpc_res = supabase.rpc('deliver_ticket', {
            'p_ticket_id': int(ticket_id),
            'p_user_id': str(current_user.id)
        }).execute()
        
        # Manually return success structure
        return {"success": True, "message": "Ticket delivered successfully", "id": ticket_id, "status": "ENTREGADO"}
        
    except Exception as e:
        # LOGGING TO FILE FOR DEBUGGING
        import traceback
        with open("debug_rpc_error.log", "a") as f:
             f.write(f"\n[ERROR] Ticket {ticket_id}: {str(e)}\n")
             f.write(traceback.format_exc())
             
        print(f"[CRITICAL ERROR] RPC Failed: {e}")
        # Return strict JSON error so frontend displays it
        raise HTTPException(status_code=400, detail=str(e))
