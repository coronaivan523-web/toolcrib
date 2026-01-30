
import os
import sys
import psycopg2

def run_migration_direct():
    # Parse env file manually or just grab the line I need
    # Assuming .env is in CWD
    db_url = None
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    db_url = line.strip().split('=', 1)[1]
                    # Remove quotes if present
                    db_url = db_url.strip("'").strip('"')
                    break
    except Exception as e:
        print(f"Error reading .env: {e}")
        return

    if not db_url:
        print("DATABASE_URL not found in .env")
        return

    print("Connecting to DB...")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        # SQL to run
        sql = """
        ALTER TABLE inventory_movements 
        ADD COLUMN IF NOT EXISTS previous_stock_level numeric,
        ADD COLUMN IF NOT EXISTS new_stock_level numeric,
        ADD COLUMN IF NOT EXISTS quantity_change numeric;
        """
        
        print("Executing SQL...")
        cur.execute(sql)
        print("Migration executed successfully!")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    run_migration_direct()
