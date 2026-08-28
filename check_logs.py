import paramiko

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "docker logs myapp-web-1 --tail 100"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print("Logs:", out)
    if err:
        print("Error Logs:", err)
    client.close()
except Exception as e:
    pass
