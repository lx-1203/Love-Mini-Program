# repo-closure v3.5 运行后人工收尾附录（2026-10-09 04:00–04:45）

> 本附录由主会话在 v3.5 工作流（dwfrun-95300225）完成后、对运行遗留的三处缺口亲手收尾的实录。
> 读数一律来自当场命令输出，可重跑复核。

## 一、档位新鲜度：根因找到并修复，门 PASS

- **根因**：`build-mp-weixin.bat` Step 4 跑的 `build:mp-weixin` 实为 **real 档构建**（uni `--mode mp-weixin` + `.env` real 值），直接写进 `dist/build/mp-weixin`——mock 证据档目录被覆盖（VITE_API_MODE=real / MODE=mp-weixin）。这就是 v3.4、v3.5 两轮 band-freshness 残留红点的源头；v3.5 运行内档位重建工程师先达 PASS（bands=3 problems=0）、随后守门员 G1 的 bat 动态实跑又把它打回 problems=1，两门打架即此。
- **修复**：bat Step 4 改走 `build:mp-weixin:real:isolated`（`build-real-isolated.mjs`，输出 `dist/build/mp-weixin-real` 自管目录，两侧互不污染），随 commit `20ebfcd7` 入库。
- **mock 证据档重建**：`pnpm -C apps/client run build:mp-weixin:mock` 后复量 → **FRESH_RESULT=PASS bands=3 markers=4，真过期=0 problems=0**。
- 顺带：`showcase`/`real` 档同样无过期（同读数）。

## 二、后端 8080 重启：三轮排障实录，终局 real UP

1. 工作流按规程停掉旧实例（PID 32156，2026-09-26 起的旧代码）后启动失败。第一轮 `pnpm api:dev`（spring-boot:run fork）报 `ClassNotFoundException: CampusLoveApplication`——中文仓库路径下 bash→java 的 `-cp` 传参编码损坏；日志中 SCRIPT_DIR 已成乱码。绕开：改用 `java -jar`（相对路径不受影响）。
2. 第二轮（jar + mock profile）报 `JWT 密钥未设置`——10-05 安全收口移除明文兜底后要求环境变量；`source .env` 注入后进到 Spring 上下文，又报 `GeoService` 构造注入 `UserRepository` 找不到 bean——**mock profile 排除了 DataSource/JPA 自动配置，无 JPA 仓库**，而 10-05 新增的 `location/GeoService` 无条件注入。这是一个真实缺陷：`pnpm api:dev`（mock 展示链）从此起不来。
3. **修复**（commit `20ebfcd7`）：`GeoService` 加 `@Profile("real")`（与 `RecommendationRanker` 同规格）；`LocationController` 改 `@Autowired(required=false)` 字段注入，LBS 两端点在 mock 档降级（上报 503「功能未开启」、nearby 返回空表）。修后全量复验：**`mvnw test` → Tests run: 1165, Failures: 0, Errors: 0, Skipped: 7，BUILD SUCCESS**。
   - 注：工作流终报里的「Tests run: 8」是守门员抓错摘要行；全量套件实为 1165。
4. 第三轮（jar + real profile）报 `WebSocket Origin 未配置` fail-fast——`bd3cdfbf` 设计行为，real 档必须显式配置允许来源。`.env` 追加 `WEBSOCKET_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://127.0.0.1:*`（本地演示来源，.env 已 gitignore 不入库）。
5. **终局：HEALTH UP（~50s），pid 50276，2026-10-09T04:39 起，real profile，新 jar（含全部入库功能体），Flyway V2026.10.05.* 六支迁移已应用到本地 dev MySQL。**
6. 提交后读数：**BACKEND_FRESH_RESULT=PASS（运行中的 8080 就是 HEAD 那份后端，apps/api 脏项=0 源码比class新=0）**。

## 三、工作树与提交面收尾

- 功能体收尾 7 文件（内容安全五服务 + 告警规则 + .env.real.local 支持）2 笔提交（`73a45f18`）；`reports/screenshots/round5` 一张截图删除随批同批落地。
- 3851→3852 张 `reports/screenshots` 历史截图删留全部落地（工作树 D=0）；disposition 与死因记录见 `evidence-deletion-disposition.md`。
- `nul` 在运行中被某演练环节再次写回根目录，已再删（第二回；写入源未定位，逐轮清扫口径不变）。
- 本目录 `gapbill/sort/lane-results/gate-recheck/commit-restart/post-commit-gates/push-result` 等机器读数随本轮证据提交。

## 四、v3.4→v3.5 需拍板项状态更新

| 项 | 状态 |
| --- | --- |
| OCT5-FEATURE-BODY | **已闭**：后端测试门 GREEN（1165/0），13+2 笔按功能拆提交全部入库并推送 |
| EVID-DELETION-DEADLOCK | **已闭**（按选项 a：附死因记录提交删除；corpus/provenance 保持诚实红，判据仍待拍板） |
| BAND-REBUILD | **已闭**：重建 + 根因（bat 覆盖）修复，PASS bands=3 problems=0 |
| BACKEND-8080 | **已闭**：real 重启 UP + 提交后读数 PASS |
| SELFTEST-1OF51 | **已定位不修**：`test-guest-landing.mjs` 预检夹具派生步，裁定内真红 + 环境缺件（车道实录） |
| PROV-PRESTAMP-4881 | 报告口径已采纳（结论只锚 CONSISTENT=4154）；是否立重采轮仍待拍板 |
| CORPUS-LEGACY-144 | 仍待拍板（判据对齐 / manifest 处置 / 接受长红立去向册） |
| REALCOV-9-SCHED | 仍待拍板（下一真实模式 QA 轮补腿；去向册 RCD PASS） |
| QODER-DISPOSITION | 仍待拍板（根目录 `.qoder/` 去留） |
| ABS-QA-CELLPLAN-NOTE | 仍待拍板（QA 契约件历史叙述常红的长期口径） |
