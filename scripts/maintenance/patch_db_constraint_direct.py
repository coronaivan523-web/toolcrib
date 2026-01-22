
import psycopg2

# Credentials extracted from .env comment
# postgresql+psycopg2://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres
DB_HOST = "aws-1-us-east-1.pooler.supabase.com"
DB_PORT = "5432"
DB_NAME = "postgres"
DB_USER = "postgres.bykumuizmxsclsazeych"
DB_PASS = "Changos3.3"

def main():
    print(f"Connecting to DB: {DB_HOST}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Connected. Dropping constraint 'requisitions_status_check'...")
        cur.execute("ALTER TABLE requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;")
        print("Constraint dropped.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
