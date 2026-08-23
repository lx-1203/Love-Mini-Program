import pymysql
passwords = ['', 'root', '123456', 'password', 'admin', 'mysql', 'hyp5022940', 'hyp5022', '5022940', 'campus_love', 'campuslove', 'hyp123', 'Hyp5022940']
for p in passwords:
    try:
        conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', password=p)
        print(f'PASSWORD FOUND: "{p}"')
        cursor = conn.cursor()
        cursor.execute("SHOW DATABASES")
        for row in cursor.fetchall():
            print(f'  DB: {row[0]}')
        conn.close()
        break
    except Exception as e:
        print(f'  Tried "{p}": {e}')
else:
    print('No password worked - need to reset MySQL root password')
