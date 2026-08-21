import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
            tables = [r[0] for r in cur.fetchall()]
            for t in tables:
                if t in ("spatial_ref_sys", "alembic_version"): continue
                cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{t}' AND data_type IN ('text', 'character varying', 'jsonb', 'json')")
                columns = [r[0] for r in cur.fetchall()]
                if not columns: continue
                
                # construct query
                conditions = " OR ".join([f"{c}::text ILIKE '%pbsp%' OR {c}::text ILIKE '%kalipay%'" for c in columns])
                query = f"SELECT * FROM {t} WHERE {conditions}"
                
                try:
                    cur.execute(query)
                    rows = cur.fetchall()
                    if rows:
                        print(f"--- Found in table {t} ---")
                        for r in rows:
                            print(r)
                except Exception as ex:
                    conn.rollback()
                    print(f"Error querying {t}: {ex}")
            
except Exception as e:
    print(f'Error: {e}')
