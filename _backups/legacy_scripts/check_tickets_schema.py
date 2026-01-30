
import os
import sys
import psycopg2

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def check_structure():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        cur.execute("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'tickets'")
        rows = cur.fetchall()
        
        print(f"--- Tickets Table Structure ---")
        for row in rows:
            print(row)
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_structure()
