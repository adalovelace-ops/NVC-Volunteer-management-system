import sys
import os
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM partners WHERE name ILIKE '%pbsp%' OR contact_email ILIKE '%pbsp%'")
            print(f"Deleted {cur.rowcount} partners.")
            
            cur.execute("DELETE FROM partner_project_applications WHERE proposal_details::text ILIKE '%kalipay%' OR partner_name ILIKE '%pbsp%'")
            print(f"Deleted {cur.rowcount} applications.")
            
            cur.execute("DELETE FROM users WHERE email ILIKE '%pbsp%'")
            print(f"Deleted {cur.rowcount} users.")
            conn.commit()
except Exception as e:
    print(f'Error: {e}')
