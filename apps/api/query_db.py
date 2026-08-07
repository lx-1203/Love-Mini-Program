import pymysql
import json
import urllib.request
import urllib.error

DB_HOST = '127.0.0.1'
DB_PORT = 3307
DB_USER = 'root'
DB_PASSWORD = 'hyp5022940'
DB_NAME = 'campus_love'

conn = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    cursorclass=pymysql.cursors.DictCursor
)

results = {
    'tables': [],
    'counts': {},
    'avatar_urls': []
}

BASE_URL = 'http://localhost:8080'


def resolve_url(url):
    if url.startswith('http://') or url.startswith('https://'):
        return url
    if url.startswith('/'):
        return BASE_URL + url
    return BASE_URL + '/' + url


def check_url(url, timeout=10):
    resolved = resolve_url(url)
    try:
        req = urllib.request.Request(resolved, method='HEAD', headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resolved, resp.url
    except urllib.error.HTTPError as e:
        return e.code, resolved, None
    except Exception as e:
        return str(e), resolved, None

try:
    with conn.cursor() as cur:
        # 1. List tables
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema=%s ORDER BY table_name",
            (DB_NAME,)
        )
        results['tables'] = [row.get('table_name') or row.get('TABLE_NAME') for row in cur.fetchall()]

        # 2. Count queries
        # 用户要求的表名 -> 实际表名（允许 fallback）
        count_queries = [
            ('users_total', 'users', "SELECT COUNT(*) AS cnt FROM users"),
            ('users_virtual', 'users', "SELECT COUNT(*) AS cnt FROM users WHERE id != 1 AND role = 'USER'"),
            ('posts_total', 'posts', "SELECT COUNT(*) AS cnt FROM posts"),
            ('comments_total', 'comments', "SELECT COUNT(*) AS cnt FROM comments"),
            ('conversations_total', 'private_conversations', "SELECT COUNT(*) AS cnt FROM private_conversations"),
            ('messages_total', 'private_messages', "SELECT COUNT(*) AS cnt FROM private_messages"),
            ('user_visitors_total', 'visitors', "SELECT COUNT(*) AS cnt FROM visitors"),
            ('user_likes_total', 'likes', "SELECT COUNT(*) AS cnt FROM likes"),
            ('activities_total', 'activities', "SELECT COUNT(*) AS cnt FROM activities"),
            ('check_ins_total', 'check_ins', "SELECT COUNT(*) AS cnt FROM check_ins"),
            ('topics_total', 'campus_topics', "SELECT COUNT(*) AS cnt FROM campus_topics")
        ]

        for key, actual_table, sql in count_queries:
            try:
                cur.execute(sql)
                row = cur.fetchone()
                results['counts'][key] = {
                    'actual_table': actual_table,
                    'count': row['cnt'] if row else 0
                }
            except Exception as e:
                results['counts'][key] = {
                    'actual_table': actual_table,
                    'count': f"ERROR: {e}"
                }

        # 3. Sample avatar URLs from virtual users
        cur.execute(
            "SELECT id, avatar_url FROM users WHERE id != 1 AND role = 'USER' "
            "AND avatar_url IS NOT NULL AND avatar_url != '' ORDER BY id LIMIT 20"
        )
        sampled = cur.fetchall()
        for row in sampled:
            url = row['avatar_url']
            status, resolved_url, final_url = check_url(url)
            results['avatar_urls'].append({
                'user_id': row['id'],
                'original_url': url,
                'resolved_url': resolved_url,
                'status': status,
                'final_url': final_url
            })

finally:
    conn.close()

print(json.dumps(results, ensure_ascii=False, indent=2))
