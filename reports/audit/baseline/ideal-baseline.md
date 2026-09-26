# Target UI Baseline（理想图基准 · ideal-baseline）

> 生成：2026-09-22（第 3 次修订，同日第 2 次全量复核）｜ 维护：理想图基准员（动态工作流）｜ 取代同日早版（其 §0 中「docs/ 未提交删除、`git checkout -- docs` 可还原」的表述已过时，见 §0）
> 定位：把散落在 `素材/`、`素材/全站素材补齐-0912_assets/`、`素材/寻觅注册页-素材_assets/`、`截图存档/`、`doc/`、`specs/`、`reports/audit/`（含 git 历史中的 `docs/`）的设计稿/参考图/规范，**按页面路由**收敛为统一的理想目标基准。**理想图 = 最终构建目标（build target），不是"仅供参考"。**
> 方法：只读素材盘点 + 写入本文件；未改任何代码。本轮所有引用均经 `ls`/`find`/`wc`/`git show`/`git log` 实测。
> 路由真相源：`apps/client/src/pages.json`（实测 `grep -c '"path"'` = **73** 条路由、`'"root"'` = **13** 个分包；主包 8 页 `:43-67`；TabBar 配置注释 `:7-17` 自述唯一真相源为 `src/config/navigation.ts`，与 pages.json `tabBar.list` 手动同步）。另实测 `apps/client/src/config/navigation.ts` 与 `apps/client/src/config/people-role.ts` 均在磁盘。

---

## 0. 本轮复核发现（相对同日早版的修正，2026-09-22 晚）

本轮对上一版基线引用逐条做了磁盘/历史存在性核验（`ls`、`find`、`wc -l`、`git status --porcelain`、`git log`、`git show` 实跑），变化与修正如下：

1. **`docs/` 的删除已随 HEAD 提交 `aefd8a72` 落库，不再是"磁盘已删未提交"状态**。实测：`git status --porcelain` 现仅 40 M + 10 ??，**零删除记录**；`git ls-tree HEAD --name-only` 中无 `docs/`；`git show aefd8a72 --stat | grep -c '^ docs/'` = **81**（含 `docs/design/*` 七份规范）。因此：
   - 上一版写的还原命令 `git checkout -- docs 报告 反馈媒体` **已失效**（索引/HEAD 中已无此树）。现恢复命令为 **`git checkout 29a2b1df -- docs`**（`29a2b1df` = `aefd8a72` 的父提交）。
   - 六份规范本轮逐一实测可从父提交读取（`git show 29a2b1df:<path>` 全部 OK）：`docs/design/v3.1-contract.md`（实读头部确认内容完好）、`docs/design/xunmi-match-design.md`、`docs/design/message-v3-spec.md`、`docs/design/profile-product-logic.md`、`docs/design/people-fixture.json`、`docs/profile-design-spec.md`、`docs/design/v3.1-后台对齐与参考图生成.md`。本基准统一标注「**29a2b1df-only**」——引用时必须写 `git show 29a2b1df:<路径>`，不得当作磁盘文件直接打开。
   - `archive/design/` 下只有更早的 design-system 归档（DESIGN-SPEC.md、组件 Vue、preview HTML），**不含**上述 v3 系规范；`目录整理说明.md:196` 仍写着"252 个文件磁盘已删未提交"，该描述已过时（删除已提交、`报告/` 已还原、`反馈媒体/` 已彻底移除）。
2. **`反馈媒体/` 已彻底移出仓库**（磁盘 `ls` 为空、HEAD 树无此目录）。`报告/` 已还原在磁盘：`报告/像素级对比还原报告.md` 实测 **663 行**（`wc -l`），四页逐元素结构表 §页面1 `:9` / §页面2 `:144` / §页面3 `:277` / §页面4 `:439`、全局 `:588` 可直接引用。
3. **新增 R13 轮理想图对照（2026-09-22，晚于上一版基线，`reports/audit/2026-09-22-r13-goal/`）**，显著改变"当前实现 vs 理想图"的判定状态：
   - `design-parity-findings.md`：以 `素材/理想效果图/` 19 张为唯一页面级对照依据，对 DevTools 实拍（`shots/` 实测 20 个文件 = 16 张页面截图 + 4 张启动过程图）逐页比对，判定首页/附近/寻觅/消息/村庄广场/帖子详情/兴趣圈列表/圈主页/校园圈/聊天会话等存在**布局级偏差**（逐条含理想/实拍/待改文件，§2.1-2.5）；登录页与匹配成功页**实拍错位无法判定**（`01-pages-login-index.png` 与 `05`、`16` 三图内容相同，§0）。
   - `R13-ACCEPTANCE.md` §7（`:173-182`）对该报告裁决：**6 条成立并已修**（消息单卡通栏、寻觅距离/在线胶囊配色反转、兴趣圈 banner i18n key、非激活 chip 同色不可见、circle-home 空容器、Avatar 裸绑 src）；**匹配度绿色环形成立但未修**——且现成 `components/common/XunmiMatchRing.vue` 不可直接接入（`conic-gradient` 在 mp-weixin 内联样式不稳 + `--ring-pct` 从未绑定会渲染空灰环，正确做法是 SVG `stroke-dasharray` 圆环）；**校园圈「去认证×2」判定有误**（实为两处「已认证」）；「约」前缀与统计省略号**不该改**（诚实标注/防孤字折行）。总评："该报告适合当**线索清单**，不适合当工单直接执行"。
   - 结论：**R11「12 组核心页全部通过」（`reports/audit/r11-acceptance/ideal-comparison.md:5`）只是 2026-09-19 构建的历史结论；R13 实测表明当前构建相对理想图存在多处回归/漂移**。逐页理想目标不变（本基准 §3），但"已达标"不再可作为免检依据，逐页对照状态见 §3 表「对照状态」列。
