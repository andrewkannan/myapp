import paramiko

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "sqlite3 /home/sysadmin/projects/myapp/data/dev.db 'PRAGMA table_info(User);'"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode()
    print("Schema:\n", out)
    client.close()
except Exception as e:
    pass
