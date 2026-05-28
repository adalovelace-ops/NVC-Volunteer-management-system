"""Test DDL statements directly to find which one causes the error"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url)

# Test the problematic DDL statement
test_sql = """
do $$
begin
  -- Skip identity column handling - our tables use text IDs, never identity columns
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'id'
      and data_type != 'text'
      and data_type not in ('smallint', 'integer', 'bigint')
  ) then
    -- Only convert non-integer, non-text types (like uuid) to text
    alter table projects alter column id type text using id::text;
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'created_at'
      and data_type != 'text'
  ) then
    alter table projects alter column created_at type text using created_at::text;
  end if;
end $$;
"""

print("Testing DDL statement...")
try:
    with conn.cursor() as cur:
        cur.execute(test_sql)
        conn.commit()
        print("✓ DDL executed successfully")
except Exception as e:
    print(f"✗ Error: {e}")
    conn.rollback()

# Check current column types
print("\nCurrent column types:")
with conn.cursor() as cur:
    cur.execute("""
        SELECT column_name, data_type, is_identity
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'projects'
        AND column_name IN ('id', 'created_at')
    """)
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]} (identity: {row[2]})")

conn.close()
