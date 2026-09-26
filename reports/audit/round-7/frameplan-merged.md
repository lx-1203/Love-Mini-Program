# round-7 取景配方合并与复核

期望条目 79｜实收 79｜守恒 成立

| disposition | 条数 |
|---|---|
| REWRITE | 16 |
| SHOOT | 42 |
| NOT_SHOOTABLE | 21 |

## 复核问题（lane 交回来的依据，逐条重开文件验的）

| 类别 | 条数 | 含义 |
|---|---|---|
| ANCHOR_MISS | 0 | 标的行号在文件里不存在 |
| ANCHOR_NOFILE | 0 | 标的文件读不到 |
| ANCHOR_DRIFT | 0 | token 在附近但不在标的那行（行号看错） |
| ANCHOR_WRONGFILE | 0 | token 真实存在但在别的文件＝锚点写错文件 |
| ANCHOR_TOKEN | 0 | 全仓没这个 token＝依据是编的 |
| ROUTE_BAD | 0 | route 不在 pages.json 里 |
| NO_ASSERT | 0 | 判 SHOOT 却没断言 / 跨 lane 重复 |
| BAD_DISPO | 0 | disposition 不是三个受控词之一 |
