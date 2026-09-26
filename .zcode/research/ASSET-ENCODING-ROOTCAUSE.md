# App-Assets 非 ASCII 文件名 404 根因定位（只读诊断）

日期：2026-09-25 ｜ 范围：`GET /api/v1/media/app-assets/**` ｜ 模式：real（127.0.0.1:8080 已运行进程）
约束：只读。未修改任何文件、未写库、未重启/新建后端进程、未跑构建。唯一写操作 = 本报告 + `.zcode/tmp/` 下的探测输出文件。

现象基线（由调用方实测提供，本报告不重复大前提）：`IMAGE_PATHS` 455 条引用 → 可达 62 / 404 393；
可达 62 条中 0 条中文文件名；404 的 393 条中 370 条中文文件名；磁盘 `apps/api/uploads/app-assets` 下这些文件存在。

## 1. 控制器：URL 段 → 磁盘路径的解析方式

**结论：全程零次 `URLDecoder.decode`。子路径来自 `request.getRequestURI()` 的裸字符串切割，而 `getRequestURI()` 按 Servlet 规范返回**未解码**的 URI（Tomcat 只做 ISO-8859-1 字节→字符映射，不解 `%XX`）。所以百分号编码的中文名在 Java 侧就是字面量 `%E7%99%BB%E5%BD%95%E9%A1%B5_r01_c01.png`，既查不到库也开不了文件。**

链路逐跳（文件:行，均为绝对路径下的仓库相对定位）：

