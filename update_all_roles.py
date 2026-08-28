import paramiko

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'

script = """import sqlite3
conn = sqlite3.connect('/home/sysadmin/projects/myapp/data/dev.db')
cursor = conn.cursor()

# Update Sonographers
cursor.execute("UPDATE User SET modality = 'XR, BMD, MAM, US' WHERE role LIKE '%sonographer%' COLLATE NOCASE")
sonographers_updated = cursor.rowcount

# Update Radiographers
cursor.execute("UPDATE User SET modality = 'MRI, CT, PET' WHERE role LIKE '%radiographer%' COLLATE NOCASE")
radiographers_updated = cursor.rowcount

conn.commit()
print(f"Updated {sonographers_updated} sonographers and {radiographers_updated} radiographers.")
conn.close()
"""

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    
    sftp = client.open_sftp()
    with sftp.file('/home/sysadmin/update_roles.py', 'w') as f:
        f.write(script)
    sftp.close()
    
    stdin, stdout, stderr = client.exec_command('python3 /home/sysadmin/update_roles.py', get_pty=True)
    out = stdout.read().decode()
    print("Output:\n", out)
    client.close()
except Exception as e:
    print(e)
