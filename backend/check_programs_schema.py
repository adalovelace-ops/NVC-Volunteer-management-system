"""
Check the programs table schema.
"""
from dotenv import load_dotenv
from db import get_connection

load_dotenv()

def check_schema():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            # Get programs table schema
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'programs'
                ORDER BY ordinal_position
            """)
            
            print("=== PROGRAMS TABLE SCHEMA ===\n")
            for row in cursor.fetchall():
                print(f"{row[0]:<30} {row[1]:<20} nullable={row[2]}")
            
            # Get program_tracks table schema
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'program_tracks'
                ORDER BY ordinal_position
            """)
            
            print("\n=== PROGRAM_TRACKS TABLE SCHEMA ===\n")
            for row in cursor.fetchall():
                print(f"{row[0]:<30} {row[1]:<20} nullable={row[2]}")

if __name__ == "__main__":
    check_schema()
