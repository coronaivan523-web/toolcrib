from app.services.requisition_service import RequisitionService
import json

def debug_spec():
    client = RequisitionService._get_admin_client()
    res = client.table('requisitions').select('*, approvals:requisition_approvals(*)').eq('req_number', 'REQ-2026-0062').execute()
    print(json.dumps(res.data, indent=2))

if __name__ == "__main__":
    debug_spec()
