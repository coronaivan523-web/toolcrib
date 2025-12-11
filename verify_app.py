import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.main import app

print("Successfully imported app.")
print("Registered routes:")
for route in app.routes:
    print(f"- {route.path} [{route.name}]")
