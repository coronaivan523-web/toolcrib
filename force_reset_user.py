
import psycopg2
from passlib.context import CryptContext
import sys

# Settings
POSTGRES_SERVER = "localhost"
POSTGRES_PORT = 5433
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = "Wasion2020"
POSTGRES_DB = "Toolcrib"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_user():
    try:
        conn = psycopg2.connect(
            host=POSTGRES_SERVER,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            dbname=POSTGRES_DB
        )
        cur = conn.cursor()
        
        # 1. Ensure Role 1 exists
        print("Checking Role 1...")
        cur.execute("SELECT id FROM role WHERE id = 1;")
        if not cur.fetchone():
            print("Role 1 missing. Creating...")
            cur.execute("INSERT INTO role (id, name, permissions) VALUES (1, 'Admin', '{}');")
        else:
            print("Role 1 exists.")

        # 2. Hash password
        new_password = "admin123"
        hashed = pwd_context.hash(new_password)
        print(f"Generated hash for '{new_password}': {hashed}")

        # 3. Update/Insert User
        print("Upserting user 'admin'...")
        # Check if user with ID 1 exists
        cur.execute("SELECT id FROM \"user\" WHERE id = 1;")
        if cur.fetchone():
            cur.execute("""
                UPDATE "user" 
                SET hashed_password = %s, is_active = true, username = 'admin', email = 'admin@toolcrib.com', role_id = 1
                WHERE id = 1;
            """, (hashed,))
            print("User 1 updated.")
        else:
             cur.execute("""
                INSERT INTO "user" (id, username, email, hashed_password, role_id, is_active, full_name)
                VALUES (1, 'admin', 'admin@toolcrib.com', %s, 1, true, 'System Admin');
            """, (hashed,))
             print("User 1 inserted.")

        conn.commit()
        print("SUCCESS: User 'admin' password reset to 'admin123'.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"FAILURE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    reset_user()
