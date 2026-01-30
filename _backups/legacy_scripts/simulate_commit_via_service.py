
import os
import sys
import uuid
# Add project root to path
sys.path.append(os.getcwd())

# Mock Supabase dependencies
# using the real client
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client, Client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
client: Client = create_client(url, key)

from app.services.cycle_count_service import CycleCountService
from uuid import uuid4

# Setup: Need a valid Cycle Count Line PENDING or VALIDATED
# We will create a fresh session and line to test
try:
    print("Creating Test Session...")
    user_id = "7afa8bf2-72ee-4e6f-ae47-f47816e7997f" # Use a valid user UUID from logs or query one
    
    # 1. Create Session
    session_payload = {
        "planned_date": "2026-01-25",
        "ticket_id": f"TEST-{uuid4().hex[:6]}"
    } 
    # Mocking Pydantic model by passing dict but wait, service expects Pydantic model
    from app.schemas.cycle_count import CycleCountSessionCreate, CycleCountLineCreate
    
    session_data = CycleCountSessionCreate(**session_payload)
    session = CycleCountService.create_session(session_data, user_id, client)
    print(f"Session Created: {session['id']}")
    
    # 2. Add Line
    print("Adding Line...")
    line_payload = {
        "material_id": 4, # Test Drill Bit
        # "qty_system": ... handled by service
        "qty_physical": 100 # Change from (supposedly 53) to 100. Delta +?
    }
    line_data = CycleCountLineCreate(**line_payload)
    line = CycleCountService.add_line(uuid.UUID(session['id']), line_data, user_id, client)
    print(f"Line Created: {line['id']}")
    
    # 3. Commit Line
    print("Committing Line...")
    res = CycleCountService.commit_line(uuid.UUID(line['id']), user_id, client)
    print(f"Commit Result: {res}")
    
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Simulation Failed: {e}")
