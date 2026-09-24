# PageCompare · subpackages/campus/campus/hub（校园圈入口 Hub）— R1 需求与功能目标对照（A4）

- 理想图/规范：`素材/理想效果图/校园圈.png`（唯一页面级对照）+ `reports/audit/baseline/ideal-baseline.md:100`（理想结构要点与已冻结裁决）+ `素材/全站素材补齐-0912_assets/edf8c3ef-miora_text_to_image-1789188568653-0-e6cd2c244f48.jpg`（campus-circle-cover 学校封面源）
- 源码：`apps/client/src/subpackages/campus/campus/hub.vue`（855 行，工作树版）
- 执行证据：`reports/audit/round-1/interact/exec-results.json`（gitSha aefd8a72，本页 25 例：21 EXECUTED / 4 FAILED）+ `reports/audit/round-1/interaction-matrix.md:399-436`（前轮 22 行）+ `reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-*`
- 静态截图：`reports/screenshots/round-1-interact/SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH01-after2.png`（未认证首屏全页）

## 应该具备什么功能（Target，源自理想图 + ideal-baseline.md:100）

| # | Target | Current（代码 + 执行结果证实） | Gap | Fix |
|---|--------|-------------------------------|-----|-----|
| T1 | 认证引导条：图标+「加入校园圈，发现更多同校的 TA」+「完成学校认证…」+「去认证」实心绿钮，点击进认证页；认证中变「查看进度」 | `hub.vue:207-229`（引导卡，`goCertification` :158-160 → `ROUTES.CAMPUS.CERTIFICATION`，routes.ts:154）；文案 `i18n/locales/zh-CN.ts:3445-3448`；pending 分支 :224。机证 CH13 EXECUTED（tap `.campus-guide__btn` → 学生认证页）、CH14 EXECUTED（pending 态「查看进度」） | 无 | — |
| T2 | header「去认证」入口（未认证时；已认证变徽章） | `hub.vue:190-203`（v-if !isVerified → 去认证 / else 已认证徽章）；CH12 EXECUTED（tap `.campus-hub__cert-btn` → 认证页）。R13「去认证×2」判定有误已驳回（R13-ACCEPTANCE §7 :175）——维持双入口，不立案 | 无（裁决冻结） | — |
| T3 | 双 Tab「我加入的 / 推荐圈子」可切换，默认推荐 | `hub.vue:249-268`（tab 结构+指示条）、:118（activeTab 默认 "recommend"）、:127-132（切换过滤）；CH04 EXECUTED（joined 空态「暂未加入任何校园圈」截图证实）、CH05 EXECUTED（切回推荐列表恢复） | 无 | — |
| T4 | 校圈卡 = 封面图 + 校名/徽章 + 人数·动态 + 头像堆 +「进入/申请加入」CTA | 封面：`hub.vue:36-57`（11 校 CAMPUS_COVER 全映射，兜底 `IMAGE_PATHS.CIRCLE_COVERS.CAMPUS`=covers/campus-circle-cover.jpg，images.ts:612）+ :288-291 渲染；CH23 EXECUTED「11 校封面全命中，无破图」。徽章：三态 verified/pending/unverified `hub.vue:103-114` + :299-307（CH14/CH15 EXECUTED）。统计：`hub.vue:61-83` 按量级统一（<1w 用 k、≥1w 用 w），interaction-matrix row 6 ✅「无裸数字混用」。头像堆：`hub.vue:311-318`（3 枚 avatar-1/2/3.jpg 在盘，实测存在）。CTA：`hub.vue:322-324`（joined=进入实心 / 推荐=申请加入描边）；CH10/CH11 EXECUTED（卡→campus/index?school= 无死区） | 无 | — |
| T5 | 数字统一格式；「约」前缀诚实标注保留；统计单行省略号防孤字保留（R13-ACCEPTANCE §7 裁决，不改） | 「约」前缀：`hub.vue:76-82`（prefixTilde）；单行省略：`hub.vue:705-715`（nowrap+ellipsis）。均按裁决保留 | 无（裁决冻结） | — |
| T6 | 搜索学校/校园圈（实作增项，对齐 2026-08-20 参考图搜索框） | `hub.vue:232-246`（搜索框+×清除）+ :127-132（按校名/id 过滤）；CH06 EXECUTED（「北京」/「pku」命中）、CH07 EXECUTED（× 清空恢复）、CH09 EXECUTED（60 字超长不破版）。CH08 FAILED = harness `__CAND__` 占位符未解析（action-not-performed）；特殊字符+脚本串健壮性前轮 interaction-matrix row 10 已 ✅（输入 `<script>alert(1)</script>`… 字面渲染不执行、空态正确） | 无产品缺陷；CH08 需换手段重跑 | harness 修占位符后重跑 CH08 |
| T7 | 四态权限：未认证 / 认证中 / 已认证 / 非本校（公开浏览 vs 私域） | 未认证：joined 空态+双「去认证」（CH04 EXECUTED）；pending：引导卡「查看进度」+badge「认证中」（CH14 EXECUTED）；verified：header/引导卡变已认证徽章、joined 出现本校卡、推荐排除本校（CH15 EXECUTED）；非本校/未认证点卡=公开浏览 `hub.vue:7` 注释语义 + CH10 EXECUTED。门禁一致性：`campus/index.vue:179-200`（无 school= 参跳回 hub；-002 编码问题已修：:188-191 decodeURIComponent） | 见 REQ-01（未认证本校圈不可达态） | 见 REQ-01 |
| T8 | 返回导航：栈中 navigateBack；栈底（深链直达）兜底回「附近」tab | `hub.vue:164-170`（getCurrentPages()>1 ? navigateBack : switchTab /pages/nearby/index）；CH02 EXECUTED（栈底兜底不静默失败）、CH03 EXECUTED（栈中回落且状态恢复）。理想图底栏五 Tab 为分包页不可渲染的原生 tabBar，此为 R11 已接受等价物 | 无 | — |
| T9 | 底部「查看更多校园圈」提示（无死元素） | `hub.vue:330-332` 静态文案「更多校园圈持续接入中」（i18n moreHint zh-CN.ts:3436）；死箭头已按 MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-003 清偿；CH22 EXECUTED（滚到底/顶提示完整可见）。CH04 截图实拍新文案在显 | 无 | — |
| T10 | 认证状态拉取失败可感知 + 重试（MP-R2-CAMPUS-HUB-004） | `hub.vue:139-152`（refreshCertification：catch + errorMessage 双通道置 certLoadFailed）+ :176-181（红色错误条 + 重试钮）；store 侧 `stores/campus.ts:841-880`（404=正常未认证不报错，其余错误写 errorMessage）。**仅代码级确认**：CH17 FAILED——mock 模式 fetchCertificationStatus 早退（campus.ts:845-848 `if (useMock()) return`），无网络调用可拦截，harness 无法诱发失败态（CH17 wxml 实测无 cert-error 节点，页面仍是未认证态） | E2E 取证缺口（非产品缺陷） | 见 REQ-03 |

