#!/usr/bin/env python3
"""
Copy all data from Supabase cloud database to local VPS PostgreSQL database.
"""
import os
import sys

def main():
    src_url = "postgresql://postgres.ehihgqhajovanlecawiq:Ada%401195re4@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
    dst_url = os.getenv("SUPABASE_DB_URL", "postgresql://volcre:NvcDbPass2026@localhost:5432/volcre_db")

    print(f"Source DB: Supabase cloud")
    print(f"Target DB: {dst_url}")

    try:
        import psycopg
    except ImportError:
        try:
            import psycopg2 as psycopg
        except ImportError:
            print("Installing psycopg...")
            os.system(f"{sys.executable} -m pip install psycopg")
            import psycopg

    print("Connecting to source and target...")
    with psycopg.connect(src_url) as src_conn, psycopg.connect(dst_url) as dst_conn:
        src_conn.autocommit = True
        dst_conn.autocommit = True

        with src_conn.cursor() as src_cur, dst_conn.cursor() as dst_cur:
            # Get list of tables in public schema
            src_cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            tables = [r[0] for r in src_cur.fetchall()]

            print(f"Found {len(tables)} tables to copy.")

            # Temporarily disable foreign key checks
            try:
                dst_cur.execute("SET session_replication_role = 'replica';")
            except Exception as e:
                print(f"Warning setting replica role: {e}")

            total_rows = 0
            for table in tables:
                try:
                    src_cur.execute(f'SELECT * FROM public."{table}";')
                    rows = src_cur.fetchall()
                    if not rows:
                        print(f"  {table}: 0 rows (skipped)")
                        continue

                    colnames = [desc[0] for desc in src_cur.description]
                    cols_str = ", ".join([f'"{c}"' for c in colnames])
                    placeholders = ", ".join(["%s"] * len(colnames))

                    # Clear existing target data
                    dst_cur.execute(f'TRUNCATE TABLE public."{table}" CASCADE;')

                    # Insert in batches
                    insert_sql = f'INSERT INTO public."{table}" ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'
                    for row in rows:
                        dst_cur.execute(insert_sql, row)

                    print(f"  ✓ {table}: {len(rows)} rows copied")
                    total_rows += len(rows)
                except Exception as ex:
                    print(f"  ✗ {table}: Error - {ex}")

            # Re-enable foreign key checks
            try:
                dst_cur.execute("SET session_replication_role = 'origin';")
            except Exception:
                pass

            print(f"\nMigration complete! Total rows transferred: {total_rows}")

if __name__ == "__main__":
    main()