4. **`素材/参考图/拆分图标_参考_*`（9 目录）不能作为页面级对照依据**：R13 经 manifest 核对其内容全部为 26×26 ~ 356×35 的图标/按钮裁切件，不含整页版式（design-parity-findings.md 头部）。页面级对照一律以 `素材/理想效果图/*.png` 为准；该批目录仅可作图标源。
5. **工作树现状**：40 个已修改文件未提交（与 R13 修复对应的改动，含 `stores/messages.ts`、`components/match/MatchCard.vue`、`pages/messages/index.vue` 等）；R13 §8.4 记录 `prepare-static --real` 曾移走 1175 个 `apps/client/src/static/` 跟踪文件待 `git checkout -- apps/client/src/static/` 还原。本基准只锁"理想目标"，不锁定工作树中间态。
6. 其余存量引用全部复核通过（实测命令与数值）：`素材/理想效果图/` = **19 张**；`素材/全站素材补齐-0912_assets/` = **18 张**（`ls | wc -l`，与 `.miora` 清单吻合，含 `edf8c3ef` 校园圈封面与 `de040f51` person-12）；`素材/寻觅注册页-素材_assets/` = **4 张**；`素材/组件库/理想效果图-svg拆分/` = **118 个 SVG**（`find -name '*.svg' | wc -l`）；`reports/screenshots/r11-ideal/` = **15 张 cur-*.png**；`截图存档/2026-08-08-2/admin/` = **32 张**；吉祥物运行态 `apps/api/uploads/app-assets/assets/images/mascot/` 实测 `mascot_heart.png` 37550 / `mascot_shy.png` 36077 / `mascot_wave.png` 34423 / `mascot_cheer.png` 43541 字节（2026-09-04 版，`.bak-20260904` 为旧版勿引用）。

---

## 1. 参考优先级与冲突消解

同一页面存在多份参考时，按以下顺序取理想结构（上层覆盖下层）：

| 级 | 来源 | 说明 |
|---|---|---|
| P1 | `素材/理想效果图/*.png`（19 张，实点） | 最高目标，唯一页面级对照依据（R13 头部重申）。19 张文件名清单见 §3/§6 逐页行 |
| P2 | 页面级设计大图 + 拆分图标 | `素材/首页/最终/`、`素材/主页/最终/`、`素材/消息/最终/`、`素材/匹配/最终/`、`素材/附近/*/`、`素材/登录页/`、`素材/注册/个人资料填写/`（索引：`素材/图标素材总索引.txt`，实读：首页 65 图标 7 分类 / 登录 52 / 匹配 70 / 消息 114 / 主页个人 28 / 他人 64+38 / 附近首页 82 / 兴趣圈 71 / 圈子详情 118 / 帖子 68 / 校园圈 95）。**注意 §0 第 4 条**：`素材/参考图/拆分图标_参考_*` 仅图标源 |
| P3 | 结构/规格文档 | `报告/像素级对比还原报告.md`（四页逐元素结构表 `:9/:144/:277/:439`，全局 `:588`）；29a2b1df-only：`docs/design/v3.1-contract.md`（16 页逐页契约表 §19 + Token 冻结）、`docs/design/xunmi-match-design.md`（纯匹配版唯一视觉依据）、`docs/design/message-v3-spec.md`、`docs/profile-design-spec.md`、`docs/design/profile-product-logic.md`；`素材/注册/个人资料填写/流程/DEV_PAGE_MAP.md` 与 `01-注册登录/DEV_PAGE_MAP-流程基准.md`（实点） |
| P4 | 参考图生成提示词 | 29a2b1df-only `docs/design/v3.1-后台对齐与参考图生成.md` §三（`git show 29a2b1df:docs/design/v3.1-后台对齐与参考图生成.md`），兜底无理想图锚点的页面 |
| P5 | 实拍回归基线 | `reports/screenshots/r11-ideal/`（15 张，实点）、`reports/audit/2026-09-22-r13-goal/shots/`（16 张页面实拍 + 4 过程图，实点）、`截图存档/2026-08-16-mp-p0/`（9 张）、`reports/audit/r11-acceptance/screenshot-matrix.md`（72 路由 × 2 身份） |

冲突消解总规则：
- Token/组件/文案冲突以 29a2b1df-only `docs/design/xunmi-match-design.md`（v2 Token：brand `#34C38F` / pink `#FF5D9E` / blue `#4D8DFF` / page `#F7FAF9` / text `#222222`）→ `docs/design/v3.1-contract.md`（v3.1 冻结 Token：Primary `#34C98A` / Love `#FF6FA3` / Whisper `#4D8DFF`，Hero 渐变 `#34C98A→#B8EFD9`）为最终裁决；两者未覆盖处回退 `素材/匹配/寻觅1/DESIGN_GUIDE.md`（实点）。`素材/组件库/理想效果图-改造指南.md`（实读）另载 v3.0 理想值：主色 `#36C99A`、心动粉 `#FF6B81`、卡片圆角 20px、底导航高 ~64px——与 v3.1 冻结 Token 不一致时**以冻结契约为准**，改造指南仅作历史迁移说明。
- 页面**结构**（模块顺序/信息层级/交互位置）以 P1 理想图为准；颜色/微细节不作门槛（R11 方法，`ideal-comparison.md:4`）。
- 文案红线（v3.1-contract）：单向喜欢恒为「已送出心动」、互喜恒为「匹配成功」。
- 素材入库/变更必须走 `doc/素材资产管理规范.md`（实点）三处同步 SOP（src/static ↔ static-local-backup ↔ api/uploads + media_asset 注册）。
- 命名注意：v2 文档把 `pages/home/index` 称作「发现」Tab，现行 TabBar 文案为「首页」——同一路由，非两个页面。

---

## 2. 全局基准（page = `*`）

