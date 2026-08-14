# 归档目录（Archive）

> 归档说明（2026-08-10）：本目录收纳项目根目录散落的一次性审计/调试/设计资产。
> **只归档归位、不删除任何内容**；文件内容原样保留，可随时移回根目录。

## 目录结构与归档清单

| 归档位置 | 原位置（根目录） | 内容说明 |
|----------|------------------|----------|
| `archive/audit-round2/` | `audit-round2/` | R2 审计报告（git 追踪，git mv 保留历史） |
| `archive/audit-round3/` | `audit-round3/` | R3 审计 TSV/报告（git 追踪，git mv 保留历史） |
| `archive/audit-scripts/` | `audit_*.py/json/tsv`、`process_audit.py`、`scan_audit.py`、`finalize_audit.py`、`extract_*.py`、`debug_lines.py`、`test_merge.py`、`test_parse.py`、`run_full_test.{py,mjs}`、`run_study.mjs`、`check-encoding.js`、`fix-encoding*.js`、`fix_*.py`、`add_version_to_entities.py`、`check-pages-json.cjs`、`consolidated_admin_api_lines.txt` | 一次性审计/修复脚本与中间产物 |
| `archive/logs/` | `api-server-real.log`、`mp-weixin-runtime-logs.json`、`openpencil-mcp.log`、`test-results.{json,log}`、`test-comp.txt`、`verification-logs*.json` | 运行日志与测试结果快照 |
| `archive/design/` | `design-archive/`、`design-preview/`、`design-preview.7z`、`design-system/` | 设计资产与预览稿 |
| `archive/documents/` | `反馈.docx`、`大学生恋爱交友小程序竞品分析.docx`、`截图验收报告-H5-2026-08-08.md` | 业务文档 |
| `archive/misc/` | `32`（空文件）、`checklist.md`、`index.html`、`styles.css`、`script.js`、`parse-results.ps1`、`set-root-password.sql`、`test-migrations.sh`、`__pycache__/` | 其他一次性产物 |
| `archive/misc/32` | 根目录 `32` | 空文件（git 追踪，git mv 保留历史） |

## 就地归档（未移动）

| 路径 | 说明 |
|------|------|
| `xingji-branch/` | 旧分支快照（未追踪；移动被进程占用拒绝，就地保留，见其 README.md） |

## 保留在根目录的说明

以下文件虽属辅助性质，但因被构建/配置/运维引用而**保留原位**：
`init-mysql.sql`（docker-compose 引用）、`build-mp-weixin.bat`、`start-showcase.bat`、
`run-flyway.cmd/.ps1`（运维脚本）、`lighthouserc.json`（lighthouse 配置）、
`opencode.json`、`reasonix.toml`（工具配置）、`.env.example` 及全部 dotfiles。
