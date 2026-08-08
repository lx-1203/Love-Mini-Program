# 截图存档索引

按日期组织，每轮走查/验收一个日期目录（同日多轮用 `-2`、`-3` 后缀），内含 `client/`（小程序端）与 `admin/`（管理后台）子目录。

| 目录 | 日期 | 内容 | 对应报告 |
|---|---|---|---|
| 2026-08-07 | 08-07 | admin 后台 16 页 + api | 报告/验收报告-2026-08-07.md |
| 2026-08-08 | 08-08 | client 首轮 54 页 | 报告/截图验收报告-2026-08-08.md |
| 2026-08-08-2 | 08-08 | client 58 页 + admin 33 页（自动化链路修复后） | 报告/截图验收报告-2026-08-08-v2.md |
| 2026-08-08-3 | 08-08 | **寻觅页重构后全链路走查**：client 42 页（主账号 47）+ client-acct8 9 页（副账号 8 双账号） | 报告/截图验收报告-2026-08-08-v3.md |

## 命名规则

- `NN-页面名.png`：两位序号 + 页面名，与 scripts/mp-shoot-walkthrough.cjs（及历史 mp-shoot-full.cjs）的页清单一一对应
- sidecar：`_run-errors.json`（console error/exception 汇总）、`_run-results.json`（逐页 OK/FAIL + 截图大小）

## 截图脚本

- 当前：`scripts/mp-shoot-walkthrough.cjs`（运行时登录换 token；`--round=1` 主账号 / `--round=2` 副账号）
- 历史：`scripts/mp-shoot-full.cjs`（硬编码 JWT，已过期为教训）
