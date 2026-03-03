import psycopg2
import time
import os

DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def run_consolidation():
    print("Iniciando Consolidación de Plant en Inventory Movements (Staging)...\n")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = False # Usaremos transacciones explícitas
        cur = conn.cursor()

        output_md = []
        output_md.append("# EVI-HC4-08-INVENTORY-PLANT-ROLLOUT")
        output_md.append("\n## DDL SEGURO (FASE 1)")

        t0 = time.time()
        cur.execute("ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS plant VARCHAR(50);")
        t1 = time.time()
        
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='plant';")
        col_exists = cur.fetchall()
        
        output_md.append(f"- **ALTER TABLE Executed** in {((t1-t0)*1000):.2f} ms")
        output_md.append(f"- **Evidence**: {col_exists}")

        output_md.append("\n## BACKFILL CONTROLADO (FASE 2)")
        
        t0 = time.time()
        cur.execute("""
            UPDATE public.inventory_movements im
            SET plant = m.plant
            FROM public.materials m
            WHERE im.material_id = m.id
            AND im.plant IS NULL;
        """)
        rows_affected = cur.rowcount
        t1 = time.time()

        cur.execute("SELECT COUNT(*) FROM public.inventory_movements WHERE plant IS NULL;")
        nulls_after_backfill = cur.fetchone()[0]

        output_md.append(f"- **UPDATE Executed** in {((t1-t0)*1000):.2f} ms")
        output_md.append(f"- **Filas Afectadas**: {rows_affected}")
        output_md.append(f"- **Nulls restantes**: {nulls_after_backfill}")

        output_md.append("\n## VALIDACIÓN POST-BACKFILL (FASE 3)")
        cur.execute("SELECT COUNT(*) FROM public.inventory_movements;")
        total_movs = cur.fetchone()[0]
        
        output_md.append(f"- **Total movimientos**: {total_movs}")
        output_md.append(f"- **Total con plant NULL**: {nulls_after_backfill}")

        if nulls_after_backfill > 0:
            print("ABORTANDO TRANSACCIÓN: Los nulls de plant son mayores a 0")
            output_md.append("\n**VEREDICTO**: ABORTADO (Rollback ejecutado por consistencia fallida)")
            conn.rollback()
        else:
            output_md.append("\n## BLOQUEO PREVENTIVO (FASE 4)")
            t0 = time.time()
            cur.execute("ALTER TABLE public.inventory_movements ALTER COLUMN plant SET NOT NULL;")
            t1 = time.time()
            output_md.append(f"- **CONSTRAINT NOT NULL Executed** in {((t1-t0)*1000):.2f} ms")
            
            output_md.append("\n**VEREDICTO FINAL**: Consolidación completada — Sin FK — Lista para siguiente fase")
            conn.commit()
            print("Consolidación EXITOSA. Haciendo COMMIT.")

        cur.close()
        conn.close()

        # Guardar evidencia
        with open("docs/_control/evidence/EVI-HC4-08-INVENTORY-PLANT-ROLLOUT.md", "w", encoding="utf-8") as f:
            f.write("\n".join(output_md))
            
        print("Evidencia guardada en docs/_control/evidence/EVI-HC4-08-INVENTORY-PLANT-ROLLOUT.md")

    except Exception as e:
        print(f"Error Fatal durante la migración: {e}")
        try:
             conn.rollback()
        except:
             pass

if __name__ == "__main__":
    run_consolidation()
