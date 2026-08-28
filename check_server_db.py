import paramiko

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "docker exec myapp-web-1 sqlite3 data/dev.db 'SELECT COUNT(*) FROM Shift;' 'SELECT COUNT(*) FROM User;'"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode()
    print("Output:\n", out)
    client.close()
except Exception as e:
    pass
