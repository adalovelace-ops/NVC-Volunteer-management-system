import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
            print([row[0] for row in cur.fetchall()])
            
            # Let's just blindly delete
            cur.execute("DELETE FROM partners WHERE organization_name ILIKE '%pbsp%'")
            print(f"Deleted {cur.rowcount} partners.")
            
            cur.execute("DELETE FROM partner_project_applications WHERE proposed_title ILIKE '%kalipay%' OR review_notes ILIKE '%kalipay%'")
            print(f"Deleted {cur.rowcount} applications.")
            
            cur.execute("DELETE FROM users WHERE email ILIKE '%pbsp%'")
            print(f"Deleted {cur.rowcount} users.")
            
            conn.commit()
            
except Exception as e:
    print(f'Error: {e}')
