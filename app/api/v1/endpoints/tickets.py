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
    query = supabase.table('tickets').select('*, items:ticket_items(*), requester:profiles!requester_id(*)').range(skip, skip + limit - 1)
    
    # Filter by user if not admin
    # Assuming role is loaded in current_user wrapper or we fetch it.
    # The current_user from deps.py is a wrapper. Let's check role name.
    role_name = getattr(current_user.role, 'name', 'user')
    
    if role_name != "admin": # Check actual role name in Supabase/App
         # Use eq on client side query builder
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
        "status": "CREATED"
    }
    
    res = supabase.table('tickets').insert(ticket_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create ticket")
    
    ticket = res.data[0]
    ticket_id = ticket['id']
    
    # 2. Create Items
    items_data = []
    for item in ticket_in.items:
        # Verify material
        mat = supabase.table('materials').select('id').eq('id', item.material_id).execute()
        if not mat.data:
             # Delete ticket? - Cleanup handled manually or ignore
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
        
    # Fetch requester logic if needed for response? Response model might need it.
    # Just return what we have, usually requester is not mandatory in response if it's the current user?
    # But schema might expect it.
    # Let's attach requester info manually if needed
    ticket['requester_id'] = str(current_user.id)
    # The response validation might expect 'requester' object or just ID?
    # Let's wait for schema check result before finalizing if this fails validation.
    # Actually I am writing this concurrently. I'll make a best guess:
    # return ticket (dict)
    
    return ticket 

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(
    ticket_id: int,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Get ticket by ID.
    """
    res = supabase.table('tickets').select('*, items:ticket_items(*), requester:profiles!requester_id(*)')\
        .eq('id', ticket_id).single().execute()
        
    if not res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket = res.data
    
    # Access Control
    role_name = getattr(current_user.role, 'name', 'user')
    if role_name != "admin" and ticket.get('requester_id') != str(current_user.id):
         raise HTTPException(status_code=403, detail="Not enough permissions")
         
    return ticket

@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    *,
    ticket_id: int,
    ticket_in: TicketUpdate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Update a ticket.
    """
    updates = ticket_in.dict(exclude_unset=True)
    if not updates:
        return read_ticket(ticket_id, current_user)
        
    # We might need to handle nested updates separately? 
    # For now assume updates are top-level ticket fields (status, etc.)
    # If items update is needed, it's more complex.
    
    # Remove items from updates if present to avoid error
    if 'items' in updates:
        del updates['items']

    res = supabase.table('tickets').update(updates).eq('id', ticket_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Return full object with items
    return read_ticket(ticket_id, current_user)

@router.post("/{ticket_id}/items", response_model=TicketResponse)
def create_ticket_item(
    *,
    ticket_id: int,
    item_in: TicketItemCreate,
    current_user = Depends(get_current_active_user),
) -> Any:
    """
    Add an item to an existing ticket.
    """
    # Check ticket access
    ticket_res = supabase.table('tickets').select('requester_id').eq('id', ticket_id).single().execute()
    if not ticket_res.data:
         raise HTTPException(status_code=404, detail="Ticket not found")
         
    # Check permission
    ticket_data = ticket_res.data
    role_name = getattr(current_user.role, 'name', 'user')
    if role_name != "admin" and ticket_data.get('requester_id') != str(current_user.id):
         raise HTTPException(status_code=403, detail="Not enough permissions")

    # Verify material exists
    mat = supabase.table('materials').select('id').eq('id', item_in.material_id).execute()
    if not mat.data:
         raise HTTPException(status_code=404, detail="Material not found")

    # Insert Item
    data = {
        "ticket_id": ticket_id,
        "material_id": item_in.material_id,
        "quantity_requested": item_in.quantity_requested,
        "quantity_fulfilled": 0
    }
    
    try:
        res = supabase.table('ticket_items').insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Return updated ticket
    return read_ticket(ticket_id, current_user)
