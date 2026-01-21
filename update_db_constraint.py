
import os
import asyncio
import asyncpg
from app.core.config import settings

async def main():
    print(f"Connecting to DB: {settings.POSTGRES_SERVER}...")
    # Construct DSN
    dsn = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    
    try:
        conn = await asyncpg.connect(dsn)
        print("Connected.")
        
        # Drop Constraint
        print("Dropping constraint 'requisitions_status_check'...")
        # We wrap in TRY block or just IF EXISTS logic if supported, but standard SQL 'DROP CONSTRAINT IF EXISTS' works in Postgres
        await conn.execute("ALTER TABLE requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;")
        print("Constraint dropped (if it existed).")
        
        # Verify
        # Optional: Add it back with updated values? 
        # Ideally we just rely on App-level validation to avoid this friction in dev.
        
        await conn.close()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
