import sys
import os
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, name, role FROM users WHERE role = 'partner' OR name ILIKE '%pbsp%'")
            print("--- USERS ---")
            for row in cur.fetchall():
                print(row)
                if 'pbsp' in row[1].lower() or 'pbsp' in row[2].lower():
                    cur.execute("DELETE FROM users WHERE id = %s", (row[0],))
                    print(f"Deleted user {row[0]}")
            
            cur.execute("SELECT partners_id, name, contact_email FROM partners")
            print("--- PARTNERS ---")
            for row in cur.fetchall():
                print(row)
                if 'pbsp' in row[1].lower() or ('pbsp' in row[2].lower() if row[2] else False):
                    cur.execute("DELETE FROM partners WHERE partners_id = %s", (row[0],))
                    print(f"Deleted partner {row[0]}")
            conn.commit()
except Exception as e:
    print(f'Error: {e}')
