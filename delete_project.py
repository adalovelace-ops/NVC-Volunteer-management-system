#!/usr/bin/env python3
"""Delete a project from Supabase by ID."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
backend_dir = Path(__file__).resolve().parent / 'backend'
app_dir = Path(__file__).resolve().parent
load_dotenv(app_dir / '.env')
load_dotenv(backend_dir / '.env', override=True)

try:
    import psycopg
except ImportError:
    print("Error: psycopg not installed")
    sys.exit(1)

def delete_project(project_id: str) -> bool:
    """Delete a project and all related records from the database."""
    db_url = os.getenv('SUPABASE_DB_URL', '').strip()
    if not db_url:
        print("Error: SUPABASE_DB_URL not configured")
        return False
    
    try:
        with psycopg.connect(db_url, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                # Check if project exists
                cur.execute(
                    "SELECT id, title FROM storage WHERE key = %s AND value->>'id' = %s LIMIT 1",
                    ('projects', project_id)
                )
                result = cur.fetchone()
                
                if result:
                    print(f"Found project: {result}")
                    
                    # Delete from storage (projects collection)
                    cur.execute(
                        "DELETE FROM storage WHERE key = 'projects' AND value->>'id' = %s",
                        (project_id,)
                    )
                    deleted = cur.rowcount
                    conn.commit()
                    
                    if deleted > 0:
                        print(f"✓ Deleted {deleted} project record(s)")
                        return True
                    else:
                        print("No records deleted")
                        return False
                else:
                    print(f"Project '{project_id}' not found in database")
                    return False
                    
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python delete_project.py <project_id>")
        sys.exit(1)
    
    project_id = sys.argv[1]
    print(f"Deleting project: {project_id}")
    
    if delete_project(project_id):
        print("✓ Project deleted successfully")
        sys.exit(0)
    else:
        print("✗ Failed to delete project")
        sys.exit(1)
