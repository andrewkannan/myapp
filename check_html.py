import paramiko
import json

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "curl -s -H 'Cookie: auth-token=dummy' 'http://localhost/leaves'"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode()
    
    if "This page couldn't load" in out:
        print("YES! Error boundary is in the HTML!")
    else:
        print("NO! HTML is normal.")
        print("Length:", len(out))
    client.close()
except Exception as e:
    pass
