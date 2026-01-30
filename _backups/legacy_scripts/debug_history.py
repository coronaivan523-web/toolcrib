from app.api.v1.endpoints.materials import get_material_history
from app.core.deps import get_current_user
from unittest.mock import MagicMock

# Mock current user
mock_user = MagicMock()
mock_user.id = "test-user-id"

try:
    print("Fetching history for Material ID 2...")
    result = get_material_history(id=2, limit=50, current_user=mock_user)
    print("History fetched successfully.")
    
    # Check enriched fields in movements
    for m in result['movements']:
        ref_type = m.get('reference_type')
        notes = m.get('notes')
        requester = m.get('requester_name')
        plant = m.get('plant')
        print(f"Move: {ref_type} | Notes: {notes} | Requester: {requester} | Plant: {plant}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
