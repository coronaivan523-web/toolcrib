from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.supabase import supabase

# Import routers directly to avoid __init__ issues
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.inventory import router as inventory_router
from app.api.v1.endpoints.tickets import router as tickets_router
from app.api.v1.endpoints.requisitions import router as requisitions_router
from app.api.v1.endpoints.materials import router as materials_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    # Fix CORS: Explicit origins required when allow_credentials=True
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://localhost:8001",
        "http://127.0.0.1:8001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users_router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(inventory_router, prefix=f"{settings.API_V1_STR}/inventory", tags=["inventory"])
app.include_router(tickets_router, prefix=f"{settings.API_V1_STR}/tickets", tags=["tickets"])
app.include_router(requisitions_router, prefix=f"{settings.API_V1_STR}/requisitions", tags=["requisitions"])
app.include_router(materials_router, prefix=f"{settings.API_V1_STR}/materials", tags=["materials"])

@app.get("/")
def root():
    print("DEBUG: Root endpoint accessed.")
    return {"message": "Welcome to Tool Crib API (Supabase Edition)"}

@app.get("/health/supabase")
def health_supabase():
    try:
        # Simple query to check if we can reach Supabase
        res = supabase.table('locations').select('id').limit(1).execute()
        return {"status": "ok", "supabase": "connected"}
    except Exception as e:
        return {"status": "error", "supabase": "disconnected", "detail": str(e)}

@app.get("/health/db")
def health_db():
    return health_supabase()
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
