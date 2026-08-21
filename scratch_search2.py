import sys
import os
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            print('--- HOT_ITEMS ---')
            cur.execute("SELECT type, id, data FROM hot_items WHERE data::text ILIKE '%pbsp%' OR data::text ILIKE '%kalipay%'")
            for row in cur.fetchall(): 
                print(f'Type: {row[0]}, ID: {row[1]}')
except Exception as e:
    print(f'Error: {e}')
