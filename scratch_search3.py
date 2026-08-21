import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email FROM users WHERE email ILIKE '%pbsp%' OR full_name ILIKE '%pbsp%'")
            print("--- Users to delete ---")
            for row in cur.fetchall():
                print(row)
                
            cur.execute("SELECT user_id, organization_name FROM partners WHERE organization_name ILIKE '%pbsp%'")
            print("--- Partners to delete ---")
            for row in cur.fetchall():
                print(row)
                
            cur.execute("SELECT id, proposed_title FROM partner_project_applications WHERE proposed_title ILIKE '%kalipay%' OR review_notes ILIKE '%kalipay%'")
            print("--- Apps to delete ---")
            for row in cur.fetchall():
                print(row)
                
except Exception as e:
    print(f'Error: {e}')
