import paramiko
import json

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "curl -s 'http://localhost/api/roster/public?year=2026&month=8'"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode()
    data = json.loads(out)
    print("Shifts count:", len(data.get('shifts', [])))
    print("Leaves count:", len(data.get('leaves', [])))
    client.close()
except Exception as e:
    pass
