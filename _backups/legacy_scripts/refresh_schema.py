import psycopg2
import sys

# Common local Supabase ports
PORTS = [5432, 54322, 6432]
PASSWORD = "your-super-secret-and-long-postgres-password" # Supabase CLI default
# Or try simple 'postgres'

PARAMS_LIST = [
    {"host": "localhost", "user": "postgres", "password": PASSWORD, "dbname": "postgres"},
    {"host": "127.0.0.1", "user": "postgres", "password": PASSWORD, "dbname": "postgres"},
    {"host": "localhost", "user": "postgres", "password": "postgres", "dbname": "postgres"},
    {"host": "localhost", "user": "postgres", "password": "", "dbname": "postgres"}, # Try empty password
]

def try_connect_and_notify():
    for port in PORTS:
        for params in PARAMS_LIST:
            params['port'] = port
            print(f"Trying to connect to {params['host']}:{port}...")
            try:
                conn = psycopg2.connect(**params)
                conn.autocommit = True
                cur = conn.cursor()
                
                print("Connected! Reloading schema cache...")
                cur.execute("NOTIFY pgrst, 'reload schema';")
                print("SUCCESS: 'NOTIFY pgrst, 'reload schema'' executed.")
                
                # Also verify if table exists and has column
                cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_movements';")
                columns = [r[0] for r in cur.fetchall()]
                print(f"Found columns in inventory_movements: {columns}")
                
                if 'quantity_change' not in columns:
                    print("WARNING: 'quantity_change' column MISSING in DB! Schema reload might not be enough.")
                    print("Attempting to add column...")
                    # Try to add it assuming the migration failed
                    try:
                        cur.execute("ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS quantity_change integer;")
                        print("Column added successfully.")
                        cur.execute("NOTIFY pgrst, 'reload schema';")
                    except Exception as e:
                        print(f"Failed to add column: {e}")

                conn.close()
                return True
            except Exception as e:
                print(f"Failed: {e}")
    return False

if __name__ == "__main__":
    if try_connect_and_notify():
        print("Schema refresh complete.")
    else:
        print("Could not connect to any local Postgres instance.")
        sys.exit(1)
