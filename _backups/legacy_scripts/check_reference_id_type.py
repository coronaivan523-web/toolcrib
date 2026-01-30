
import os
import sys
import psycopg2

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def check_column():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        cur.execute("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'reference_id'")
        res = cur.fetchone()
        
        print(f"Column Check Result: {res}")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_column()
