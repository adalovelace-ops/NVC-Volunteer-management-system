from backend.db import get_postgres_connection

query = """
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'volunteers'
ORDER BY ordinal_position
"""

with get_postgres_connection() as conn:
    cur = conn.cursor()
    cur.execute(query)
    rows = cur.fetchall()
    for row in rows:
        print(row)
    cur.close()