| 基准 | 路径 | 要点 |
|---|---|---|
| 品牌视觉总谱 | `素材/参考图/寻觅品牌视觉设计系统图谱.png`（实点） | 全站色彩/字体/图形语言总纲；R13 亦引 `素材/参考图/` 顶层展板（品牌 token/组件规范）为辅助 |
| 视觉依据 v2（29a2b1df-only） | `git show 29a2b1df:docs/design/xunmi-match-design.md` | 绿=认识/品牌、粉=心动/关系、蓝=互动/消息；五 Tab 中央寻觅凸起浮岛；SVG 只做图标/壳，禁止整页 SVG；照片/姓名/标签/匹配率必须动态渲染 |
| 冻结契约 v3.1（29a2b1df-only） | `git show 29a2b1df:docs/design/v3.1-contract.md`（头部实读确认完好） | Hero 节奏红线：仅 匹配中心=绿 Hero、匹配成功=粉 Hero、我的=极浅绿区，发现/附近/消息白底；大卡 4:5 信息位顺序（照片→姓名/年龄/认证→学校·距离→兴趣标签→一句话→匹配度）；他人主页 CTA 状态机（陌生=喜欢 TA 粉 / 互喜=发消息 绿）；§19 逐页契约表 |
| 消息 V3 契约（29a2b1df-only） | `git show 29a2b1df:docs/design/message-v3-spec.md` | 消息页板块顺序：有升温「正在升温→今日心动→寻觅助手→最近聊天」/无升温「今日心动→推荐认识的人→寻觅助手→最近聊天」；关系四态标签：刚认识 `#8A9694` / 聊天中 `#3CC99A` / 暧昧中 `#FF6891` / 互相关注 `#3CC99A`；空态不空屏 |
| SVG 主库 | `素材/组件库/理想效果图-svg拆分/`（实测 **118 个 SVG**，14 分类目录）+ `素材/组件库/理想效果图-改造指南.md`（实读） | 理想效果图 SVG 拆分主库；缺口按 `素材/SVG素材核查与补充报告.md`（实点）补 |
| 图标总索引 | `素材/图标素材总索引.txt`（全文实读） | 22 个拆分目录 + 各页来源大图对照表（每目录含 manifest.json / 图标清单.txt / 图标预览_联系表.png） |
| 吉祥物 | `素材/吉祥物/xunmi_mascot_design_system_v2/` + `素材/吉祥物/吉祥物使用指南.md`（实点）；运行态真相源 `apps/api/uploads/app-assets/assets/images/mascot/`（字节数见 §0 第 6 条） | 寻觅芽 IP；空态/引导/气泡默认用它 |
| 人物照片冻结 | `apps/client/src/config/people-role.ts`（实点，9 人素材角色表）+ 29a2b1df-only `docs/design/people-fixture.json` + `素材/人物/`（9 张人像，实点） | person-01…09 固定映射；同一角色跨页面必须用同一组图片字段 |
| 资产 SOP | `doc/素材资产管理规范.md`（实点） | 静态图三处同步 + AI 生成图裁水印 + media_asset 注册 |
| 像素级结构表 | `报告/像素级对比还原报告.md`（663 行，实点） | 四页逐元素「理想 vs 实现」结构表 + 全局共性问题 `:588` + 优先级 `:635` |
| 流程基准 | `素材/注册/个人资料填写/流程/DEV_PAGE_MAP.md`（实点，同目录含 2 张流程 SVG）+ `01-注册登录/DEV_PAGE_MAP-流程基准.md`（实点，同目录含 `参考-注册页面.png`） | 实名必须（阻塞核心入口）、学生/人脸可选不阻塞；实名成功立即解锁首页/附近/匹配/消息；公开页面只显示徽章不泄露实名/学号/生物数据 |
| 后台令牌 | `doc/design-tokens-admin.md`（实点） | 后台主色 `#0064E0` 仅主操作/激活态；画布 `#F1F4F7`/卡 `#FFFFFF`/文字三级/描边 `#DEE3EA`；语义色 `#31A24C/#F2A918/#E41E3F`；侧边栏 220px + 顶栏 56px + 内容 24px；圆角 6-10px |
| 后台蓝图 | `doc/后台设计方案总览.md`（13 Frame）、`doc/后台功能模块清单.md`（12 一级/75 二级）、`doc/后台RBAC三级圈层规格.md`、`doc/后台设计决策说明.md`（实点） | Dashboard/用户管理/用户详情/内容审核工作台（三栏）/内容管理/商业化会员/系统设置 RBAC/风控举报/客服工单 等 |
| 后台实拍基线 | `截图存档/2026-08-08-2/admin/`（实测 32 张：01-dashboard…32-official-accounts）、`截图存档/2026-08-07/admin/`（00-login 起，实点） | 现行后台各页实拍基准 |
| 客户端实拍基线 | `reports/screenshots/r11-ideal/`（实测 15 张 cur-*.png）+ `reports/audit/2026-09-22-r13-goal/shots/`（16 张页面实拍）+ `截图存档/2026-08-16-mp-p0/`（9 张） | 最新回归对照起点取 r11-ideal + R13 shots；R13 shots 含错位图（§0 第 3 条），使用前先甄别 |

---

## 3. 逐页理想基准（客户端）

> 「对照状态」列 = 最近一次理想图 vs 实拍的判定：R11（`reports/audit/r11-acceptance/ideal-comparison.md`，2026-09-19，L1-L4）为历史结论；R13（`reports/audit/2026-09-22-r13-goal/design-parity-findings.md`，2026-09-22）为最新实测。**以 R13 为当前状态准绳**；R13 已修项以 R13-ACCEPTANCE §7 为准。
> 结构要点摘自理想图 + `报告/像素级对比还原报告.md` + v3.1-contract §19（29a2b1df-only）。

### 3.1 主包页面

