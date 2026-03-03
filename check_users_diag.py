import os
import sys

# Agregar ruta para importaciones
sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin
from app.core.config import settings

def check_staging_users():
    print("Iniciando busqueda de usuarios de prueba (READ-ONLY)...")
    if not supabase_admin:
        print("FAIL: No supabase_admin client available.")
        return

    try:
        # 1. Fetch profiles to see roles
        profiles_res = supabase_admin.table('profiles').select('id, email, role').limit(50).execute()
        profiles = profiles_res.data
        
        # 2. Try to fetch auth users to see metadata (this requires service_role)
        # However, getting Auth users via admin api returns a list of User objects
        try:
            users_res = supabase_admin.auth.admin.list_users()
            users = getattr(users_res, 'users', users_res) # Handle both list and object returning users
        except Exception as e:
            print(f"Error fetching auth users: {e}")
            users = []

        valid_users = []
        missing_plant = []
        missing_role = []

        for p in profiles:
            p_id = p.get('id')
            p_role = p.get('role')
            
            # Find matching auth user
            auth_u = next((u for u in users if u.id == p_id), None)
            if not auth_u:
                continue
                
            app_meta = auth_u.app_metadata or {}
            user_meta = auth_u.user_metadata or {}
            
            # Extract plant
            plant = app_meta.get('plant') or user_meta.get('plant')
            
            # Extract role (from db profile or meta)
            auth_role = user_meta.get('role')
            final_role = p_role or auth_role
            
            if plant and final_role:
                valid_users.append({'email': p.get('email'), 'role': final_role, 'plant': plant})
            else:
                if not plant:
                    missing_plant.append(p.get('email'))
                if not final_role:
                    missing_role.append(p.get('email'))

        print("\n--- RESULTS ---")
        print(f"Total Profiles Scanned: {len(profiles)}")
        print(f"Users with BOTH Plant and Role: {len(valid_users)}")
        
        for vu in valid_users[:5]:
            print(f" - [VALID] Email: {vu['email']} | Role: {vu['role']} | Plant: {vu['plant']}")
            
        print(f"\nUsers missing PLANT: {len(missing_plant)}")
        for mp in missing_plant[:5]:
            print(f" - [MISSING PLANT] Email: {mp}")
            
        print(f"\nUsers missing ROLE: {len(missing_role)}")
        
    except Exception as e:
        print(f"Unexpected Error during diagnosis: {e}")

if __name__ == '__main__':
    check_staging_users()
