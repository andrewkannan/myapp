import paramiko

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "curl -s 'http://localhost/api/roster/public?year=2026&month=8' | wc -c"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode()
    print("Payload size:", out)
    client.close()
except Exception as e:
    pass
