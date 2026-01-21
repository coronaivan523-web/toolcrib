from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.supabase import supabase
import traceback
import time

# Import routers
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.inventory import router as inventory_router
from app.api.v1.endpoints.tickets import router as tickets_router
from app.api.v1.endpoints.requisitions import router as requisitions_router
from app.api.v1.endpoints.materials import router as materials_router
from app.api.v1.endpoints.cycle_counts import router as cycle_counts_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Startup Event to confirm reload
@app.on_event("startup")
async def startup_event():
    msg = f"\n[SYSTEM] SERVER RESTARTED AT {time.strftime('%Y-%m-%d %H:%M:%S')}\n"
    print(msg)
    with open("backend_debug_manual.log", "a") as f:
        f.write(msg)

# 1. CORS Middleware (Inner)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow ALL for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Debug Middleware (Outer - Added LAST so it runs FIRST)
class DebugMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            # Log incoming
            method = request.method
            url = str(request.url)
            print(f"[MIDDLEWARE CONSOLE] {method} {url}")
            with open("backend_debug_manual.log", "a") as f:
                f.write(f"[MIDDLEWARE OUTER] {method} {url}\n")
            
            response = await call_next(request)
            return response
            
        except Exception as e:
            tb = traceback.format_exc()
            err_msg = f"[MIDDLEWARE CRASH] {str(e)}\n{tb}\n"
            print(err_msg)
            with open("backend_debug_manual.log", "a") as f:
                f.write(err_msg)
            raise e

app.add_middleware(DebugMiddleware)

# Include Routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users_router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(inventory_router, prefix=f"{settings.API_V1_STR}/inventory", tags=["inventory"])
app.include_router(tickets_router, prefix=f"{settings.API_V1_STR}/tickets", tags=["tickets"])
app.include_router(requisitions_router, prefix=f"{settings.API_V1_STR}/requisitions", tags=["requisitions"])
app.include_router(materials_router, prefix=f"{settings.API_V1_STR}/materials", tags=["materials"])
app.include_router(cycle_counts_router, prefix=f"{settings.API_V1_STR}/cycle-counts", tags=["cycle-counts"])

@app.get("/")
def root():
    return {"message": "Welcome to Tool Crib API (Supabase Edition)"}

@app.get("/debug/ping")
def ping():
    with open("backend_debug_manual.log", "a") as f:
        f.write("[DEBUG] PING HIT!\n")
    return {"status": "pong", "time": "2026-01-19"}

@app.get("/health/supabase")
def health_supabase():
    try:
        res = supabase.table('locations').select('id').limit(1).execute()
        return {"status": "ok", "supabase": "connected"}
    except Exception as e:
        return {"status": "error", "supabase": "disconnected", "detail": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
