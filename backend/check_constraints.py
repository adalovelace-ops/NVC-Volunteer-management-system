"""Check for any constraints or indexes that might be causing issues"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url)

print("Checking constraints on projects table...")
with conn.cursor() as cur:
    # Check for any identity-related constraints
    cur.execute("""
        SELECT conname, contype, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'projects'::regclass
    """)
    
    constraints = cur.fetchall()
    if constraints:
        print(f"Found {len(constraints)} constraints:")
        for name, ctype, definition in constraints:
            print(f"  {name} ({ctype}): {definition}")
    else:
        print("  No constraints found")

print("\nChecking indexes on projects table...")
with conn.cursor() as cur:
    cur.execute("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'projects'
    """)
    
    indexes = cur.fetchall()
    if indexes:
        print(f"Found {len(indexes)} indexes:")
        for name, definition in indexes:
            print(f"  {name}: {definition}")
    else:
        print("  No indexes found")

print("\nChecking for sequences...")
with conn.cursor() as cur:
    cur.execute("""
        SELECT sequence_name, data_type
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    """)
    
    sequences = cur.fetchall()
    if sequences:
        print(f"Found {len(sequences)} sequences:")
        for name, dtype in sequences:
            print(f"  {name}: {dtype}")
    else:
        print("  No sequences found")

conn.close()
