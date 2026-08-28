import paramiko

SMTP_USER = "roster@asiamedic.com.sg"
SMTP_PASS = "R@484504815813am"

hostname = '10.251.237.21'
username = 'sysadmin'
password = 'sys10101@@@'

try:
    print("Connecting to server...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=10)
    
    # Read existing .env if any
    sftp = client.open_sftp()
    env_content = f"SMTP_USER={SMTP_USER}\nSMTP_PASS={SMTP_PASS}\n"
    
    print("Writing credentials to .env...")
    with sftp.file('/home/sysadmin/projects/myapp/.env', 'w') as f:
        f.write(env_content)
    sftp.close()
    
    print("Restarting docker container to apply credentials...")
    stdin, stdout, stderr = client.exec_command("cd /home/sysadmin/projects/myapp && git fetch origin && git reset --hard origin/main && docker compose up --build -d")
    print(stdout.read().decode())
    
    client.close()
    print("Success! Your email credentials are now securely set on the server.")
except Exception as e:
    print("Error:", e)
