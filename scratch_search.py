import sys
import os
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            print('--- USERS ---')
            cur.execute("SELECT id, email, role, full_name FROM users WHERE email ILIKE '%pbsp%' OR data::text ILIKE '%pbsp%' OR data::text ILIKE '%kalipay%'")
            for row in cur.fetchall(): print(row)
            
            print('--- HOT_ITEMS ---')
            cur.execute("SELECT type, id, data FROM hot_items WHERE data::text ILIKE '%pbsp%' OR data::text ILIKE '%kalipay%'")
            for row in cur.fetchall(): print(f'Type: {row[0]}, ID: {row[1]}, Title: {row[2].get("title", "")}')
            
            print('--- PARTNERS ---')
            cur.execute("SELECT user_id, organization_name FROM partners WHERE organization_name ILIKE '%pbsp%' OR organization_name ILIKE '%kalipay%'")
            for row in cur.fetchall(): print(row)
except Exception as e:
    print(f'Error: {e}')
