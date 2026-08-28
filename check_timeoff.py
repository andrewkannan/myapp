import paramiko
import json

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "curl -s -H 'Cookie: auth-token=dummy' 'http://localhost/api/time-off'"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode()
    if out.startswith('{'):
        data = json.loads(out)
        print("Keys:", data.keys())
    else:
        print("Output:", out)
    client.close()
except Exception as e:
    pass
