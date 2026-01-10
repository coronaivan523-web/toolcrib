from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.deps import get_current_active_user
from app.core.supabase import supabase
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

@router.post("/{ticket_id}/close", response_model=TicketResponse)
def close_ticket(
    ticket_id: str,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Approve and Close ticket.
    TRIGGERS STOCK DEDUCTION.
    Only Admins or Tool Crib Managers should do this.
    """
    role_name = getattr(current_user.role, 'name', 'user')
    if role_name != "admin": # Add other roles if needed
        raise HTTPException(status_code=403, detail="Not authorized to close tickets")

    # 1. Fetch Ticket & Items
    res = supabase.table('tickets').select('*, items:ticket_items(*)').eq('id', ticket_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket = res.data
    if ticket['status'] in ['ENTREGADO', 'RECHAZADO']:
        raise HTTPException(status_code=400, detail="Ticket already processed")
        
    items = ticket.get('items', [])
    
    # 2. Process Stock Deduction
    for item in items:
        wanted = item['quantity_requested']
        mat_id = item['material_id']
        
        # Lock/Get material
        mat_res = supabase.table('materials').select('current_stock, name').eq('id', mat_id).single().execute()
        if not mat_res.data:
             continue # Skip if deleted?
             
        current = mat_res.data['current_stock'] or 0
        new_stock = current - wanted
        
        # We allow negative stock? Requirements didn't specify. Assuming NO for strict control, 
        # but often ToolCribs need to issue anyway. Let's allow it but warn? 
        # For this iteration, let's allow it to go negative or 0.
        
        # Update Material
        supabase.table('materials').update({'current_stock': new_stock}).eq('id', mat_id).execute()
        
        # Update Item Fulfilled
        supabase.table('ticket_items').update({'quantity_fulfilled': wanted}).eq('id', item['id']).execute()
        
        # Log Event (Optional but recommended)
        event_data = {
            "material_id": mat_id,
            "event_type": "TICKET_FULFILLMENT",
            "performed_by": str(current_user.id),
            "requested_by": ticket['requester_id'],
            "notes": f"Ticket {ticket_id} fulfilled. Qty: {wanted}"
        }
        supabase.table('material_events').insert(event_data).execute()

    # 3. Update Ticket Status
    update_res = supabase.table('tickets').update({
        'status': 'ENTREGADO', 
        'assigned_to': str(current_user.id),
        'updated_at': 'now()'
    }).eq('id', ticket_id).select('*, items:ticket_items(*), requester:profiles!requester_id(*)').single().execute()
    
    return update_res.data
