from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import auth, users, inventory, tickets, requisitions
from app.core.supabase import supabase

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    # Fix CORS: Explicit origins required when allow_credentials=True
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["inventory"])
app.include_router(tickets.router, prefix=f"{settings.API_V1_STR}/tickets", tags=["tickets"])
app.include_router(requisitions.router, prefix=f"{settings.API_V1_STR}/requisitions", tags=["requisitions"])

@app.get("/")
def root():
    print("DEBUG: Root endpoint accessed.")
    return {"message": "Welcome to Tool Crib API (Supabase Edition)"}

@app.get("/health/supabase")
def health_supabase():
    try:
        # Simple query to check if we can reach Supabase
        # We can query 'locations' or just check auth status (though auth is client side mostly)
        # Checking a public table or just a simple rpc if available.
        # Let's try selecting from 'locations' (limit 1)
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
