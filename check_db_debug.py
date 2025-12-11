
import psycopg2
import sys

# Settings from config.py
POSTGRES_SERVER = "localhost"
POSTGRES_PORT = 5433
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = "Wasion2020"
POSTGRES_DB = "Toolcrib"

def check_db():
    print(f"Attempting to connect to {POSTGRES_DB} at {POSTGRES_SERVER}:{POSTGRES_PORT} as {POSTGRES_USER}...")
    try:
        conn = psycopg2.connect(
            host=POSTGRES_SERVER,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            dbname=POSTGRES_DB
        )
        print("SUCCESS: Connection established.")
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()
        print(f"DB Version: {version[0]}")
        
        # Check users table
        print("Checking tables...")
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cur.fetchall()
        print(f"Tables found: {[t[0] for t in tables]}")
        
        if ('users',) in tables:
            print("Table 'users' exists.")
            cur.execute("SELECT id, email, is_active, is_superuser FROM users;")
            users = cur.fetchall()
            print(f"Users found: {len(users)}")
            for u in users:
                print(f" - ID: {u[0]}, Email: {u[1]}, Active: {u[2]}, Superuser: {u[3]}")
        else:
            print("ERROR: Table 'users' does NOT exist.")

        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"FAILURE: Could not connect. Error: {e}")
        return False

if __name__ == "__main__":
    if check_db():
        sys.exit(0)
    else:
        sys.exit(1)
