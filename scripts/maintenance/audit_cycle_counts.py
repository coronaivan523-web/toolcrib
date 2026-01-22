
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
# Attempt to load from frontend/.env since that's where we know credentials might be
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'frontend', '.env'))

url: str = "https://bykumuizmxsclsazeych.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODU4NDQsImV4cCI6MjA4MDk2MTg0NH0.DfozRzeTRiReELAZ7GMHjJosHkrPCEixmWS8BMSUFso"
service_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3VtdWl6bXhzY2xzYXpleWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTM4NTg0NCwiZXhwIjoyMDgwOTYxODQ0fQ.981IQNWujW7dld8tWqaG-7J18o1BI4AWKuqi0banvDA"

if not url or not service_key:
    print("Error: Missing Supabase URL or Service Key")
    exit(1)

supabase: Client = create_client(url, service_key)

async def audit_db():
    print("--- AUDITING CYCLE COUNT SESSIONS (Ghost Processes) ---")
    # 1. Check for multiple DRAFT sessions per user (which would be unreachable with the new logic)
    try:
        res = supabase.table('cycle_count_sessions').select('*').eq('status', 'DRAFT').execute()
        sessions = res.data
        
        user_drafts = {}
        for s in sessions:
            uid = s.get('created_by')
            if uid not in user_drafts:
                user_drafts[uid] = []
            user_drafts[uid].append(s)

        print(f"Total DRAFT sessions found: {len(sessions)}")
        
        has_ghosts = False
        for uid, drafts in user_drafts.items():
            if len(drafts) > 1:
                has_ghosts = True
                print(f"User {uid} has {len(drafts)} active drafts. CLEARED GHOSTS.")
                
                # Sort by created_at desc (keep newest)
                drafts.sort(key=lambda x: x['created_at'], reverse=True)
                keep = drafts[0]
                to_delete = drafts[1:]
                
                print(f"  - KEEPING: ID: {keep['id']} ({keep['created_at']})")
                
                for d in to_delete:
                    print(f"  - DELETING Ghost: ID: {d['id']} ({d['created_at']})")
                    supabase.table('cycle_count_sessions').delete().eq('id', d['id']).execute()
        
        if not has_ghosts:
            print("No unreachable ghost drafts found.")

    except Exception as e:
        print(f"Error checking sessions: {e}")

    print("\n--- AUDITING COLUMNS (Potential Unused Columns) ---")
    
    if len(sessions) > 0:
        sample = sessions[0]
        print("Columns in 'cycle_count_sessions':")
        for k in sample.keys():
            print(f"  - {k}")
            
    # Check lines columns
    try:
        # Insert a dummy line to check columns if table is empty, or just list if has data
        res_lines = supabase.table('cycle_count_lines').select('*').limit(1).execute()
        if res_lines.data:
            print("\nColumns in 'cycle_count_lines':")
            for k in res_lines.data[0].keys():
                print(f"  - {k}")
        else:
            print("\n 'cycle_count_lines' is empty, cannot infer columns from data select.")
    except Exception as e:
        print(f"Error checking lines: {e}")

if __name__ == "__main__":
    asyncio.run(audit_db())
