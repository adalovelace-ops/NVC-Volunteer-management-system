"""Check if events have partner_id set"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.db import get_connection

def check_event_partner():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            # First get the event
            cursor.execute("""
                SELECT * 
                FROM events 
                WHERE title LIKE '%Quarterly%' OR title LIKE '%Assessment%'
                LIMIT 1
            """)
            
            colnames = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            print(f"\n{'='*80}")
            print("EVENT INFO")
            print(f"{'='*80}\n")
            
            event_parent_id = None
            for row in rows:
                row_dict = dict(zip(colnames, row))
                print(f"Title: {row_dict.get('title')}")
                print(f"  Partner ID: {row_dict.get('partner_id')}")
                print(f"  Parent Project ID: {row_dict.get('parent_project_id')}")
                event_parent_id = row_dict.get('parent_project_id')
                print()
            
            # Now check the parent project/program
            if event_parent_id:
                print(f"\n{'='*80}")
                print("PARENT PROJECT/PROGRAM INFO")
                print(f"{'='*80}\n")
                
                # Check in projects table
                cursor.execute("""
                    SELECT * FROM projects WHERE id = %s
                    UNION ALL
                    SELECT * FROM programs WHERE id = %s
                    LIMIT 2
                """, (event_parent_id, event_parent_id))
                
                colnames = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()
                
                for row in rows:
                    row_dict = dict(zip(colnames, row))
                    print(f"Title: {row_dict.get('title')}")
                    print(f"  ID: {row_dict.get('id')}")
                    print(f"  Partner ID: {row_dict.get('partner_id')}")
                    print()

if __name__ == "__main__":
    try:
        check_event_partner()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
