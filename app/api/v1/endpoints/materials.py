from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.deps import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()

@router.get("/{id}/history", response_model=Dict[str, Any])
def get_material_history(
    id: int,
    limit: int = 10,
    current_user: Any = Depends(get_current_user)
):
    """
    Get history for a specific material:
    - Current Stock
    - Total Received (All time IN)
    - Last 10 Movements
    """
    try:
        print(f"[DEBUG] Fetching history for Material ID: {id}")
        if not supabase_admin:
            print("[CRITICAL] supabase_admin is None")
            raise HTTPException(status_code=500, detail="Backend misconfiguration: Admin client missing.")

        # 1. Get Material Info & Stock
        # Use limit(1) which is safer across library versions than maybe_single()
        mat_response = supabase_admin.table("materials").select("*").eq("id", id).limit(1).execute()
        
        if not mat_response.data:
            print(f"[DEBUG] Material {id} not found in DB.")
            raise HTTPException(status_code=404, detail=f"Material {id} not found")
        
        material = mat_response.data[0]
        print(f"[DEBUG] Found Material: {material.get('name')}")
        
        # 2. Get Movements History (Fetch without join first to avoid FK errors)
        moves_response = supabase_admin.table("inventory_movements")\
            .select("*")\
            .eq("material_id", id)\
            .order("timestamp", desc=True)\
            .limit(limit)\
            .execute()
            
        movements = moves_response.data if moves_response.data else []
        
        # 3. Manually fetch user details if movements exist
        if movements:
            user_ids = list(set([m.get('user_id') for m in movements if m.get('user_id')]))
            if user_ids:
                users_response = supabase_admin.table("profiles").select("id, full_name").in_("id", user_ids).execute()
                users_map = {u['id']: u for u in users_response.data} if users_response.data else {}
                
                # Attach user info
                for move in movements:
                    uid = move.get('user_id')
                    if uid in users_map:
                        move['created_by_user'] = users_map[uid]
                    else:
                        move['created_by_user'] = {'full_name': 'Unknown'}
        
        return {
            "material": material,
            "current_stock": material.get("current_stock", 0),
            "movements": movements
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error fetching material history: {e}")
        # Return generic error but log details
        raise HTTPException(status_code=500, detail=str(e))
