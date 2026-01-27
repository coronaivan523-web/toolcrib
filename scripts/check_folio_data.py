
import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv(r"C:\Users\Ivan.Corona\.gemini\antigravity\scratch\toolcrib\.env")

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def check_data():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        print("--- Checking Tickets 1035 ---")
        cur.execute("SELECT id, folio, status FROM tickets WHERE folio IN (1035)")
        rows = cur.fetchall()
        for row in rows:
            print(f"PK ID: {row[0]}, Folio: {row[1]}, Status: {row[2]}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_data()
