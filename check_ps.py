import paramiko
hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'
command = "cd /home/sysadmin/projects/myapp && docker compose ps"
try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    out = stdout.read().decode('utf-8', errors='ignore')
    print(out)
    client.close()
except Exception as e:
    print(e)