| 页面路由 | 理想图（P1） | 补充素材/规范 | 理想结构要点（主视觉→内容顺序→CTA→导航→状态） | 对照状态 |
|---|---|---|---|---|
| `pages/login/index` | `素材/理想效果图/登录页.png` | `素材/登录页/ChatGPT Image 2026年8月17日 23_44_12.png`（拆分 52 图标）、`素材/登录页/xunmi_login_svg_path_assets/`、`素材/组件库/理想效果图-改造指南.md`（登录段）、29a2b1df-only v3.1-后台对齐 §三 登录/引导 | 校园情侣插画 hero 占上部主体 + Logo「寻觅」+ slogan；CTA 顺序：微信一键登录（绿主钮）→ 手机号登录（次钮）→ 临时看看/先逛逛 → 协议勾选行（年满 18 + 用户协议/隐私政策）；漂浮爱心装饰；未登录态用价值说明不用「禁止访问」 | R11 ✅（`ideal-comparison.md:15`）；R13 实拍错位无法判定（findings §0，`01/05/16` 三图相同）——**需重拍复核** |
| `pages/register/index` | `素材/寻觅注册页-素材_assets/b5163cb0-miora_text_to_image-1789186272177-0-dd3e85895457.jpg`（reg-hero 注册页顶部主插图，源清单 `素材/寻觅注册页-素材.miora`） | 同目录 `fa78925c…jpg`（reg-bg 背景氛围）、`700fa92a…jpg`（reg-decor 装饰总览）、`素材/注册/个人资料填写/01-注册登录/参考-注册页面.png`（实点）、`素材/注册/个人资料填写/ChatGPT Image 2026年8月26日 00_02_43.png`、`流程/DEV_PAGE_MAP.md` | 顶部情侣插画 + 氛围背景 + 装饰元素；步骤式资料填写，实名必须、学生/人脸可跳过；注册阶段兴趣可跳过（v3.1-contract §14） | R13：无整页理想稿，仅素材包（findings §1 注册行）；实拍 `02-pages-register-index.png` 留档 |
| `pages/register/success` | `素材/寻觅注册页-素材_assets/69340cfc-miora_text_to_image-1789186341708-0-8c365c88ce83.jpg`（reg-success 注册成功插图） | 同上 DEV_PAGE_MAP（实名成功→立即解锁首页/附近/匹配/消息） | 注册成功插图 + 引导进入主流程；成功页即解锁点 | 截图覆盖（r11 matrix A/B 身份 ok） |
| `pages/home/index` | `素材/理想效果图/首页.png` | `素材/首页/最终/ChatGPT Image 2026年8月17日 23_31_35.png`（65 图标/7 分类）+ `素材/首页/最终/拆分图标-精修版/` + manifest/README、`素材/首页/1.0/DESIGN_GUIDE.md`（实点）、`报告/像素级对比还原报告.md` §页面2（`:144`）、29a2b1df-only v3.1-后台对齐 §三 首页 | 白底；顶部「首页 + 发现今天值得遇见的人 + 位置白胶囊/通知铃铛」→ 今日推荐卡（图左文右：竖版照片+在线标+**92% 合拍度粉圆完整落在照片内右下**、姓名/年龄/学校、兴趣标签、签名、**4 缩略图一行**；CTA 看看TA + ❤喜欢）→ 今日恋爱进度 4 卡（彩底圆图标+状态词，**无说明行**；第 3 卡橙色「1 条待处理」）→ 关系动态 4 格（**图标与数字同行**→标签→3 头像堆，横排矮卡）→ 兴趣推荐 + 附近的人 双栏 → 社区动态 Feed → 邀请好友横幅（粉渐变+去邀请）；底部五 Tab（寻觅中央浮岛）；空态/骨架/错误重试 | R11 ✅（`:9`）；**R13 明显偏差 5 项**（findings §2.1：头部多本人头像、缺 4 图缩略行、合拍度徽章压文案、关系动态改竖排、进度卡多说明行）——**待修** |
| `pages/nearby/index` | `素材/理想效果图/附近的首页.png` | `素材/附近/附近首页/ChatGPT Image 2026年8月17日 23_59_47.png`（82 图标）、`素材/SVG素材核查与补充报告.md` §2.6、29a2b1df-only v3.1-后台对齐 §三 附近 | 顶部「附近 + 定位小字，右侧**放大镜图标** + 绿色发动态胶囊（无整行搜索框）」→ 分段 Tab（默认附近的人）→ 附近的人入口卡 → **热门兴趣圈 4 张竖版大海报卡**（约 170×290px，底部深渐变+白字）→ **校园圈 4 联竖版封面卡**（校名+同学数+已加入/去认证 chip）→ 5 宫格入口（附近的人/兴趣圈/校园圈/活动/我的人脉）→ 附近动态帖子卡 + 绿色 ➕ FAB；底部五 Tab | R11 ✅（`:10`）；**R13 明显偏差**（findings §2.2：整行搜索框、兴趣圈卡 150×200rpx 仅理想 1/2、校园圈退化横排行、宫格标签换行、FAB 待滚动位补拍）——**待修** |
| `pages/discover/index` | `素材/理想效果图/寻觅匹配卡片页面.png` | `素材/匹配/最终/ChatGPT Image 2026年8月17日 23_41_34.png`（70 图标）+ `素材/匹配/寻觅1/DESIGN_GUIDE.md`、`素材/全站素材补齐-0912_assets/9eafc24f…jpg`（match-card-hero 800×1280）、`specs/discover-ui-polish/design.md`（实点，CardSwiper P0）、`报告/像素级对比还原报告.md` §页面1（`:9-143`）、29a2b1df-only v3.1-contract §04/§11/§12 | 沉浸式大图卡 ≥70% 视口；顶部「寻觅 + 推荐/附近分段 + 筛选，**右侧空心收藏心形入口**」；卡左上**白底粉字**距离 chip、右上**白底绿点绿字**在线徽标、底部黑色渐变蒙层直接叠信息（**禁白色资料卡**）：姓名+年龄+性别符 → 学校·年级 → 距离·在线 → 兴趣标签 → **带大引号** bio → **匹配度=右下角绿色环形进度**（细环+中心 92%+「匹配度」；实现须 SVG stroke-dasharray，勿接 conic-gradient 版 XunmiMatchRing，R13-ACCEPTANCE §7）；右侧竖向操作列 ❤️喜欢（粉）/☆超级喜欢（蓝）/×跳过 + 左右滑手势；配额「今日剩余 N 次」；底部五 Tab 中央凸起寻觅 | R11 L1-L3 ✅ / L4 ⚠️（`:11`）；R13 明显偏差（findings §2.3：环形→实心粉圆**待修**、胶囊配色反转**已修**、缺收藏入口、性别符未渲染） |
| `pages/messages/index` | `素材/理想效果图/消息.png` | `素材/消息/最终/ChatGPT Image 2026年8月17日 23_43_21.png`（114 图标）+ `素材/消息/2/`（README、分层 svg）、29a2b1df-only `docs/design/message-v3-spec.md`（板块顺序/关系四态）、`素材/SVG素材核查与补充报告.md` §2.3 | 白底；**两张等宽半屏**快捷通知卡并排（有人喜欢你/正在等待回复，「去看看」=**浅绿描边小胶囊+绿字**）→ 寻觅助手官方卡（官方标+未读点）→ 正在升温横滑（关系标签 聊天中/暧昧中/互相关注）→ 最近聊天列表（头像+昵称+最后消息+**相对时间**（17:32/昨天）+未读数）；头部右侧**放大镜 + 加号（发起会话）**；空态=推荐认识的人兜底、骨架加载；底部五 Tab | R11 ✅（`:13`）；R13 明显偏差（findings §2.4：单卡通栏**已修**、实心渐变按钮、缺 + 入口、绝对日期、**测试残留文案外露「全链路验收测试消息 2026-09-12」——数据侧待清理**） |
| `pages/profile/index` | `素材/理想效果图/已经填完资料的个人主页.png` | `素材/主页/最终/个人/ChatGPT Image 2026年8月17日 23_32_20.png`（28 图标）、`素材/主页/2.0/docs/页面组装说明.md`、`素材/主页/5.0/`（hero/feed/match/story/bottom/empty 分层 svg）、`报告/像素级对比还原报告.md` §页面4（`:439`）、29a2b1df-only `docs/profile-design-spec.md`（375×812 画布）与 `docs/design/profile-product-logic.md` | 极浅绿渐变 Hero（大头像+白描边+认证勾、姓名/年龄/学校/城市/签名白字、右上编辑资料白胶囊）→ 资料完整度条（百分比+去完善绿胶囊）→ 4 格等宽统计（图标+黑粗数字+灰标签，竖线分隔）→ 我的故事横滑竖版 3:4 卡（渐变蒙层+篇数+虚线添加卡）→ 我的相册/照片墙 → 我的互动 4 行（头像预览堆+箭头）→ 更多功能宫格；底部五 Tab；未登录=LockScreen（参考 `素材/理想效果图/未登录个人主页.png`） | R11 ✅（`:14`）；R13 轻微偏差（findings §1 表：完整度卡 2 行拆 3 行、「添加日常」≠「添加故事」、meta 行少距离/年龄）——**低优先待修** |

