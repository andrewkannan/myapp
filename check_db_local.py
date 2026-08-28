import sqlite3

conn = sqlite3.connect('C:/Projects/myapp/dev.db')
cursor = conn.cursor()
cursor.execute('SELECT * FROM Location;')
print("Locations:")
for row in cursor.fetchall():
    print(row)

cursor.execute('SELECT * FROM Station;')
print("Stations:")
for row in cursor.fetchall():
    print(row)
