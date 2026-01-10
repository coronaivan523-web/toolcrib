from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.deps import get_current_user
from app.core.supabase import supabase
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# Schema for creating a message
class MessageCreate(BaseModel):
    recipient_id: Optional[str] = None # If None, might be broadcast? Or force list.
    subject: str
    body: str
    type: str = 'announcement' # announcement, support
    attachment_url: Optional[str] = None

# Schema for message response
class MessageResponse(BaseModel):
    id: str
    created_at: datetime
    sender_id: str
    recipient_id: Optional[str]
    subject: str
    body: str
    type: str
    attachment_url: Optional[str]
    is_read: bool

@router.post("/", response_model=MessageResponse)
def create_message(
    *,
    msg_in: MessageCreate,
    current_user = Depends(get_current_user)
) -> Any:
    """
    Send a message.
    """
    user_id = current_user['id']
    
    # Check if sender is active (handled by dependency usually)
    
    # Construct message data
    data = {
        "sender_id": user_id,
        "recipient_id": msg_in.recipient_id,
        "subject": msg_in.subject,
        "body": msg_in.body,
        "type": msg_in.type,
        "attachment_url": msg_in.attachment_url,
        "is_read": False
    }

    try:
        res = supabase.table('messages').insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create message")
        
        return res.data[0]
    except Exception as e:
        print(f"Error creating message: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my", response_model=List[MessageResponse])
def get_my_messages(
    current_user = Depends(get_current_user)
) -> Any:
    """
    Get messages received by current user.
    """
    user_id = current_user['id']
    try:
        res = supabase.table('messages').select('*').eq('recipient_id', user_id).order('created_at', desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sent", response_model=List[MessageResponse])
def get_sent_messages(
    current_user = Depends(get_current_user)
) -> Any:
    """
    Get messages sent by current user.
    """
    user_id = current_user['id']
    try:
        res = supabase.table('messages').select('*').eq('sender_id', user_id).order('created_at', desc=True).execute()
        return res.data
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))

@router.put("/{msg_id}/read", response_model=MessageResponse)
def mark_as_read(
    msg_id: str,
    current_user = Depends(get_current_user)
) -> Any:
    """
    Mark a message as read.
    """
    user_id = current_user['id']
    try:
        # Verify ownership (recipient)
        res = supabase.table('messages').select('*').eq('id', msg_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Message not found")
        
        msg = res.data
        if msg['recipient_id'] != user_id:
             raise HTTPException(status_code=403, detail="Not authorized")

        update_res = supabase.table('messages').update({'is_read': True}).eq('id', msg_id).execute()
        return update_res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