### 3.2 分包页面

| 页面路由 | 理想图（P1） | 补充素材/规范 | 理想结构要点 | 对照状态 |
|---|---|---|---|---|
| `subpackages/profile-extra/profile/other` | `素材/理想效果图/他人显示主页.png` | `素材/主页/最终/他人/ChatGPT Image 2026年8月17日 23_33_29 (1).png`、`(2).png`（64+38 图标）、`报告/像素级对比还原报告.md` §页面3（`:277`）、29a2b1df-only `docs/design/profile-product-logic.md` §4（Hero→Identity→Action→Intro→Interest→Common→Gallery→Story）、v3.1-contract §06/§07 | 全屏人物大图（返回+···）→ 白色信息卡（头像浮动交界处、姓名/性别/在线胶囊/年龄·学校·城市/距离，右上「喜欢」粉描边+「打招呼」绿填充）→ 个性签名卡 → 兴趣标签（浅薄荷绿底）→ **我们有 N 个共同点**（3 项横排：彩底圆图标+标题+副题）→ 生活瞬间 4 列照片墙 → 最近动态 Feed → 底部固定三按钮：喜欢（粉浅底）/打招呼（绿主钮最宽）/关注（白描边绿星）；无底部 Tab；CTA 按状态机切换 | R11 未单独对照（`:30`）；R13 未出此页实拍——**下轮建议补 L1-L4 对照**（候选卡几何可复用 findings §2.3 的组件结论） |
| `subpackages/discover-extra/discover/matching` | `素材/理想效果图/匹配中页面.png` | `素材/SVG素材核查与补充报告.md` §2.4、29a2b1df-only v3.1-contract §07/§12 | 匹配中视觉进度（「正在寻找适合你的 TA」，不显示虚假算法百分比）→ 候选卡 → ❤️/×/取消；次数用尽/看完=空态；取消返回匹配中心 | R11/R13 均未逐对照（R13 拍到 `16-discover-matching.png` 留档） |
| `subpackages/discover-extra/discover/match-success` | `素材/理想效果图/匹配成功页面.png` | 29a2b1df-only v3.1-contract §08、`素材/SVG素材核查与补充报告.md` §2.5 | 粉色主题 Hero；标题❤/副语 → 双头像+粉心碰撞 → 共同点 4 行进度 → CTA：立即聊天 + 继续探索（+分享喜悦）；文案恒为「匹配成功」（互喜） | R11 ✅（`:12`）；R13 实拍错位无法判定（findings §0）——**需重拍复核** |
| `subpackages/discover-extra/likes/index`、`likes-visitors/index` | （无专属理想图，P4 兜底）29a2b1df-only v3.1-后台对齐 §三 喜欢与访客 | v3.1-contract §05、`素材/理想效果图/未登录个人主页.png`（相关数据区参考） | 顶部标题+Tab（喜欢我的/我喜欢的/互相喜欢/访客）→ 用户行列表（头像+昵称+学校+距离+在线+回赞/喜欢钮）→ 空态寻觅芽吉祥物+文案 | 截图覆盖（r11 matrix ok） |
| `subpackages/circles/circles/index` | `素材/理想效果图/兴趣圈列表.png` | `素材/附近/兴趣圈/ChatGPT Image 2026年8月17日 23_56_00.png`（71 图标）、圈封面：`素材/全站素材补齐-0912_assets/36f64e80…jpg`（摄影）`39cd56f3…jpg`（旅行）`dac87668…jpg`（音乐）`372d838e…jpg`（运动）、`素材/SVG素材核查与补充报告.md` §2.13 | 顶部标题+副标题+搜索+筛选圆钮 → 分类 chips（激活态实心、非激活与页面有对比度）→ 圈卡（封面图/圈名/热门徽/描述/人数·动态/头像堆/加入钮）；我的圈子/发现圈子 Tab；底部五 Tab | R11 ✅（`:16`）；R13 明显偏差（findings §1 表：副标题取错 key **已修**、chip 无对比度 **已修**、缺筛选圆钮、搜索钮被胶囊遮）——**余项待修** |
| `subpackages/circles/circles/circle-home` | `素材/理想效果图/圈子详情，摄影圈参考.png` | `素材/附近/圈子具体/ChatGPT Image 2026年8月18日 22_43_34.png`（118 图标）、圈封面同上（摄影圈用 circle-cover-photography，R11 对照圈）、`素材/SVG素材核查与补充报告.md` §2.14 | **深色 hero 封面上叠白字**圈信息（勿用白卡叠 hero）→ 加入钮 → 标签 chips → 白色面板（5 tab+置顶规约+动态卡）→ 底部加入大钮 | R11 ✅（`:17`）；R13 明显偏差（findings §1 表：白卡叠 hero、标签 chips 整块消失、置顶条空绿带 **已修**）——**余项待修** |
| `subpackages/campus/campus/hub` | `素材/理想效果图/校园圈.png` | `素材/附近/校园圈/ChatGPT Image 2026年8月18日 22_49_45.png`（95 图标）、`素材/全站素材补齐-0912_assets/edf8c3ef…jpg`（campus-circle-cover 学校封面）、`素材/SVG素材核查与补充报告.md` §2.7 | 认证引导条（未认证=「去认证」引导卡）→ 双 tab → 校圈卡（封面图/徽章/人数·动态/头像堆/进入或申请加入）；数字统一 k 格式；「约」前缀为诚实标注**保留**；统计单行省略号防孤字**保留** | R11 ✅（`:18`）；R13 判定「去认证×2」**有误已驳回**（R13-ACCEPTANCE §7 `:175`；实拍 `15-campus-index.png`）——维持达标 |
| `subpackages/village/village/publish`（圈场景发布=`circles/post-topic`、`campus/post-topic`） | `素材/理想效果图/发布帖子页面.png` | 29a2b1df-only v3.1-contract（帖子 Feed 双入口设计）、`素材/附近/帖子/ChatGPT Image 2026年8月24日 21_45_20.png`（图标索引实读） | 顶部 X/发布动态/发布钮 → 发布到卡（圈场景=发布到摄影圈；个人动态页默认个人动态——双入口）→ 正文 0/1000 → 图格 → 话题 0/5 → 位置 → 提及 → 谁可以看 → 小贴士 → 底部工具条 | R11 ✅（`:19`） |
| `subpackages/village/village/detail`（`village/post` 同构） | `素材/理想效果图/帖子.png` | `素材/附近/帖子/ChatGPT Image 2026年8月18日 22_51_12.png`（68 图标）、`素材/SVG素材核查与补充报告.md` §2.8 | 作者行+关注钮 → 正文 → 图 → **位置胶囊含距离** → 赞/评/**分享**（非「转发」）→ 全部评论+最热排序 → 评论卡+作者回复 → 底部输入条（**无多余「发送」钮**）；圈子归属+**相对时间**（utils/time 收敛已完成，R13-h） | R11 ✅（`:20`）；R13 明显偏差（findings §1 表：缺圈子归属、话题标签位置、定位无胶囊、「转发」≠「分享」、多「发送」钮）——**待修** |
| `subpackages/village/village/index` | （无一对一理想图；对齐 `素材/理想效果图/帖子.png` 的帖子卡结构 + P4 提示词）29a2b1df-only v3.1-后台对齐 §三 圈子/动态广场 | — | 顶部搜索+发帖 → 三入口（关注/同城/发现）→ 帖子 Feed（头像+昵称+学校+**相对时间**+正文+九宫格图+点赞评论）→ 右下角绿色发布 FAB | **R13 明显偏差**（findings §1 表：标题+副标题+搜索挤一行、帖子卡结构与规范相反、绝对日期）——**待修** |
| `subpackages/chat/chat-session/index` | （无理想图，P3/P4）29a2b1df-only `docs/design/message-v3-spec.md` §2.2、v3.1-后台对齐 §三 聊天 | v3.1-contract §09 聊天契约行 | 顶部导航（对方头像+姓名+在线+···）→ 关系状态区（RelationshipTag+SuggestedAction）→ 消息流（对方白底左/自己薄荷绿右/系统灰居中，活动卡内嵌）→ 恋爱输入区（语音+输入框+表情+加号+发送） | **R13 判过「最严重偏差」后 P0 已修+验证**（R13-ACCEPTANCE §3.2：幂等键改唯一键、`shots-r13e/51-chat-entry2.png` 完整渲染、错误净化不再外露技术串）——修复后需回归对照 |
| `subpackages/chat/official-chat/index` | 29a2b1df-only `docs/design/message-v3-spec.md` §2.3（导航：返回+助手头像+寻觅助手/你的恋爱小管家+···；text+活动卡消息流；v1 只读） | — | 同左 | 截图覆盖 |
| `subpackages/tools/search/index` | （P4）29a2b1df-only v3.1-后台对齐 §三 搜索 | v3.1-contract §15（学校结果→校园主页） | 搜索框+取消 → Tab 用户/标签/学校 → 用户行/标签胶囊/学校卡 | 截图覆盖 |
| `subpackages/profile-extra/settings/index` | （P4）29a2b1df-only v3.1-后台对齐 §三 设置 | — | 分组列表（账号安全/隐私/通知/帮助/关于）→ 退出登录粉色警示+确认 → 底部版本号 | 截图覆盖 |
| `subpackages/profile-extra/verification/index`（含 `verification/real-name`） | （P3）`素材/注册/个人资料填写/05-学生认证/`、`03-实名认证/`、`流程/DEV_PAGE_MAP.md` | 29a2b1df-only v3.1-contract §12 校园认证契约行 | 权益说明 Hero → 选校 → 三种方式（学信网/学生证/邮箱）→ 审核中 → 成功（✓ 绿徽章）；实名必须、学生/人脸可选不阻塞 | 截图覆盖 |
| `subpackages/setup/interest/index` | （P3）29a2b1df-only v3.1-contract §11/§19-11 | `素材/首页/最终/svg/`（interest 图标族） | 12 兴趣网格 → 完成（≥3）；注册阶段可跳过，主动进入必须 ≥3 | 截图覆盖 |
| `subpackages/setup/profile/index` | （P3）29a2b1df-only v3.1-contract §19-10 编辑资料 | `素材/注册/个人资料填写/02-基础资料/`、`08-恋爱名片/` | 昵称/年龄/学校/年级/地区/简介表单；未保存离开=确认；完成保存返回我的 | 截图覆盖 |
| `subpackages/discover/activities/index`、`subpackages/tools/activities/detail` | （P4）29a2b1df-only v3.1-后台对齐 §三 活动 | — | 活动卡横滑（封面 16:9+标题+时间+地点+报名人数）→ 详情（信息→发起人→报名→评论），报名固定底部 | 截图覆盖 |
| `subpackages/tools/heart-signals/index` | （P4）29a2b1df-only v3.1-后台对齐 §三 心动信号 | — | 信号列表（头像+昵称+状态+信号卡）；空态寻觅芽；点击进聊天 | 截图覆盖 |
| `subpackages/market/*`、`subpackages/vip/*` | （P4）29a2b1df-only v3.1-后台对齐 §三 商品/钱包/VIP | — | 商品列表（封面+标题+价格+购买）/钱包（余额卡+明细）/VIP（权益对比+开通钮） | 截图覆盖 |
| `subpackages/support/feedback/index` | （P4）29a2b1df-only v3.1-后台对齐 §三 反馈中心 | — | 类型入口（建议/活动提案/问题报告）→ 表单 → 成功空态 | 截图覆盖 |

> 未逐行登记的分包路由（`village/{post,tag-posts,history}`、`circles/{topics,topic-detail}`、`campus/{index,post-topic,topic-detail,certification}`、`discover-extra/{home/segment,nearby/people,discover/history}`、`tools/{daily-question,love-center*,help,security}`、`profile-extra/{settings/dnd,profile/{visitors,location,privacy,album,favorites,tasks},feedback/history}`、`setup/{campus,schedule,recommend-pref,showcase}`、`discover/discussions`、`legal/{privacy,agreement}`）当前无专属理想图：改版前按 §1 优先级降级取参考（P4 提示词先补生成图入 `素材/理想效果图/`）。其中 R13 点名的轻微偏差页：`circles/topic-detail`（实心绿渐变导航条与全站浅底冲突）、`profile-extra/profile/album`（「1/6」计数器压胶囊、虚线占位与品牌实底卡不一致）——**低优先待修**（findings §1 表）。

---

## 4. 后台（apps/admin）

| 范围 | 基准 | 要点 |
|---|---|---|
| 全站 | `doc/design-tokens-admin.md` + `doc/后台设计方案总览.md`（13 Frame 蓝图）+ `doc/后台功能模块清单.md` + `doc/后台RBAC三级圈层规格.md` + `doc/后台设计决策说明.md`（均实点） | 布局骨架（侧边栏 220px+顶栏 56px+内容 24px）全站复用；数据表格/筛选栏/详情抽屉/审核工作台三栏/批量操作条/图表看板（单主色+灰度）；异常边界态必须覆盖；危险操作 danger 文字按钮 |
| 逐页实拍 | `截图存档/2026-08-08-2/admin/`（实测 32 张）、`截图存档/2026-08-07/admin/`（00-login 起） | 现行后台各页实拍基准（用户/认证/举报/反馈/敏感词/审计日志/在线用户/管理员/公众号/角色/菜单/学校/字典/圈子/话题/活动/报名/VIP 套餐/账单/优惠码/钱包/金币/红包/商城/通知配置/匹配配置/全局配置） |

---

## 5. 素材资产 → 页面映射（AI 生成图包）

### 5.1 `素材/全站素材补齐-0912_assets/`（实测 **18 张**，源自 `全站素材补齐-0912.miora` 清单，两相吻合）

| 资产 | 文件 | 服务页面 |
|---|---|---|
| match-card-hero 寻觅卡片主视觉 800×1280 | `9eafc24f-miora_text_to_image-1789188175742-0-fdceb81a380a.jpg` | `pages/discover/index` 卡片主图 |
| circle-cover-photography 摄影圈封面 | `36f64e80-miora_text_to_image-1789188252459-0-5ab3cb1f2279.jpg` | `circles/index`、`circles/circle-home`（R11 对照圈） |
| circle-cover-travel 旅行圈封面 | `39cd56f3-miora_text_to_image-1789188328310-0-a56a5a39a738.jpg` | 同上（旅行圈） |
| circle-cover-music 音乐圈封面 | `dac87668-miora_text_to_image-1789188399911-0-86e34d8014bb.jpg` | 同上（音乐圈） |
| circle-cover-sports 运动圈封面 | `372d838e-miora_text_to_image-1789188491874-0-8ea362e4c2c7.jpg` | 同上（运动圈） |
| campus-circle-cover 校园圈学校封面 | `edf8c3ef-miora_text_to_image-1789188568653-0-e6cd2c244f48.jpg` | `campus/hub` |
| person-10…21（12 张校园生活场景人物照：图书馆/篮球场/咖啡馆/天台黄昏/画室/书店/樱花树下/宿舍夜读/操场跑道/地铁车窗/花房/吉他） | `267d31d0 / 59153a2d / de040f51 / 1b2db40b / 5c2e50df / 2d35502a / 832ef22a / 569e0bb5 / c1643dde / 32cb4c5d / 5d5b3f5d / 00963936`（均为 `-miora_text_to_image-*.jpg`） | 今日推荐/附近的人/他人主页生活瞬间/人物 fixture 补充（与 29a2b1df-only `docs/design/people-fixture.json` 对齐后使用） |

### 5.2 `素材/寻觅注册页-素材_assets/`（实测 4 张，源自 `寻觅注册页-素材.miora` 清单）

| 资产 | 文件 | 服务页面 |
|---|---|---|
| reg-hero-illustration 注册页顶部主插图 | `b5163cb0-miora_text_to_image-1789186272177-0-dd3e85895457.jpg` | `pages/register/index` |
| reg-success-illustration 注册成功插图 | `69340cfc-miora_text_to_image-1789186341708-0-8c365c88ce83.jpg` | `pages/register/success` |
| reg-bg-atmosphere 页面背景氛围图 | `fa78925c-miora_text_to_image-1789186333635-0-0b8569c115db.jpg` | 注册流程页背景 |
| reg-decor-elements 装饰元素总览 | `700fa92a-miora_text_to_image-1789186339542-0-21c8e1ef23ba.jpg` | 注册流程装饰 |

> 入库提醒：以上 AI 生成图按 `doc/素材资产管理规范.md` 先裁水印、再三处同步（src/static ↔ static-local-backup ↔ api/uploads），real 模式另注册 `media_asset`。

---

## 6. 未锚定 / 待澄清的理想素材（诚实披露）

| 素材 | 现状 |
|---|---|
| `素材/理想效果图/等待页面.png`、`未登录等待页面.png` | R11 明示未对照（`ideal-comparison.md:28-30`）；`素材/SVG素材核查与补充报告.md` §2.12 称其为「未登录等待页（Login Wait）」，但现行路由无独立等待页；锚定待产品确认（候补：`pages/register/success` 或登录态 LockScreen） |
| `素材/理想效果图/登录页面.png` | 登录页第二变体；R11/R13 对照均使用 `登录页.png`，本张保留为备选 |
| `素材/理想效果图/ChatGPT Image 2026年8月20日 11_37_17.png` | 19 张中唯一未找到页面映射的一张，待确认 |
| `素材/理想效果图/匹配中页面.png`、`未登录个人主页.png`、`他人显示主页.png` | 有明确页面语义（matching / profile 未登录态 / profile/other），R11 与 R13 均未做逐对 L1-L4 比较；下轮验收建议补 |
| 29a2b1df-only `docs/design/*` 七份规范 | 删除已随 `aefd8a72` 提交（§0 第 1 条）；引用必须走 `git show 29a2b1df:<path>`；恢复用 `git checkout 29a2b1df -- docs`。若确认永久移除 docs/，需先把现行内容迁入 `doc/` 并同步本基准，否则 P3/P4 层级悬空 |
| `目录整理说明.md:196` | 仍描述"252 文件磁盘已删未提交"的旧状态，已过时；以本基准 §0 为准 |
| 上一版基线提及的仓库根 `ChatGPT Image 2026年5月17日 *.png`（青藤之恋风格） | 两轮均在仓库根未找到；属早期 V1.0 方案，与现行 Token 不一致，不得作为基准 |
| `素材/主页/1.0-4.0`、`素材/消息/1`、`素材/附近/1`、`素材/组件库/{2.0,3.0,旧,补充}` | 历史版本迭代稿，仅作溯源（`素材/组件库/旧/DESIGN_GUIDE.md` 实点）；基准一律取「最终」目录、`主页/5.0` 分层 SVG 与理想效果图 |

---

## 7. 使用规则

1. **复刻目标**：任何页面改版/复刻，以 §3 表「理想图（P1）」为目标做像素级/结构级还原；P1 缺位时按 §1 优先级降级取参考，并在改动说明中注明所用参考层级。
2. **对照方法**：沿用四层比对（L1 页面结构→L2 信息层级→L3 交互位置→L4 卡片/组件形态；颜色/微细节不作门槛），实拍对照以 `reports/screenshots/r11-ideal/` + `reports/audit/2026-09-22-r13-goal/shots/` 为起点；**R13 findings 是线索清单不是工单**（R13-ACCEPTANCE §7 裁决），逐条须先核理想图再改。
3. **验收挂钩**：新页面/改版页面必须先在 §3 表登记理想图与结构要点（无理想图的用 P4 提示词先补生成图入 `素材/理想效果图/`），再进入实现。当前未清偿的结构债见 §3「对照状态」列 R13 待修项（首页×5、附近×5、寻觅×3、消息×4、帖子详情×5、village/index×3、circles×2、circle-home×2、topic-detail/album×1×1、匹配度环形×1）；登录页与匹配成功页**先重拍实拍再判定**。
4. **文案红线**（v3.1-contract，29a2b1df-only）：单向喜欢=「已送出心动」、互喜=「匹配成功」；发现与匹配职责不重叠；他人主页关注不入首屏 CTA。
5. **规范恢复**：需要读取 v3 系规范时用 `git show 29a2b1df:<路径>`；要整树还原用 `git checkout 29a2b1df -- docs`（上一版的 `git checkout -- docs` 已失效）。
6. 本基准为**只读快照**（2026-09-22 第 3 修）；素材目录增删或新一轮理想图对照（R14+）后需由基准员重新生成。
