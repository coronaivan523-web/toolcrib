import os
import sys

sys.path.append(os.getcwd())

from app.core.supabase import supabase_admin

def run_precheck():
    print("Iniciando Inventory Consolidation Precheck (Solo Lectura)...\n")
    if not supabase_admin:
        print("Error: No supabase_admin client.")
        return

    try:
        # We must use PostgREST filters to emulate the SQL logic
        
        # 1) Null material_id
        res_null_material = supabase_admin.table("inventory_movements").select("id", count="exact").is_("material_id", "null").execute()
        count_null_material = res_null_material.count

        # 3a) Total movimientos
        res_total = supabase_admin.table("inventory_movements").select("id", count="exact").execute()
        count_total = res_total.count
        
        # To do joins (orphans, coverage, plant nulls), we fetch data and process in memory 
        # since PostgREST joins are strictly foreign-key based and we want to be safe with exactly what happens.
        
        # Fetch all movements (assuming staging has < 1000 items, safe for memory)
        movements = supabase_admin.table("inventory_movements").select("id, material_id").execute().data
        
        # Fetch all materials
        materials = supabase_admin.table("materials").select("id, plant").execute().data
        materials_dict = {m['id']: m for m in materials}
        
        count_orphans = 0
        count_match = 0
        count_plant_null = 0
        
        for mov in movements:
            mat_id = mov.get('material_id')
            if mat_id not in materials_dict:
                count_orphans += 1
            else:
                count_match += 1
                mat = materials_dict[mat_id]
                if mat.get('plant') is None or str(mat.get('plant')).strip() == '':
                    count_plant_null += 1

        print("# INVENTORY CONSOLIDATION PRECHECK")
        print(f"- Null material_id: {count_null_material}")
        print(f"- Huérfanos: {count_orphans}")
        print(f"- Total movimientos: {count_total}")
        print(f"- Movimientos con match: {count_match}")
        print(f"- Movimientos con plant NULL: {count_plant_null}")
        
        print("\nFINAL:")
        if count_null_material == 0 and count_orphans == 0 and count_plant_null == 0 and count_match == count_total:
            print("Precheck completado — Listo para ejecutar consolidación")
        else:
            print("Precheck FALLÓ — Riesgo detectado")

    except Exception as e:
        print(f"Error during precheck: {e}")

if __name__ == "__main__":
    run_precheck()
