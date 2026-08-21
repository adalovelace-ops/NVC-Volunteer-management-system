import sys
import os
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT users_id, email, name FROM users")
            print("--- USERS ---")
            for row in cur.fetchall():
                print(row)
                
            cur.execute("SELECT partners_id, name, contact_email FROM partners")
            print("--- PARTNERS ---")
            for row in cur.fetchall():
                print(row)
                
            cur.execute("SELECT partner_project_applications_id, partner_name, proposed_title FROM partner_project_applications")
            print("--- APPS ---")
            for row in cur.fetchall():
                print(row)
                
except Exception as e:
    print(f'Error: {e}')
