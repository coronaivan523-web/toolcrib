
import psycopg2
import sys

# Settings from config.py
POSTGRES_SERVER = "localhost"
POSTGRES_PORT = 5433
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = "Wasion2020"
POSTGRES_DB = "Toolcrib"

def inspect_table():
    try:
        conn = psycopg2.connect(
            host=POSTGRES_SERVER,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            dbname=POSTGRES_DB
        )
        cur = conn.cursor()
        
        table_name = 'user'
        print(f"Inspecting table: {table_name}")
        cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}';")
        columns = cur.fetchall()
        print("Columns found:")
        for col in columns:
            print(f" - {col[0]} ({col[1]})")

        # Also dump valid users to see what's there
        cur.execute(f"SELECT * FROM \"{table_name}\" LIMIT 5;") # Quote table name just in case
        rows = cur.fetchall()
        print(f"\nExisting rows ({len(rows)}):")
        for row in rows:
            print(row)

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_table()
