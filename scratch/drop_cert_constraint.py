import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from db import get_connection, load_environment

def drop_constraint():
    load_environment()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE volunteers DROP CONSTRAINT IF EXISTS volunteers_certifications_len_chk;")
            print("Dropped volunteers_certifications_len_chk successfully")
        conn.commit()

if __name__ == "__main__":
    drop_constraint()
