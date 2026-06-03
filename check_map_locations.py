"""Check project location data in the database"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.db import get_connection

def check_locations():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            # Get sample projects with locations
            cursor.execute("""
                SELECT * 
                FROM projects 
                LIMIT 1
            """)
            
            # Get column names
            colnames = [desc[0] for desc in cursor.description]
            print(f"Column names: {colnames}\n")
            
            cursor.execute("""
                SELECT * 
                FROM projects 
                LIMIT 5
            """)
            
            rows = cursor.fetchall()
            
            print(f"\n{'='*80}")
            print("PROJECT LOCATION DATA CHECK")
            print(f"{'='*80}\n")
            print(f"Found {len(rows)} projects:\n")
            
            for row in rows:
                row_dict = dict(zip(colnames, row))
                print(f"Project: {row_dict.get('title', 'N/A')}")
                print(f"  Data: {row_dict}")
                print()

if __name__ == "__main__":
    try:
        check_locations()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
