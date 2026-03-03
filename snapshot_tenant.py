import os
import sys

sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin

def run_snapshot():
    print("Iniciando Snapshot Pre-Migración (Solo Lectura)...\n")
    if not supabase_admin:
        print("Error: No supabase_admin client.")
        return

    # 1. DISTINCT plant from materials
    mat_plants = []
    unique_mat_plants = []
    mat_counts = {}
    mat_nulls = 0
    try:
        res_mat = supabase_admin.table("materials").select("plant").execute()
        mat_plants = [r.get('plant') for r in res_mat.data]
        unique_mat_plants = sorted(list(set(mat_plants)))
        for p in mat_plants:
            mat_counts[p] = mat_counts.get(p, 0) + 1
        mat_nulls = sum(1 for p in mat_plants if p is None or str(p).strip() == '')
    except Exception as e:
        print(f"materials.plant error: {e}")

    # 2. DISTINCT plant from inventory_movements
    mov_plants = []
    unique_mov_plants = []
    mov_counts = {}
    mov_nulls = 0
    try:
        res_mov = supabase_admin.table("inventory_movements").select("plant").execute()
        mov_plants = [r.get('plant') for r in res_mov.data]
        unique_mov_plants = sorted(list(set(mov_plants)))
        for p in mov_plants:
            mov_counts[p] = mov_counts.get(p, 0) + 1
        mov_nulls = sum(1 for p in mov_plants if p is None or str(p).strip() == '')
    except Exception as e:
        print(f"inventory_movements.plant error: {e}")

    # 5. COUNT profiles
    try:
        res_prof = supabase_admin.table("profiles").select("id", count="exact").execute()
        prof_count = res_prof.count
    except Exception as e:
        prof_count = f"Error: {e}"

    print("--- 1) DISTINCT plant FROM materials ---")
    if not unique_mat_plants:
        print(" - (Vacio / No Existe Columna)")
    for p in unique_mat_plants:
        print(f" - '{p}'")

    print("\n--- 2) DISTINCT plant FROM inventory_movements ---")
    if not unique_mov_plants:
        print(" - (Vacio / No Existe Columna)")
    for p in unique_mov_plants:
        print(f" - '{p}'")

    print("\n--- 3) COUNT by plant in materials ---")
    if not mat_counts:
        print(" - N/A")
    for p, c in sorted(mat_counts.items(), key=lambda x: x[1], reverse=True):
         print(f" - {p}: {c}")

    print("\n--- 4) COUNT by plant in inventory_movements ---")
    if not mov_counts:
        print(" - N/A")
    for p, c in sorted(mov_counts.items(), key=lambda x: x[1], reverse=True):
         print(f" - {p}: {c}")

    print("\n--- 5) COUNT profiles ---")
    print(f"Total Profiles: {prof_count}")

    print("\n--- 6) Inconsistencias (NULL o Vacío) ---")
    print(f"materials (plant IS NULL OR ''): {mat_nulls}")
    print(f"inventory_movements (plant IS NULL OR ''): {mov_nulls}")

if __name__ == "__main__":
    run_snapshot()
