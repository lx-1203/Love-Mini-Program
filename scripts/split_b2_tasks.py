# -*- coding: utf-8 -*-
"""Batch2 任务拆分：按模块把 batch-2 条目拆成 5 路任务清单"""
import io

rows = []
with io.open('audit-round3/R4-FINAL.tsv', encoding='utf-8') as f:
    for line in f:
        if line.strip():
            rows.append(line.rstrip().split('|'))

b2 = [p for p in rows if len(p) >= 10 and p[9] == 'batch-2']
BS = '\\'

def norm(p):
    return p[1].lower().replace(BS, '/')

def is_api(p):
    n = norm(p)
    return 'apps/api' in n or 'database/' in n

def is_client(p):
    return 'apps/client' in norm(p)

def is_admin(p):
    return 'apps/admin' in norm(p)

b21 = [p for p in b2 if is_api(p) and (p[4] == 'P1' or p[3] == 'F')]
b22 = [p for p in b2 if is_api(p) and ('now()' in p[5] or '时区' in p[5] or 'ZoneId' in p[5])]
b23 = [p for p in b2 if is_client(p)]
b24 = [p for p in b2 if is_admin(p)]
b25 = [p for p in b2 if not is_api(p) and not is_client(p) and not is_admin(p)]
# 时区判定漏网的 api P2（含 now( 简写、日期/时间语义）并入 02
b22b = [p for p in b2 if is_api(p) and p[4] == 'P2' and p[3] == 'B' and id(p) not in map(id, b21 + b22)]
b22 = b22 + b22b

def dump(label, items):
    with io.open('audit-round3/task-b2-' + label + '.tsv', 'w', encoding='utf-8') as f:
        for p in items:
            f.write('|'.join(p) + '\n')
    print('task-b2-' + label + ': ' + str(len(items)) + ' 条')

dump('01-api-business', b21)
dump('02-api-timezone', b22)
dump('03-client', b23)
dump('04-admin', b24)
dump('05-infra', b25)
total = len(b21) + len(b22) + len(b23) + len(b24) + len(b25)
print('合计: ' + str(total) + ' b2: ' + str(len(b2)) + ' 遗漏: ' + str(len(b2) - total))