## structureNotes（L1–L10）

- **L1 结构**：header（返回+标题「校园圈」+副标题「发现和加入你的校园圈子」+去认证）→ 认证引导条 → 搜索条 → 双 Tab → 校圈卡列表 → 底部提示，纵向次序与理想图一致 ✅。两处已接受差异：①理想图搜索为右上放大镜，实现为引导条下独立搜索条（功能超集，增项不立案）；②理想图底部五 Tab（首页/附近/匹配/消息/我的）为分包页无法承载的原生 tabBar，等价为返回钮+栈底 switchTab 兜底「附近」（T8，R11 已接受）。另「查看更多校园圈⌄」改为静态「更多校园圈持续接入中」（MP-R1-003 死元素清偿，文案微差）。
- **L2 信息层级**：卡内「左封面 | 校名 / 徽章+统计行 / 头像堆+等 N 位同学 | 右侧 CTA」与理想图一致 ✅。badge 下沉统计行（R10-P2-007）、校名独占整行防折行（MP-R8-CAMPUS-001）均为已裁决优化。校名不带「圈」后缀（理想「北京大学圈」vs 实现「北京大学」）——前轮已接受，文案微差不立案。
- **L3 交互位置**：Tab 下划线指示、整卡可点、CTA 冒泡同路由（CH11）、header/引导卡双「去认证」入口（R13 驳回维持）——与理想一致 ✅。
- **L4 卡片形态**：白卡 28rpx 圆角 + 左封面 200×150rpx 圆角图 + 推荐 Tab 描边 CTA / joined Tab 实心 CTA，与理想图层级（仅「去认证」实心）一致 ✅。静态截图（CH01-after2、15-after、CH16-after）11 校封面全为摄影图，与 edf8c3ef 源风格一致；部署副本为 750×562 压缩版（源 1120×840，同 4:3 比例，23KB vs 127KB，同构图）。
- **L5–L8（颜色/字体/间距/圆角）**：brand 走 `var(--c-brand)` Token 链，三态徽章配色齐备——属视觉审查员域，本轮不重复判定。
- **L9 微交互**：press-feedback 全按钮、Tab 指示条、空态、认证错误条+重试、热区量测（CH24 EXECUTED，返回钮 64rpx×… 实测回填）✅。
- **L10 文案**：campusHub 域 i18n 全量在盘（zh-CN.ts:3431-3457），实拍文案与理想图逐条对应（引导条/Tab/CTA/空态）。「约」前缀与统计省略号为 R13-ACCEPTANCE §7 裁决保留。轻微一致性瑕疵：卡校名渲染 `school.name` 原文（hub.vue:296）而非 schools.ts:20 注释自称的「展示层优先 nameKey 经 t()」——en 语言包下校名仍中文（i18n 域，不立案）。
- **L1–L4 结论：无不达标偏差。**

