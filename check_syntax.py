import sys
import os

# Add prompt directory to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))
sys.path.append("c:/Users/Ivan.Corona/.gemini/antigravity/scratch/toolcrib")

print("Checking imports...")
try:
    from app.api.v1.endpoints import materials
    print("SUCCESS: materials.py imported")
except Exception as e:
    print(f"ERROR: materials.py failed to import: {e}")
    import traceback
    traceback.print_exc()

try:
    from app.services import requisition_service
    print("SUCCESS: requisition_service.py imported")
except Exception as e:
    print(f"ERROR: requisition_service.py failed to import: {e}")
    import traceback
    traceback.print_exc()
