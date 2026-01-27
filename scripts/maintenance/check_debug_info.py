
import os
import sys
import psycopg2

# Connection string
DB_URL = "postgresql://postgres.bykumuizmxsclsazeych:Changos3.3@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def check_info():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # 1. Check ticket_items schema
        print("--- ticket_items Schema ---")
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ticket_items'")
        for row in cur.fetchall():
            print(row)
            
        # 2. Check Ticket #1025
        print("\n--- Ticket #1025 ---")
        cur.execute("SELECT id, folio, status FROM tickets WHERE folio = 1025")
        ticket = cur.fetchone()
        print(ticket)
        
        if ticket:
            ticket_id = ticket[0]
            # 3. Check items for this ticket
            print(f"\n--- Items for Ticket {ticket_id} ---")
            cur.execute("SELECT id, material_id, quantity_requested, quantity_fulfilled FROM ticket_items WHERE ticket_id = %s", (ticket_id,))
            items = cur.fetchall()
            for item in items:
                print(item)
                
            # 4. Check stock for these materials (to see if deduction is stuck or negative)
            if items:
                mat_ids = tuple([i[1] for i in items])
                print(f"\n--- Stock for Materials {mat_ids} ---")
                cur.execute(f"SELECT id, name, current_stock FROM materials WHERE id IN %s", (mat_ids,))
                for mat in cur.fetchall():
                    print(mat)

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_info()
