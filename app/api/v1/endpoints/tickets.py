from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.ticket import Ticket, TicketItem, TicketStatus
from app.models.inventory import Material
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse

router = APIRouter()

@router.get("/", response_model=List[TicketResponse])
def read_tickets(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve tickets.
    """
    # If admin, see all tickets. If normal user, only see own tickets.
    # For now, let's assume everyone can see all tickets or filter by role later.
    # Let's implement basic filtering: user sees their own requests.
    if current_user.role and current_user.role.name == "Admin":
         tickets = db.query(Ticket).offset(skip).limit(limit).all()
    else:
         tickets = db.query(Ticket).filter(Ticket.requester_id == current_user.id).offset(skip).limit(limit).all()
    return tickets

@router.post("/", response_model=TicketResponse)
def create_ticket(
    *,
    db: Session = Depends(get_db),
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new ticket.
    """
    ticket = Ticket(
        requester_id=current_user.id,
        status=TicketStatus.CREATED,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    for item_in in ticket_in.items:
        # Check if material exists
        material = db.query(Material).filter(Material.id == item_in.material_id).first()
        if not material:
            # Rollback if material not found? Or just skip?
            # Better to fail the whole request
            db.delete(ticket)
            db.commit()
            raise HTTPException(status_code=404, detail=f"Material with id {item_in.material_id} not found")
            
        ticket_item = TicketItem(
            ticket_id=ticket.id,
            material_id=item_in.material_id,
            quantity_requested=item_in.quantity_requested,
        )
        db.add(ticket_item)
    
    db.commit()
    db.refresh(ticket)
    return ticket

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get ticket by ID.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Access control
    if current_user.role and current_user.role.name != "Admin" and ticket.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return ticket

@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    *,
    db: Session = Depends(get_db),
    ticket_id: int,
    ticket_in: TicketUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a ticket.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Only Admin or Assignee can update status/assignee?
    # For now, let's allow update if user has permissions (e.g. Admin)
    # This logic can be refined based on requirements.
    
    update_data = ticket_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ticket, field, value)
        
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
