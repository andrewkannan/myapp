import paramiko
hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname, username=username, password=password, timeout=10)

sftp = client.open_sftp()
with sftp.file('/tmp/add_bmd.py', 'w') as f:
    f.write('''import sqlite3
import uuid

db_path = "/home/sysadmin/projects/myapp/data/dev.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Check if BMD already exists
c.execute("SELECT id FROM SystemModality WHERE name = 'BMD'")
row = c.fetchone()
if not row:
    mod_id = str(uuid.uuid4())
    c.execute("INSERT INTO SystemModality (id, name) VALUES (?, ?)", (mod_id, 'BMD'))
    conn.commit()
    print("Added BMD")
else:
    print("BMD already exists")

conn.close()''')
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/add_bmd.py', get_pty=True)
print('Out:', stdout.read().decode())
print('Err:', stderr.read().decode())
client.close()
