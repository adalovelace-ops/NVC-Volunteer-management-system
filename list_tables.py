#!/usr/bin/env python3
"""List all tables in Supabase database."""

import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent / 'backend'
app_dir = Path(__file__).resolve().parent
load_dotenv(app_dir / '.env')
load_dotenv(backend_dir / '.env', override=True)

try:
    import psycopg
except ImportError:
    print("Error: psycopg not installed")
    exit(1)

db_url = os.getenv('SUPABASE_DB_URL', '').strip()
if not db_url:
    print("Error: SUPABASE_DB_URL not configured")
    exit(1)

try:
    with psycopg.connect(db_url, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            # List all tables
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = cur.fetchall()
            
            print("Tables in database:")
            for (table_name,) in tables:
                print(f"  - {table_name}")
                
except Exception as e:
    print(f"Error: {e}")
