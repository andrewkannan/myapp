import paramiko

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'

script = """import sqlite3
conn = sqlite3.connect('/home/sysadmin/projects/myapp/data/dev.db')
cursor = conn.cursor()
abbreviations = ['ABB', 'IVY', 'SWJ', 'WSL', 'LSM', 'CYL', 'YHS', 'LJY', 'LNG', 'BAB', 'JTJ', 'LBT', 'RDR', 'MYG', 'TCY', 'CCL', 'JSP', 'XIAN', 'EJP', 'LON', 'ERW']
modalities = 'XR, BMD, MAM, US'
for abbr in abbreviations:
    cursor.execute("UPDATE User SET modality = ? WHERE abbreviation COLLATE NOCASE = ?", (modalities, abbr))
conn.commit()
print(f"Updated {conn.total_changes} users.")
conn.close()
"""

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    
    # write to file
    sftp = client.open_sftp()
    with sftp.file('/home/sysadmin/update_mods.py', 'w') as f:
        f.write(script)
    sftp.close()
    
    stdin, stdout, stderr = client.exec_command('python3 /home/sysadmin/update_mods.py', get_pty=True)
    out = stdout.read().decode()
    print("Output:\n", out)
    client.close()
except Exception as e:
    print(e)
