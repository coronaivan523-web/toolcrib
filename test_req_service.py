from app.services.requisition_service import RequisitionService
from uuid import UUID
from app.core.supabase import supabase

def test():
    uid = UUID('cbed9b30-d6a1-44a2-99cc-d8431a875659')
    print(f"Testing for User: {uid}")
    
    # 1. Check approval assignments directly
    print("--- Direct DB Check (Approvals) ---")
    ap_res = supabase.table('requisition_approvals').select('*').eq('assigned_to_user_id', str(uid)).execute()
    print(f"Approvals found: {len(ap_res.data)}")
    approved_ids = []
    for ap in ap_res.data:
        print(f" - Req: {ap['requisition_id']} | Step: {ap['step_name']} | Status: {ap['step_status']}")
        approved_ids.append(ap['requisition_id'])

    print(f"Unique Approved IDs: {list(set(approved_ids))}")

    # 2. Check RequisitionService output
    print("\n--- RequisitionService.get_requisitions Check ---")
    try:
        results = RequisitionService.get_requisitions(skip=0, limit=50, requester_id=uid)
        print(f"Service returned {len(results)} requisitions.")
        found_ids = [r['id'] for r in results]
        
        for r in results:
            print(f" - ID: {r['id']} | Req#: {r.get('req_number')} | Requester: {r['requester_id']} | Status: {r['status']}")
            
        # Check intersection
        missing = [aid for aid in approved_ids if aid not in found_ids]
        if missing:
             print(f"MISSING Requisitions (Should be visible): {missing}")
        else:
             print("SUCCESS: All approved requisitions are visible.")
             
    except Exception as e:
        print(f"Service Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
