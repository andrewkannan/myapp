import paramiko

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "docker exec myapp-web-1 python3 /app/scripts/zed_delete.py AM00425855"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command)
    print("Out:", stdout.read().decode())
    print("Err:", stderr.read().decode())
    client.close()
except Exception as e:
    print(str(e))