| # | 位置 | 事实 |
|---|---|---|
| 1 | `apps/api/src/main/java/com/campuslove/api/media/MediaAccessController.java:333` | `@GetMapping("/app-assets/**")` —— `**` 只做 Ant 通配**匹配**，没有 `@PathVariable` 承接，通配段不进入方法签名 |
| 2 | 同文件 `:344-345` | `getAppAsset(HttpServletRequest request)` → `String subPath = extractAppAssetSubPath(request);` |
| 3 | 同文件 `:527-537` | 提取方式＝`request.getRequestURI()` + `uri.indexOf(APP_ASSET_URL_PREFIX)` + `substring`。**无 decode**、无 `getPathInfo()`、无 `HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE`（该属性只被用户媒体分支 `:575-578` 用作候选） |
| 4 | 同文件 `:350-355` | 注册校验把**未解码**的 subPath 直接拼回 `APP_ASSET_URL_PREFIX + subPath` 去查 `findByUrlAndType(url, "app_asset")` —— 与库里存的原文中文必然不等 |
| 5 | `apps/api/src/main/java/com/campuslove/api/media/MediaAccessService.java:164-187` | `loadAppAsset`：`validateSubPath(subPath)` → `root.resolve(Paths.get("app-assets", subPath))` → `Files.exists(target)` 否则 404。同样是**未解码**字符串直接进 `Path`，文件名里字面留着 `%E7%99%BB…` |
| 6 | 同文件 `:258-289` | `validateSubPath` 只拒 `..`、`\`、前导 `/`、控制字符、`;`。**百分号 `%` 与非 ASCII 都不违规**，所以编码串能顺利通过校验——校验不是拦路者 |

排除项（重要，避免误判为静态资源处理器问题）：

- **没有** `ResourceHttpRequestHandler` / `PathMatchingResourcePatternResolver` / `addResourceHandlers` 参与本端点：全仓 `apps/api/src/main` 内 grep `URLDecoder|URLEncoder|ResourceHttpRequestHandler|PathMatchingResourcePatternResolver|addResourceHandlers|UrlPathHelper|AntPathMatcher|PathPatternParser` 的命中仅
  `config/JwtAuthenticationFilter.java:23,107` 与 `config/MockSecurityConfig.java:21,99`（两处 `AntPathMatcher`，与媒体解析无关）、以及 `chat/VoiceMessageController.java:128` 的一句注释。
- `config/WebConfig.java:28-32` 明确写着「Task 0.3 改造说明：原 `/uploads/**` 静态资源映射已移除」，`:115-124` 的 `getMediaStorageRoot()` 注释再次确认「不再注册 ResourceHandler」。因此 Spring 静态资源那条会 `decode` 的路径彻底不在链路里。
- 唯一 decode 相关的自研代码在别处：`chat/VoiceMessageController.java:128` 显式说明「不使用 java.net.URLDecoder：其将 `+` 解码为空格」——团队已知 decode 语义坑，但 app-assets 分支一个都没做。

补充观察：`extractAppAssetSubPath` 的注释（`:519-522`）记录了一次「双前缀 404」的历史修复，方向是纯字符串切割，等于**主动放弃了 Spring 的解码语义**，把「谁负责解码」这件事留空了。

## 2. Spring / Tomcat 编码与斜杠策略

**结论：这一层没有任何「定制」，全部是 Spring Boot 3.3.1 默认值。默认值本身是对的（URI 按 UTF-8 解码），但它只作用于 Spring 自己解析路径的那条路；本端点绕开了它（见第 1 节第 3 跳），于是默认策略救不了中文名。真正在这层咬人的是 Tomcat 连接器的非法字符门禁——它让「原样非 ASCII」直接吃 400，连 Spring 都进不去。**

配置盘点（实测：`apps/api` 全模块 + `docker-compose.yml` grep `uri-encoding|matching-strategy|relaxedPathChars|allowEncodedSlash|rejectIllegalHeader|pathmatch|spring.mvc` → **0 命中**）：

| 键 | 现状 | 生效值（默认） | 对本案的影响 |
|---|---|---|---|
| `server.tomcat.uri-encoding` | **未配置**（`application.yml:58-91` 的 server 块只有 `port` + `tomcat.accesslog/threads/accept-count/max-connections/connection-timeout`；`application-real.yml` 里**根本没有 `server:` 块**） | UTF-8（Boot 默认 + Tomcat 10 默认） | 决定 `getPathInfo()`/`@PathVariable`/`PathPattern` 的解码字符集。因为控制器用的是 `getRequestURI()`，**这个正确设置被架空** |
| `spring.mvc.pathmatch.matching-strategy` | 未配置 | `path_pattern_parser`（Boot 3 默认） | `/app-assets/**` 能被 `PathPatternParser` 正常匹配（实测编码中文名请求确实进了 MVC，见下方证据）；`**` 捕获段 Spring 有解码，**但没人读它** |
| `server.tomcat.connector.allowEncodedSlash` / `encodedSolidusHandling` | 未配置 | `reject`（Tomcat 默认） | 实测 `%2F` 编码斜杠 → **400**。与中文名无关，但说明连接器对 `%` 系列是有门禁的 |
| `relaxedPathChars` / `relaxedQueryChars` | **未配置** | 空 | 非 ASCII 字节不在 RFC 7230/3986 允许集内 → **连接器直接 400**（实测见下） |
| `server.tomcat.reject-illegal-header` | 未配置 | true | 本案未触发 |
| `addResourceHandlers` / `UrlPathHelper` / `WebDecoding` 定制 | **不存在** | — | 见第 1 节排除项。`WebConfig.java` 实现了 `addCorsMappings/addInterceptors/addFormatters`，**没有任何路径解析/解码定制** |

实测证据（同一中文文件 `apps/api/uploads/app-assets/assets/images/login-split/登录页_r01_c01.png`，命令与输出见第 5 节）：

1. **原样非 ASCII 字节 → `HTTP/1.1 400`，`Content-Type: text/html;charset=utf-8`，`Connection: close`，且响应头里**没有** `X-Trace-Id`**。
   `X-Trace-Id` 由 `apps/api/src/main/java/com/campuslove/api/config/TraceIdFilter.java` 注入（`:51` 常量、`:80` `response.setHeader(TRACE_ID_HEADER, traceId)`），且按该类 `:35` 的注释它排在 Spring Security 过滤器链**之前**执行 —— 所以「有 trace 头 = 已进 servlet 过滤器链」「无 trace 头 = 死在连接器」。实测 200/404/双重编码 400 三种响应都带这个头，唯独裸非 ASCII 的 400 不带（435 字节 Tomcat HTML）→ **这条请求连过滤器链都没进去，是 Tomcat 连接器按 RFC 7230/3986 字符集直接拒绝**。「谁拦的」的硬证据。
2. **UTF-8 百分号编码 → `404` + `application/json` + **有** `X-Trace-Id`**：进了 Spring，被应用层判 404。
3. **双重编码 `%25E7…` → `400` + `application/json`**（body 形如 `{"timestamp":...,"status":400,"error":"Bad Request","path":"/api/v1/media/app-assets/…%25E7%2599%25BB…"}`），与 1 的 Tomcat HTML 页不同一层：这条**过了连接器**，在 Spring 侧被拒（Spring Security 默认 `StrictHttpFirewall` 对 `%25` 的规则；见第 3 节）。
4. **大小写无关**：`…%E7%99%BB%E5%BD%95%E9%A1%B5_r01_c01.PNG` 同样 404，说明 404 不来自大小写差异（`Files.exists` 在 Windows 上本来就大小写不敏感），排除「扩展名大小写」这条假因。

## 3. 安全过滤器链与 404 的"真身"

**结论：过滤器链不背锅——它既没按字符集拦中文名，也不是 404 的作者。404 的真身是 `MediaAccessController.java:356-360` 的「注册表校验」分支，在磁盘查找（`MediaAccessService.java:179-182`）之前返回。这是靠活体后端日志实证出来的，不是靠猜。**

### 3.1 permitAll 是否受编码影响 → 否

- 规则：`apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java:175` `.requestMatchers("/api/v1/media/app-assets/**").permitAll()`，且声明在 `:180` `.requestMatchers("/api/v1/media/**").authenticated()` **之前**（顺序正确，注释 `:174` 已写明原因）。mock profile 同构：`MockSecurityConfig.java:77, 209`。
- Spring Security 6.3（Boot 3.3.1）的 `requestMatchers(String…)` 走 `PathPattern`/`AntPathRequestMatcher`，匹配的是**已解码**的 requestPath（`ServletRequestPathUtils`/`UrlPathHelper` 负责解码，字符集 = 默认 UTF-8）。因此 `%E7%99%BB…` 与 ASCII 一样命中 `**`。
- 硬证据：编码中文名请求的响应是 `404` + `application/json` + 带 `X-Trace-Id`，**不是 401/403** → 已越过 `permitAll` 进入 MVC。`JwtAuthenticationFilter.java:150, 153, 282-289` 的 `isPermitPath` 用的是 `getRequestURI()` + `AntPathMatcher`，但其 `PERMIT_PATHS`（`:57-60`，只有 `/ws/**` 与 `/api/v1/content-filter/check`）与媒体无关；媒体分支 `:165` 只是"允许带 ?token="，无 token 时 `:180-183` 直接放行。→ 过滤器链对中文名零影响。

### 3.2 过滤器链确实会按「编码形态」拦，但只拦畸形编码

`SecurityConfig.java` 内 grep `HttpFirewall|firewall|StrictHttp` → **0 命中**：项目**没有**自定义 `HttpFirewall`，因此 Spring Security 默认的 `StrictHttpFirewall` 全程生效。实测它的边界：

| 形态 | 状态 | 响应层证据 | 判定 |
|---|---|---|---|
| 原样非 ASCII 字节 | 400 | `text/html;charset=utf-8`、`Connection: close`、**无** `X-Trace-Id`、**无** 安全头 | Tomcat 连接器（进不了链） |
| `%25E7…`（双重编码） | 400 | `application/json` `{"timestamp":…,"path":"/api/v1/media/app-assets/…%25E7%2599%25BB…"}`（BasicErrorController 形状） | 链内拒绝（`StrictHttpFirewall` 的 `%25` 规则）；GlobalExceptionHandler **无** 400 日志 |
| `%2F`（编码斜杠） | 400 | 同上 | Tomcat `encodedSolidusHandling=reject` + 防火墙 |
| `%E7%99%BB…`（单次 UTF-8 编码） | **404** | 带 `X-Trace-Id` 的应用 JSON | 通过链，交给控制器 |

所以：链的字符集门禁**不是**中文名 404 的原因（单次编码正好是唯一能过链的形态），但它解释了「为什么前端也不能直接把中文原样发出去」。

### 3.3 404 的作者 = 注册表分支（实证）

`apps/api/logs/campus-love-api.log`（进程 PID 30324 的活体日志）中，我发起的每一次 404 探测都落在一行：

```
2026-09-25 01:26:20.575 [http-nio-8080-exec-4] WARN  c.c.a.config.GlobalExceptionHandler - 请求错误: 404 NOT_FOUND - 应用资产不存在或未启用
```

`"应用资产不存在或未启用"` 这个 reason 只出现在 **`MediaAccessController.java:358-359`**。磁盘未命中的 reason 是 `"文件不存在"`（`MediaAccessService.java:180-181`），该窗口内**一条都没有**。渲染链：`config/GlobalExceptionHandler.java:498-506`（`@ExceptionHandler(ResponseStatusException.class)` → `buildErrorResponse`，`:784-791`）。

⇒ 顺序确认：**注册表分支在前，磁盘分支在后，且中文名根本没机会走到磁盘分支**。
（顺带一个可诊断性缺陷：`buildErrorResponse` 把 reason 放进了 body 的 `message`，但实测响应 `message` 是空串 `{"error":"Error","message":"","status":404}`——只有日志里还有 reason。前端完全拿不到「未注册」vs「磁盘缺失」的区分。另外 `MediaAccessController.java:357` 用的是 `LOGGER.debug`、`MediaAccessService.java:179-182` 的 app-asset 磁盘分支**完全没有日志**，与用户媒体分支 `:136-139` 的 `warn` 不对称。）

代码侧的两个 404 门槛（`findByUrlAndType` 见 `repository/MediaAssetRepository.java:68`）都拿同一个**未解码**字符串做输入，所以「显式解码一次」能同时解开两层，见第 6 节。

## 4. 存储侧：`media_asset.url` 的形态与写入路径

**结论：库里存的是「解码后的原文中文」，一条百分号编码都没有（实测 `url LIKE '%\%%'` = 0 行）。所以 404 不是数据缺失，而是请求串与库串在编码维度上永不相等。此外库里还有一批 `?` 乱码历史行，是另一条独立的坑（不影响本结论）。**

> 查库方式说明（合规）：**没有猜凭据**。凭据来自仓库自带的 `.env:2-4`（`DB_URL=jdbc:mysql://127.0.0.1:3306/campus_love`、`DB_USERNAME=campus`、`DB_PASSWORD=…`）。运行时用 `MYSQL_PWD=$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)` 注入，口令不出现在命令行里；本机 MySQL 监听 127.0.0.1:3306（PID 6432，native，非 docker）。执行的语句**全部是 SELECT / SHOW CREATE**，无任何写入。原始结果：`.zcode/tmp/db-probe.txt`、`db-probe-2.txt`、`db-probe-3.txt`。

### 4.1 url 形态实测

```
mysql> SELECT (LENGTH(url)<>CHAR_LENGTH(url)) AS non_ascii, COUNT(*), SUM(audit_status='approved')
       FROM media_asset WHERE type='app_asset' GROUP BY non_ascii;
+-----------+------------+----------+
| non_ascii | rows_total | approved |
|         0 |       1424 |     1424 |
|         1 |        377 |      377 |     <- 377 行原文中文 url，全部 approved
+-----------+------------+----------+

mysql> SELECT COUNT(*) FROM media_asset WHERE type='app_asset' AND url LIKE '%\%%';  -> 0
```

针对被探测的那个文件，用**解码后的**完整 URL 精确匹配（`--default-character-set=utf8mb4`）：

```
SELECT id, audit_status FROM media_asset WHERE type='app_asset'
  AND url='/api/v1/media/app-assets/assets/images/login-split/登录页_r01_c01.png';
+------+--------------+
| 1409 | approved     |          <- 注册存在且已审核通过
```

⇒ 只要服务端把 `%E7%99%BB%E5%BD%95%E9%A1%B5_r01_c01.png` 解成原文，注册表这一枪必中；磁盘上同名文件也确实存在（`apps/api/uploads/app-assets/assets/images/login-split/登录页_r01_c01.png`）。**两层都只差一次 decode。**

各 split 批次逐目录对账（`.zcode/tmp/db-probe.txt`；非 ASCII 行数 == 磁盘文件数）：

| 目录 | 磁盘文件数 | 其中中文名 | 库里原文中文行 | 库里 `?` 乱码行 |
|---|---|---|---|---|
| home-split | 22 | 0（全 ASCII） | 0 | 0 |
| login-split | 52 | 52 | 52 | 52 |
| match-split | 71 | 71 | 71 | 71 |
| messages-split | 114 | 114 | 114 | 114 |
| profile-other1-split | 65 | 65 | 65 | 65 |
| profile-other2-split | 39 | 39 | 39 | 39 |
| profile-self-split | 29 | 29 | 29 | 29 |

`?` 乱码行实测就是字面量 0x3F（不是客户端显示问题）：
`SELECT HEX(RIGHT(url,12)) … WHERE id IN (269,1409)` → `269: 3F7230315F6330312E706E67`（`?r01_c01.png`）vs `1409: 5F7230315F6330312E706E67`（`_r01_c01.png`）。全库共 **370 行 url 含字面 `?`**（`url LIKE '%?%'`）；而 `url LIKE '%/app-assets/assets/images/login-split/%E%'` = 0，排除「库里另有编码形态的行」。

### 4.2 写入路径：无 slug、无转码、无百分号编码

- 播种脚本 `apps/api/scripts/seed-app-assets.ps1`：`:171` `$rel = $full.Substring($prefix.Length).Replace('\','/')`（原样保留中文文件名）→ `:196` `$url = '/api/v1/media/app-assets/' + $rel` → `:199-201` 拼 `INSERT … WHERE NOT EXISTS (… WHERE url = '$urlSql')`。产物 `apps/api/scripts/output/app-assets-seed.sql` 里就是裸中文 url（如第 200 行 `'/api/v1/media/app-assets/assets/icons/home/buttons-badges/图标预览_联系表.png'`），该文件含 784 处 `split`；`app-assets-seed-full.sql` 含 0 处 `split` —— 两代播种各跑过一次，正好解释「同一文件两条 url 行」的双行现象与 370 条死行。
- 脚本自身执行 SQL 时**是**带字符集声明的（`:230`、`:249` `"--default-character-set=utf8mb4"`），所以那 370 条 `?` 死行来自脚本外的一次手工/管道导入（`mysql < file` 未带该参数）。
- **真实用户上传路径早已是 ASCII**：`LocalMediaStorageService.java:298-300`「存储文件名使用 UUID，不依赖原始文件名」+ `:308` `url = URL_PREFIX + relativePath` ⇒ 用户媒体 URL 天然纯 ASCII（`sanitizeFileName` `:701-713` 也只清洗穿越字符，不管字符集）。违反 ASCII 约定的**只有 app-assets 播种这一条路**。
- 前端引用形态：`apps/client/src/config/images.ts:673-…` 存的是**裸中文字符串**（如 `'/static/assets/images/login-split/登录页_r01_c01.png'`，real 构建下 `:33,37` 的 `STATIC_BASE` 换成后端基址），源码里既没有 `encodeURI` 也没有 slug。

## 5. 最小实验：同一目录前缀的四种编码形态状态码矩阵

**结论：没有任何一种客户端形态能让中文名拿到 200；而同一批次目录下的 ASCII 兄弟文件在所有形态下都是 200。锅定在服务端「把 URI 段当磁盘名」这一步。**

脚本：`.zcode/tmp/enc-matrix.mjs`（node 16，`node .zcode/tmp/enc-matrix.mjs`）；逐条输出：`.zcode/tmp/enc-matrix.txt`（98 行，含完整 URL）。
另外三组 curl 取证：`.zcode/tmp/enc-probe-1.txt`、`enc-probe-2.txt`、`enc-probe-3.txt`、`enc-probe-4.txt`。日志取证：`.zcode/tmp/loggrep.txt`、`loggrep2.txt`。

```bash
# 核心矩阵（对 6 个中文批次目录各取前 4 个真实存在的文件 + 2 个 ASCII 批次）
node .zcode/tmp/enc-matrix.mjs
#   -> code histogram: { '200': 25, '400': 24, '404': 49 }
# curl 侧的「原样非 ASCII 字节」对照（Node 客户端会自己先编码，所以必须用 curl 才能真发出裸字节）
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://127.0.0.1:8080/api/v1/media/app-assets/assets/images/login-split/登录页_r01_c01.png"
#   -> 400
```

### 5.1 矩阵（实测，节选）

| 形态 | 中文名（真实存在、且库里已注册 approved） | ASCII 兄弟（`home-split/circle`、`home-split/toolbar`，同 server 同目录层级） |
|---|---|---|
| **(a) 单次 UTF-8 百分号编码**（`encodeURIComponent` / 浏览器 / 微信 / Node 实际发出的形态） | **404** ×24 | 200（编码恒等） |
| **(b) 双重编码** `%25E7%2599%25BB…` | **400** ×24（JSON，链内拒绝） | 200（无 `%` 可再逃，恒等） |
| **(c) 原样非 ASCII 裸字节**（curl 真发裸字节） | **400**（Tomcat HTML，链前） | 200 |
| **(c′) 同 (c) 但由 Node/浏览器代发**（客户端自动百分号化） | **404**（退化成 (a)） | 200 |
| **(d) ASCII 兄弟对照** | — | **200 ×24 + 1 control** |
| 对照：ASCII 名但磁盘没有（`__absent__.png`） | — | **404** |

代表行（`enc-matrix.txt` 原文）：

```
[login-split] a) encodeURI-UTF8  登录页_r01_c01.png  404  …/login-split/%E7%99%BB%E5%BD%95%E9%A1%B5_r01_c01.png
[login-split] b) double-encoded  登录页_r01_c01.png  400  …/login-split/%25E7%2599%25BB%25E5%25BD%2595%25E9%25A1%25B5_r01_c01.png
[login-split] c) raw-non-ASCII   登录页_r01_c01.png  404  …/login-split/登录页_r01_c01.png   (Node 已自动编码；curl 裸字节 -> 400)
[profile-self-split] a) encodeURI-UTF8  主页_个人_r01_c01.png  404  …/%E4%B8%BB%E9%A1%B5_%E4%B8%AA%E4%BA%BA_r01_c01.png
[home-split/circle] c) raw-non-ASCII  toolbar_row7_04.png  200   …/home-split/toolbar/toolbar_row7_04.png
[control   ASCII absent    ]  404  …/home-split/circle/__absent__.png
```

6 个中文批次目录（login/messages/match/profile-self/profile-other1/profile-other2）逐一复现，形态完全一致 —— 与调用方「370 条中文名全 404、可达 62 条零中文」的实测吻合。

### 5.2 与预设判据的差别（重要，别糊过去）

预设是「四种形态全 404 而 ASCII 兄弟 200 ⇒ 锅在服务端解码/查找层」。实测更严格一点：

1. **(b)(c) 不是 404 而是 400**，且两个 400 来自不同层（(c) = Tomcat 连接器、无 `X-Trace-Id`；(b) = 链内 `StrictHttpFirewall` 对 `%25` 的规则、有 `X-Trace-Id` + BasicErrorController JSON）。见第 2/3 节。
2. 唯一「合法」的客户端形态 (a) 拿到 404 —— **服务端解码/查找层就是断点**，判定成立。
3. 并且 404 的 reason 由活体日志证明是**注册表分支**（`应用资产不存在或未启用`），磁盘分支一次都没跑到（`loggrep.txt`）。
4. **反向对照实验（离线、只读）**：第 4.1 节用解码后的原文 URL 精确查库命中 `id=1409 approved`。所以「解码一次」这两道门（注册表 + 磁盘）会同时打开，不需要动数据、不需要动文件。
5. 附带的客户端事实：`images.ts:673+` 存的是裸中文字符串，**微信侧必然替我们百分号编码**（退化成 (a)）→ 现网表现就是静默 404 + 图片位空白，而不是 400。

### 5.3 顺带排除的两条假因

- **不是「批次没注册」**：`home-split` 的 ASCII 兄弟 200，同目录层级的中文名 404；库里 split 批次注册行齐备（4.1 表）。
- **不是「磁盘编码/文件名 NFC-NFD」**：ASCII 兄弟全部命中，说明目录层级与 `storageRoot`（`application.yml` 的 `app.media.storage-root`，`apps/api/uploads`）解析正确，差异只在文件名的 `%XX` 是否被还原。

## 6. 结论与最小安全修法候选

**一句话根因：`MediaAccessController.extractAppAssetSubPath()` 用未解码的 `request.getRequestURI()` 字符串直接当注册表主键和磁盘文件名用，全链路零次 URL 解码。** 客户端（微信/浏览器/Node）一定会把裸中文百分号化，Tomcat 又拒绝裸非 ASCII 字节，于是唯一能进应用的形态 `%E7%99%BB…` 在两道门上同时落空，且**先死在注册表门**（`MediaAccessController.java:356-360`，日志 reason 实证）。

### 候选清单（按代价从低到高）

| ID | 做法 | 改动点 | 对已上线 62 条 ASCII 素材 | 需重启后端 | 需数据迁移 | 需小程序发版（提审） |
|---|---|---|---|---|---|---|
| **A（推荐）** | 控制器**显式解码一次**：`extractAppAssetSubPath` 的返回值改 `UriUtils.decode(sub, StandardCharsets.UTF_8)` | `MediaAccessController.java:527-537`（一处，约 3 行） | **零影响**（无 `%` 时 decode 恒等；ASCII 路径逐字节不变） | **是**（Java 源码变更，无法热加载） | **不需要**（库里已是原文中文，4.1 已证 `id=1409 approved` 精确命中） | **不需要**（前端 `images.ts` 的裸中文串正好就是被解码的目标） |
| B | 只把注册表匹配改为解码后比对 | `MediaAccessController.java:350` | 零影响 | 是 | 否 | 否 |
| | ↳ 判定：**不成立**。磁盘层（`MediaAccessService.java:169-182`）仍拿未解码串，中文名继续 404，只是换了个 reason 文案。B 只是 A 的子集 | | | | | |
| **C** | 播种时**强制 ASCII slug**（重命名 366 个中文文件 + 重播种 + `images.ts` 370 条引用改写） | `seed-app-assets.ps1:171,196` + `apps/client/src/config/images.ts:673+` + `uploads/app-assets/**` 落盘文件 | 62 条不动，但**中文名素材的 URL 全部换血** | 否（纯数据/文件/前端） | **是**（377 行 url 改写 + 唯一索引 `uk_media_asset_url` 冲突需先清 370 条 `?` 死行；迁移前先备份） | **是**（引用在包内，必须发版） |
| | ↳ 与既有约定一致（真实用户上传早已 UUID：`LocalMediaStorageService.java:298-300,308`），长期最干净，但一次动 3 处且要发版 | | | | | |
| **D** | 改查询参数传 key：`GET /api/v1/media/app-assets?key=<rel>`，`@RequestParam` 由 Spring 按 UTF-8 自动解码 | `MediaAccessController.java:333-370` 新增分支 + `images.ts` 全站基址改写 | 需**保留** `/app-assets/**` 兼容分支，否则 62 条 URL 失效 | 是 | 仍要（`media_asset.url` 是注册主键、也是后台审核列表展示值，改协议就得双写或迁移） | 是 |
| | ↳ 收益不抵代价，且把"注册主键=可访问 URL"这个不变量拆成两份，**不建议** | | | | | |

### 为什么是 A

1. **一处改动同时打开两道门**（注册表 + 磁盘），因为它们吃的是同一个入参。
2. **零迁移、零发版**：现网小程序发出的就是百分号化 URL，服务端解开即可；`max-age=86400` 的公开缓存（`MediaAccessController.java:85, 366-368`）也不会被污染（缓存键含路径，URL 形态未变）。
3. 顺序安全天然成立：decode 在 controller、`validateSubPath` 在 service（`MediaAccessService.java:166`），**先解码后校验**，`%2e%2e%2f` 会被还原成 `../` 再被 `:264` 拒掉。⚠️ 反过来写（先校验后解码）就是路径穿越面，务必保持这个先后。
4. **用 `UriUtils.decode` 而不是 `URLDecoder.decode`**：后者把 `+` 解成空格，会静默改坏含 `+` 的文件名——这个坑团队已在别处踩过并留了注释（`chat/VoiceMessageController.java:128`）。`UriUtils.decode` 保留 `+` 语义。
5. 只给 app-assets 分支加，不顺手改 `extractSubPath`（用户媒体是 UUID，改了无收益、扩大回归面）。
6. mock profile（无 `MediaAssetRepository`，`MediaAccessController.java:134-135, 349`）会跳过注册表门，此前中文名照样死在磁盘门；A 之后 mock/real 行为一致。

### 配套（不属于本 bug，但同一次改动里顺手做掉最划算）

- 可诊断性：`MediaAccessService.java:179-182` 的 app-asset 磁盘 404 分支**完全没有日志**（用户媒体分支 `:136-139` 有 `warn`），`MediaAccessController.java:357` 用的是 `debug`（现网 INFO 级看不见）。建议对齐成 `warn` 并带上 `subPath`，否则下次还是只能靠猜。
- 错误体 `message` 实测被抹成空串（`{"error":"Error","message":"","status":404}`），只有 `GlobalExceptionHandler.java:501` 的日志里有 reason —— 前端与巡检脚本拿不到"未注册 vs 磁盘缺失"的区分。
- 数据清理：370 条 url 含字面 `?` 的死行（`?` = 0x3F，`HEX` 已证）应清理，清理前按仓库惯例先备份。
- 回归：`apps/api/src/test/java/com/campuslove/api/media/MediaAccessControllerTest.java` 补一条「中文文件名 + 百分号编码 → 200」的用例。
- 门禁：素材命名规范（`doc/素材资产管理规范.md`）应显式要求 app-assets 文件名 ASCII，避免继续新增（这是 C 的长期价值所在）。

### 修复后的验收口径

重跑 `.zcode/tmp/enc-matrix.mjs`：期望形态 (a) 由 `404 → 200`（24 条中文全绿），(b)(c) 仍为 `400`（不应改变），ASCII 兄弟仍全 `200`；调用方那 455 条引用逐个探测的可达数应从 62 显著上升（+370 量级），剩余失败应只剩"磁盘根本没有文件"那 9 条 + 未注册/驳回类。

---

### 附：本次取证产物（只读，未改动任何代码/数据）

| 文件 | 内容 |
|---|---|
| `.zcode/tmp/enc-matrix.mjs` / `enc-matrix.txt` | 98 行状态码矩阵（脚本 + 输出） |
| `.zcode/tmp/enc-probe-1.txt` … `enc-probe-4.txt` | curl 侧形态对照、响应头、400/404 响应体 |
| `.zcode/tmp/db-probe.txt` / `db-probe-2.txt` / `db-probe-3.txt` | `media_asset.url` 字符集统计、`HEX` 取证、解码后精确命中 `id=1409` |
| `.zcode/tmp/loggrep.txt` / `loggrep2.txt` | 活体日志中 404 reason 归属（注册表分支）、窗口内无 400 日志 |

进程侧未做任何操作：后端仍是 PID 30324（127.0.0.1:8080）原进程，MySQL 仍是 PID 6432，未重启、未新建进程、未跑构建。
