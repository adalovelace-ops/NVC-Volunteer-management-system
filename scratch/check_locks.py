import psycopg2
conn = psycopg2.connect('postgresql://postgres.ehihgqhajovanlecawiq:Ada%401195re4@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require')
cur = conn.cursor()
cur.execute("""
    select pid, query, state, age(clock_timestamp(), query_start) 
    from pg_stat_activity 
    where state != 'idle' and query not like '%pg_stat_activity%'
""")
print("Active queries:")
for row in cur.fetchall():
    print(row)
    
cur.execute("""
    select blocked_locks.pid     as blocked_pid,
           blocked_activity.usename  as blocked_user,
           blocking_locks.pid    as blocking_pid,
           blocking_activity.usename as blocking_user,
           blocked_activity.query    as blocked_statement,
           blocking_activity.query   as blocking_statement
    from  pg_catalog.pg_locks         blocked_locks
    join pg_catalog.pg_stat_activity blocked_activity on blocked_activity.pid = blocked_locks.pid
    join pg_catalog.pg_locks         blocking_locks 
        on blocking_locks.locktype = blocked_locks.locktype
        and blocking_locks.database is not distinct from blocked_locks.database
        and blocking_locks.relation is not distinct from blocked_locks.relation
        and blocking_locks.page is not distinct from blocked_locks.page
        and blocking_locks.tuple is not distinct from blocked_locks.tuple
        and blocking_locks.virtualxid is not distinct from blocked_locks.virtualxid
        and blocking_locks.transactionid is not distinct from blocked_locks.transactionid
        and blocking_locks.classid is not distinct from blocked_locks.classid
        and blocking_locks.objid is not distinct from blocked_locks.objid
        and blocking_locks.objsubid is not distinct from blocked_locks.objsubid
        and blocking_locks.pid != blocked_locks.pid
    join pg_catalog.pg_stat_activity blocking_activity on blocking_activity.pid = blocking_locks.pid
    where not blocked_locks.granted;
""")
print("Locks:")
for row in cur.fetchall():
    print(row)
conn.close()