## usageNotes（理想 vs 实际操作路径）

核心任务链可走通：进入 Hub（附近 Tab 入口，nearby/index.vue:253）→ 默认落推荐 Tab 浏览 11 校（CH01 冷启动深链）→ 搜索过滤/清空（CH06/07）→ 点卡或「申请加入」公开浏览目标校圈（CH10/11，无死区）→ 双「去认证」入口进认证页（CH12/13）→ 认证后 joined 出现本校卡、推荐排除本校、header/引导卡变已认证徽章（CH15）→ 返回：栈中 navigateBack、栈底兜底 switchTab「附近」，均机证（CH02/03）→ 任意时刻 1 步回 tab（栈底兜底即回附近；hub 本身 1 步返回）→ 快速连点防重复压栈（CH18 ×5 只入 1 层、CH19 ×5 只回 1 层）→ 深链 ?school= 静默忽略（CH21，MP-R2-003 回归守卫）。

迷路/断点：①**未认证但已绑定学校的用户在任何 Tab、任何搜索词下都到不了本校圈**（REQ-01，运行时反证：CH01 推荐首卡=清华大学即北京大学缺席；CH04 joined 空态；前轮 matrix row 8 搜「北京」0 卡「暂无推荐圈子」）；②「更多校园圈持续接入中」不可点——预期行为（静态说明，全部 11 校已展示完）。

取证缺口（均甄别为 harness 限制，非产品缺陷）：CH08/CH16/CH20 失败于 `__CAND__`/`__CASE_PAGE__` 占位符未解析或状态注入失败（CH16/CH17 wxml 实测页面仍为未认证态：去认证×4、未认证×10、无 badge--verified、无 cert-error 节点；CH20 navErr 源于占位路由未替换）；其功能面已由 CH06/CH09+前轮 matrix row 10（特殊字符）、CH15+CH10/CH11（verified 态与卡→index 路由）、前轮 matrix row 18（重复进出 3/3）分别覆盖。附注：每例 observed 均带「login A ok userId=user-1001 MISMATCH!」——harness 登录身份与预期账号不符的全局环境注记，非本页问题。

## functionGaps

1. **REQ-01（Function P2）未认证已绑校用户无法到达本校圈**：joinedSchools 被 isVerified 门禁（hub.vue:89-91），recommendedSchools 又无条件排除本校（:93），搜索基于推荐 base（:127-132）→ 三路全断。campusName 注册即写入 session（setup/campus/index.vue:861-872；session.ts:48 mock 默认「北京大学」），每个新注册用户在认证前都命中此态；而外校用户反而可公开浏览该校圈——语义不对称，且 hub.vue:7 自述「点击学校：已认证本校→私域；其他→公开浏览」未给未认证本校分支出口。
2. **REQ-02（Interaction P3）verified→「进入」私域的端到端取证未完成**（CH16）：功能代码与分段机证齐备（CH15 verified 渲染 + CH10/CH11 卡→index 路由 + campus/index 私域门禁），唯缺直拍一跳。
3. **REQ-03（Interaction P4）认证拉取失败错误条无法在 mock 环境 E2E**（CH17）：mock 早退无网络可拦；代码路径 hub.vue:139-152/176-181 确认存在。

## verdict

**基本达标。** 理想图结构 L1–L4 全对齐，10 项功能目标中 9 项有代码+运行时双证（T10 仅代码级），冻结裁决（约前缀/单行省略/双去认证入口/五 Tab 等价物）全部维持；但存在 1 个 P2 Function 态覆盖缺口（未认证本校圈三路不可达，新注册用户主流路径命中）与 2 个取证缺口，不足以判「达标」。

## 遗留/下轮建议

- REQ-01 修复后补：未认证绑校用户在推荐 Tab 见本校卡（「未认证」badge+「申请加入」）的截图取证。
- CH08（特殊字符输入）、CH16（store 注入 verified 后 tap joined 卡）、CH17（real 模式 + mock server 500，或直接注入 store.errorMessage）换手段重跑。
- 校名 i18n（nameKey 消费）移交视觉/i18n 域复核。
