import pymysql

# Connect to MySQL 3307 (root with empty password)
conn = pymysql.connect(host='127.0.0.1', port=3307, user='root', password='')
cur = conn.cursor()

# Create database
cur.execute("CREATE DATABASE IF NOT EXISTS campus_love CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
print("Database campus_love created")

# Set root password
cur.execute("ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'hyp5022940'")
print("Root password set")

conn.commit()
conn.close()
print("Done!")
