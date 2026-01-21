
from app.main import app
from fastapi.routing import APIRoute

print("Registered Routes:")
found = False
for route in app.routes:
    if isinstance(route, APIRoute):
        print(f" - {route.path} [{','.join(route.methods)}]")
        if "reject-final" in route.path:
            found = True

if found:
    print("\nSUCCESS: /reject-final route found!")
else:
    print("\nERROR: /reject-final route NOT found.")
