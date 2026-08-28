import paramiko

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "docker compose -f /home/sysadmin/projects/myapp/docker-compose.yml logs --tail=100 web > /tmp/logs.txt && cat /tmp/logs.txt"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    print(out.encode('ascii', errors='ignore').decode())
    client.close()
except Exception as e:
    print(e)
