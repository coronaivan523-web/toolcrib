from app.services.requisition_service import RequisitionService
import json

def find_req():
    client = RequisitionService._get_admin_client()
    res = client.table('requisitions').select('*, approvals:requisition_approvals(*)').ilike('justification', '%para instalar%').execute()
    print(json.dumps(res.data, indent=2))

if __name__ == "__main__":
    find_req()
