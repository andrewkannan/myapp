import paramiko
import csv
import uuid
from datetime import datetime

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'

# Read CSV and build insert statements
inserts = []
with open('scripts/leaves.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        date_str = row['Date']
        abbr = row['Staff_Abbreviation']
        leave_type = row['Leave_Type']
        period = row['Period']
        raw_status = row['Status']
        remarks = row['Remarks']
        al_opt = row.get('AL leave option', '')

        status_to_use = 'PENDING'
        if al_opt in ('Ballet', 'Ballot'):
            status_to_use = 'BALLOT'
        elif al_opt == 'Confirmed':
            status_to_use = 'APPROVED'
        elif al_opt == 'Pending in queue':
            status_to_use = 'PENDING'
        elif raw_status == 'APPROVED':
            status_to_use = 'APPROVED'

        # Convert date to ISO format for sqlite
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d')
            iso_date = d.isoformat() + "Z"
        except Exception:
            iso_date = date_str

        inserts.append((abbr, iso_date, leave_type, period, status_to_use, remarks))

server_script = f\"\"\"
import sqlite3
import uuid

db_path = '/home/sysadmin/projects/myapp/data/dev.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT abbreviation, id FROM User")
users = dict(c.fetchall())

c.execute("DELETE FROM Leave")
deleted_count = c.rowcount
print(f"Deleted {deleted_count} existing leave records.")

inserts_data = {inserts}

success = 0
not_found = set()
for abbr, date_val, ltype, period, status, remarks in inserts_data:
    user_id = users.get(abbr)
    if not user_id:
        not_found.add(abbr)
        continue
        
    leave_id = str(uuid.uuid4())
    created_at = "2026-08-25T12:00:00.000Z"
    
    c.execute('''
        INSERT INTO Leave (id, userId, date, period, type, status, remarks, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (leave_id, user_id, date_val, period, ltype, status, remarks, created_at))
    success += 1

conn.commit()
conn.close()
print(f"Successfully inserted {success} records.")
if not_found:
    print(f"Users not found: {not_found}")
\"\"\"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    
    sftp = client.open_sftp()
    with sftp.file('/tmp/load_leaves.py', 'w') as f:
        f.write(server_script)
    sftp.close()
    
    stdin, stdout, stderr = client.exec_command("python3 /tmp/load_leaves.py", get_pty=True)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print("Out:", out)
    print("Err:", err)
    client.close()
except Exception as e:
    print(e)
