# 恋爱小程序 · 第五轮 · 修复车道 B2 — 裸中文字面量迁 i18n（apps/client 生产 UI Top 3 文件）

任务书：`reports/audit/round-5-lane-B-frontend.md` FINDING 14（五分类口径、Top offenders、明确交出去的误差）
+ `reports/audit/round-5-fix-lane-C-admin-gates.md` 第 10 节（第二维已实现进 `scripts/qa/verify-i18n-orphan.mjs`，
缺省基线 `--allow-hardcoded 456`）。本车道**全程以门的分类器为唯一尺**，未另起分类口径。
基线：工作树含前端道、门禁道在途改动（README / apps/api / apps/admin / `src/stores/**` 等 60+ 文件 M 状态），
本车道一律未还原。行号一律按"动手前 grep 原句"复核。

运行环境：`npm run test:i18n-orphan` 由 npm（node v22.17.0）代跑，与 CI `node-version: '20'` 同代；
临时探针用 `/d/codex-tools/node-v20.19.5-win-x64/node.exe`。裸 `node` 是微信工具自带 v16.13.1，不参与判定。

---

## 0. 读数量具（先说清"我用的尺"）

- 全量读数：`npm run test:i18n-orphan`（根 package.json，走 `scripts/qa/verify-i18n-orphan.mjs`）。
- 按文件分组：门只打总数不打分文件，所以本车道把该文件第二维分类器
  （`const CJK =` 到 `const hardcoded = {` 之间，含 `stripCommentsAndLogs` / `classifyHardcodedChinese` /
  `HARD_CODED_EXCLUDE`）与同一份 `walkFiles` **逐字抽取**到 OS 临时目录的一次性探针做聚合
  （临时件在 `%TEMP%`，未入库、未在仓库新建任何文件）。
  聚合与门逐字对齐：迁前 `SUM=456 FILES=86` = 门 `I18N_HARDCODED=456 I18N_HARDCODED_FILES=86`；
  迁后 `SUM=341 FILES=84` = 门 `I18N_HARDCODED=341 I18N_HARDCODED_FILES=84`。**两把读数互证一致，不是第二套尺。**
- 明细点名：同一份正则（门里的四条 matchAll 原文）对单文件逐条打印 `[类别] L行号 :: 字面量`，
  本车道每条迁移都以这份明细点名，不靠记忆。

### 0.1 门的分类器有两处已知误差，读数必须连着误差一起交（本车道未动判据，权限外）

1. **模板文本正则 `>([^<>]*)<` 在 `<script>` 区跨行假命中**：`[^<>]` 不排除换行，于是
   `city.trim().length > 0 ? city : ""` 的 `>` 会与 `ref<"general" | …>` 的 `<` 配成一对，
   产出一条"模板文本"假命中（publish.vue L75、post.vue L149 各 1 条，实测见 §2/§3）。
   这类假阳性不是文案，迁不掉，只能留在基线里；**它同时说明 456 里含虚数**。
2. **绑定属性里的字符串字面量整类漏计**：正则 `(?:placeholder|alt|aria-label|label|title)\s*=\s*["'`]([^"'`]*)["'`]`
   要求值以引号开头，而本仓大量写成 `:aria-label="'添加位置'"` / `:placeholder="'输入自定义话题（' + N + ' 字内）'"`
   —— 捕获组拿到空串 ⇒ **不计入 456**。实测：publish.vue 漏 10 处、post.vue 漏 3 处（共 13 处，均属交办明列的
   placeholder/aria-label 类别，本车道一并迁了，但不计入棘轮降幅）。
3. throw 子项 =0：门 C 车道已注明「本分类器的 throw 正则没抓到 store 里的 `throw new Error(…)`，
   与 B 泳道记的 16 条 store 抛错口径未打通」；本车道复核后**同样一条没抓到**，不谎称已复现 16。

### 0.2 与交办数字的对账（交办里那些数是"待验证提示"）

| 交办/报告给的数 | 本车道实测 | 结论 |
|---|---|---|
| 「47 条 i18n 之外的硬编码文案」 | 用门、用门的分类器逐字抽取件、用门内四条正则，**复现不出 47** | 与 B 泳道同判：47 不可重跑，作废，以门为准 |
| B 泳道「生产 UI ≈358（388 − dev 页 30）+ store 抛错 16」 | 门读 456。拆开：`.vue` 413 + `.ts` 43（迁前）；门的 `.ts` 43 多数是 §0.1 的跨行假命中 | 两把尺不同源，358 vs 413 差 55 条我**未逐条复算构成**；本车道全程只用门这一把尺，不混用 |
| B 泳道 Top：publish 48 / post 42 / register 23（113/388 ≈ 29%） | 门 Top：**post.vue 45 / publish.vue 43 / register/index.vue 28**（116/456 ≈ 25.4%），且第 1、2 名与 B 排名互换 | **以门的输出为准并在本报告纠正**：Top 3 名单相同（同一三件文件），名次与条数不同 |
| C 车道 `FILES_SCANNED=553` | 556 | 其它车道在途新增 3 个扫描文件，与本车道无关 |

---

## 1. 读数基线（迁前，`npm run test:i18n-orphan` 原样）

```
I18N_PAIRING=SKIPPED reason=en-US 语言包已下线（apps\client\src\i18n\locales\en-US.ts 不存在）
I18N_ZH_KEYS=4143 I18N_EN_KEYS=0 FILES_SCANNED=556 STATIC_REFS=2405 DYNAMIC_PREFIXES=10
I18N_PAIRED=0 I18N_ZH_ONLY=4143 I18N_EN_ONLY=0
I18N_ORPHANS=1251 I18N_ORPHANS_ALLOWED=1251
I18N_HARDCODED=456 I18N_HARDCODED_FILES=86 I18N_HARDCODED_ALLOWED=456（模板文本=360 属性=42 toast/modal=33 ||兜底=21 throw=0）
I18N_RESULT=PASS（成对维 SKIPPED：en 包已下线，本维不再声称覆盖；孤儿维 + 裸中文维生效）
```

迁前分文件读数（门尺，`SUM=456 / FILES=86`，Top 15；完整 86 行台账见 §7）：

| # | 条数 | 模板文本 | 属性 | toast/modal | `\|\|`兜底 | throw | 文件（apps\client\src\…） |
|---|---|---|---|---|---|---|---|
| 1 | 45 | 37 | 3 | 4 | 1 | 0 | subpackages\village\village\**post.vue** |
| 2 | 43 | 37 | 1 | 5 | 0 | 0 | subpackages\village\village\**publish.vue** |
| 3 | 28 | 22 | 5 | 0 | 1 | 0 | pages\register\**index.vue** |
| 4 | 25 | 20 | 1 | 1 | 3 | 0 | pages\messages\index.vue |
| 5 | 22 | 14 | 2 | 5 | 1 | 0 | pages\home\index.vue |
| 6 | 19 | 13 | 3 | 2 | 1 | 0 | subpackages\profile-extra\profile\location.vue |
| 7 | 18 | 13 | 3 | 2 | 0 | 0 | subpackages\chat\official-chat\index.vue |
| 8 | 15 | 6 | 6 | 3 | 0 | 0 | subpackages\village\village\detail.vue（本车道禁改） |
| 9 | 12 | 12 | 0 | 0 | 0 | 0 | components\match\MatchHub.vue |
| 10 | 11 | 10 | 1 | 0 | 0 | 0 | components\profile\mine\MyStory.vue |
| 11 | 10 | 9 | 0 | 0 | 1 | 0 | components\home\TodayRecommendationCard.vue |
| 12 | 10 | 10 | 0 | 0 | 0 | 0 | components\profile\NotLoggedProfile.vue |
| 13 | 8 | 6 | 2 | 0 | 0 | 0 | components\home\NearbyPeople.vue |
| 14 | 8 | 6 | 1 | 0 | 1 | 0 | components\profile\public\PublicIdentity.vue |
| 15 | 8 | 0 | 1 | 7 | 0 | 0 | subpackages\profile-extra\profile\other.vue |

Top 3 合计 116 条 = 456 的 25.4%（B 泳道估 29%，差异来自两把尺的条数不同，名单一致）。

---

## 2. 迁移 · `src/subpackages/village/village/publish.vue`（门尺 43 → 1）

- **迁了 41 条真实 UI 字面量**：模板文本节点 35（L860/864/871/886/887/942/943/968/978/979/985/993/1003/1029/1035/1063/1075/1086/1098/1109/1119/1121/1123/1124/1127/1129/1130/1134/1138/1140/1144/1161/1166/1177/1178）
  + `placeholder` 1（L901「分享一点最近发生的事…」）
  + `uni.showToast({title})` 5（L247/293/443/452/457）。
- **另迁 10 处门的属性正则看不见但属交办明列类别**的绑定属性字面量：
  `:aria-label="'添加位置'"`×2、`'添加图片'`、`'添加话题'`、`'提及好友'`、`'谁可以看'`、`'自定义话题'`、
  `'移除话题 ' + tag`、`'选择话题 ' + topic`、`:placeholder="'输入自定义话题（' + CUSTOM_TOPIC_MAX_LENGTH + ' 字内）'"`。
  ⇒ 这 10 处**不计入棘轮降幅**（门本来就没数它们），只算等效迁移。
- **残留 1 条 = §0.1 的 `<script>` 区跨行假命中（L75），不是待迁文案**；同型的 L454 那条随本区改写自然消解。
  门的读数因此是 43→1（−42 = 41 条真实 + 1 条假阳性消解）。
- 键位（全部落在既有 `village.post.*`，两页共用一键）：
  `publishToLabel / publicBadge / visibilityLabel / addTopicLabel / addLocationLabel / selectedTopicCount /
  locationDraftOnlyNote / clearLocationLabel / circleTopicUnsupportedHint / publishTipTitle / publishTipDesc /
  toolImageLabel / toolTopicLabel / toolLocationLabel / toolMentionLabel / addImageAria / removeTopicAria /
  selectTopicAria / customTopicAria / customTopicPlaceholder / targetSheetTitle / targetGroupPublic /
  targetGeneralName / targetGeneralDesc / targetGroupCampus / targetCampusName / targetCampusDesc /
  targetGroupInterest / circlesLoadingHint / circlesLoadFailedHint / retryLoadCirclesLabel / circleJoinedMembers /
  noJoinedCirclesHint / publishContentPlaceholder / privacyScopeMissingToast / locationPickEmptyToast /
  locationPickedToast / locationPickFailedToast`
- **复用既有键**（都是已有非孤儿键、逐字同文，未新增重复）：
  「发布动态」→ `village.post.headerTitle`；「发布」→ `common.publish`；
  「圈内成员可见」→ `village.post.visibilityCircleMembers`；「提及好友」→ `village.post.mentionTitle`。

## 3. 迁移 · `src/subpackages/village/village/post.vue`（门尺 45 → 0）

- 迁 45 条（模板文本 37 + 属性 3 + toast/modal 4 + `||` 兜底 1）全部清零；本页无 §0.1 残留假阳性。
  点名：模板文本 L751/790/793/801/802/812/820/821/833/836/838/842/857/868/946/947/962/963/974/975/986/1012/1014/1040/1051/1061/1071/1081/1089/1090/1124/1134/1135/1169/1173/1182
  + placeholder L881/1112/1157 + toast L146/150/174/377 + 兜底 L963（`location || '选择或输入位置'` 同一条同时计 tpl 与 `||`，故 −2）。
- 另迁 3 处门漏计的绑定属性：`:aria-label="'标题'"`、`"'自定义话题'"`、`"'自定义位置'"`。
- 键位：与 publish.vue 同批 `village.post.*` 共用键（两页同文）+ 本页专属
  `titlePromptPlaceholder / titleAria / locationInputFallback / mentionInsertHint / currentLocationLabel /
  useActionLabel / clearCurrentLocationLabel / customLocationAria / customLocationPlaceholder /
  topicAlreadyAddedToast / maxTopicsToast / mentionInsertedToast`。
  复用既有键：「添加」→ `village.post.addTag`；「更多」→ `common.more`。
- 插值改写（等价，措辞未动）：`已选 {{ topics.length }}/{{ POST_MAX_CUSTOM_TAGS }}` →
  `t("village.post.selectedTopicCount", { n: topics.length, max: POST_MAX_CUSTOM_TAGS })`；
  `` `最多 ${POST_MAX_CUSTOM_TAGS} 个话题` `` → `t("village.post.maxTopicsToast", { n: POST_MAX_CUSTOM_TAGS })`；
  `当前：{{ location }}` → `t("village.post.currentLocationLabel", { location })`。

## 4. 迁移 · `src/pages/register/index.vue`（门尺 28 → 0）

- 迁 28 条：模板文本 22（L515/516/523/529/563/598/608/662/702/706/735/755/760/776/781/796/798×2/800/806/810/811）
  + placeholder 5（L543/577/622/676/720）+ `|| "出生日期"` 1（L756，同一条同时计两类）。
- 键位全部落既有 `register.*`（该页校验/toast 文案本就用这个空间）：
  `title / subtitle / sectionAccount / sectionIdentity / phoneLabel / phonePlaceholder / smsLabel /
  smsPlaceholder / smsSendLabel / smsResendCountdown / passwordLabel / passwordPlaceholder / confirmLabel /
  confirmPlaceholder / nicknameLabel / nicknamePlaceholder / birthLabel / birthFallback / birthHint /
  submitLabel / submittingLabel / registeredGoLogin / agreePrefix / agreeTerms / agreeAnd / agreePrivacy /
  safetyNote / haveAccount / goLoginLabel`
- 插值改写：`` `重新发送 ${smsCountdown}s` `` → `t("register.smsResendCountdown", { n: smsCountdown })`；
  `{{ submitting ? "注 册 中" : "注 册" }}` → `{{ submitting ? t("register.submittingLabel") : t("register.submitLabel") }}`（空格原样保留）。
- `<input>` 的 `maxlength` 一律**未增未减**（本仓实测坑：微信 `<input>` 不写 maxlength 会静默截到 140 字）。

### 4.1 迁移纪律核对（逐条自查）

| 纪律 | 落实情况 |
|---|---|
| 等价改写、不改措辞 | 三条文件的原文案逐字进 locales；无排比、无口号化。唯一非逐字的是 `'@'` 转义（见 4.2），渲染结果逐字相同 |
| 注释/`console.*`/mock 演示数据不迁 | 未动：publish L292/295/681、post L376/379、register L400 的 `console.*`；`HOT_TOPICS`（publish L321 / post L123 各一份同表）、`COMMON_LOCATIONS`（post L125）、`visibilityOptions` 的候选数据表原样留 |
| 不新造顶级命名空间、不建临时桶 | 只往既有 `village.post.*`（50 键）与 `register.*`（29 键）里加；无 `auditFix` 之类 |
| 控制流判定不许迁 | 未动（见 §8 遗留债 D2） |
| 不许留未用 handler/import | 迁移只改字面量取法，未摘任何 handler；`npm run typecheck` 只剩一条**别人禁改文件**的红（§10） |
| locales 不留 PLACEHOLDER/TODO 占位值 | 81→79 条新键值全为真实文案；一条插值探针实测（§10 V3）：79 条编译无错误、渲染非空、不等于键名 |
| 只降不升的棘轮 | 456 → 341（降） |

### 4.2 一处必须点名的技术处理：`@` 是 vue-i18n 的链接语法

`插入 @ 到正文`、`已在正文末尾插入 @，请输入昵称` 两条若原样入库，vue-i18n 消息编译器**报编译错误**
（实测 `Message compilation error: Invalid linked format` / `Unexpected empty linked key`，渲染结果恰好仍是原文）。
本仓既有 `circle.mentionEntry: "@ 提及圈成员"` 就是这个形态的**存量同类问题**（本车道未动，见 D3）。
按 vue-i18n 规范写成 `{'@'}` 转义后：**输出逐字不变**（`插入 @ 到正文`）、编译错误消失。
这是消息格式转义，不是措辞修改。

---

## 5. 棘轮下调（`scripts/qa/verify-i18n-orphan.mjs`）

- 改动**只有两处**：`const ALLOW_HARDCODED = Number(arg("allow-hardcoded", "456"))` 的缺省值 → `"341"`，
  与紧随其上的注释块（本轮从 456 降到 341、剩余构成、为什么这轮只做到这里、publish.vue 那 1 条是分类器假阳性）。
  **判据逻辑一行未动**（`hardcodedFail` / `hardcodedShrink` / `failDims` 全部原样；C 车道新写的双向收缩红也没碰）。
- 负对照（证明这条棘轮真的会咬）：`--allow-hardcoded 300` ⇒ `I18N_FAIL_HARDCODED 裸中文文案 341 > 允许 300`、
  `I18N_RESULT=FAIL`、EXIT=1；缺省 341 ⇒ PASS、EXIT=0。抬回 456 ⇒ `I18N_HARDCODED_SHRINK 341<456` 收缩红（迁移前实测过）。
- 注释里写明剩余 341 的构成与未迁原因（见 §7），不是「先降了再说」。

---

## 6. 孤儿维核对（本车道的硬约束）

| 读数 | 值 |
|---|---|
| 迁前 | `I18N_ORPHANS=1251 / 1251` |
| 只迁完 publish.vue（中间态） | `I18N_ORPHANS=1294 / 1251` ⇒ **FAIL**（瞬态，见下） |
| 三件全部接线完 | `I18N_ORPHANS=1251 / 1251` ⇒ 与迁前**逐字相等**，未恶化也未收缩 |

- 瞬态 1294 的构成：新键先落 locales、post.vue/register 尚未接线时，43 条新键（post 专属 12 + register 29 +
  写重了没用的 2）暂时没人引用 ⇒ 孤儿数上跳。收尾前两处补齐后回到 1251，并**删掉两个多余键**
  （`village.post.mentionFriendsLabel`、`village.post.toolMoreLabel`——改用既有 `mentionTitle`/`common.more`，
  不留没人用的键）。
- 关键设计约束（为什么全程新增键、绝不"顺手复活"死键）：门的孤儿棘轮 1251 是**压线绿且双向收缩也判红**。
  若把某条已存在的死键（如 `village.submit`=「发布」、`village.circleModeCampus`=「校园圈」、`village.post.titleLabel`=「标题」）
  拿来复用，孤儿数会掉到 1250 以下 ⇒ 触发 `I18N_RATCHET_SHRINK` 判红，而本车道**无权**改 `--allow-orphans`
  的缺省（只许动 `--allow-hardcoded`）。所以这三条同文串本车道改用新键，把复活死键这件事留给能同时调两条基线的批次。
  这条是门的结构后果，不是我漏迁：**同文新键与既有死键并存**，等主控统钉时一并消解（见 §9 接线三件套第 2 条）。

---

## 7. 剩余 341 条的构成（门尺实跑，`SUM=341 / FILES=84`）

- **按类别**：模板文本 265 + 属性 33 + toast/modal 24 + `||` 兜底 19 + throw 0 = 341。
- **按文件类型**：`.vue` 298 条 / 61 文件；`.ts` 43 条 / 23 文件（`.ts` 那 43 条里多数是 §0.1 的跨行假命中，
  如 `services/api.ts` 7 条、`utils/time.ts` 2 条，**不是可迁文案**；`stores/**` 13 文件 18 条里也含此类）。
- **落在本车道禁改清单里的 42 条**（归属他车道，本车道一律未动）：
  `village/village/detail.vue` 15、`src/stores/**` 18（campus 3 / chat-actions 各 1-2 / vip 2 / vip-auto-renew 2 / circle 1 / coins 1 /
  daily-question 1 / discover-actions-history 1 / schedule 1 / social-progress 1 / unlock-guide 1 / village-index 1）、
  `discover-extra/**` 5（match-success 4 / home-segment 1）、`tools/daily-question/index.vue` 3、
  `components/discover/AdvancedFilter.vue` 1。`market/wallet/index.vue` 0（前端道已清）。
- **可由后续批次继续压的 299 条 / 66 文件**，Top 5（门尺）：
  `pages/messages/index.vue` 25、`pages/home/index.vue` 22、`profile-extra/profile/location.vue` 19、
  `chat/official-chat/index.vue` 18、`components/match/MatchHub.vue` 12（第 8 名 `profile/mine/MyStory.vue` 11）。
  建议仍按"一件文件一次门"的节奏压，收口只需把缺省继续往下调。
- **门尺看不见的那一类**（不在 341 里，本车道在三件文件中共迁/清点 13+ 处）：`:aria-label="'中文'"` 形态的绑定属性。
  仓内其余文件的这一形态**门一条都没数到**，是 456/341 这条基线的系统性低估面，后续批次按文件读源码而不是按门读数找活。

---

## 8. 遗留债（明写，不在本车道顺手改）

| # | 债 | 证据（file:line，动手前 grep 原句复核过） | 为什么本车道不动 |
|---|---|---|---|
| D1 | 三件文件 `<script>` 区还有 **25 处用户可见显示串**是门五分类看不见的（computed/三元里 return 的中文字面量），已迁的模板把它们的上屏位点接好了，串本身还在脚本里 | publish.vue L80（`· 自动定位`/`北京市`）、L145/147/152/154/156/159（`个人日常`/`个人动态`/`… 成员`/`校园圈 · 所有校园成员可见`/`日常 · 仅互相喜欢或关注我的人可见`/`发布后进入广场`）、L173/174/176（`学校圈`/`兴趣圈`/`仅喜欢/关注的人可见`）、L433（`点击选择位置`）；post.vue L131/132/136/138（可见范围 label+desc）、L221/223/230/233/234、L240/241；register/index.vue L143/144/145（密码强度 `弱/中/强`） | 不属交办明列的五类，改了不会降棘轮、且要重排 computed 文案拼接（`{city} · 自动定位` 这类需参数化），属扩大改动面。逐条点名交后续批次 |
| D2 | **控制流判定钉后端中文措辞**（B 泳道点名的那一类） | 本车道文件内实测 7 处：register/index.vue L419 `detail.includes("已注册")`、L426 `"验证码"`、L432 `"未满 18"`、L438 `"手机号格式"`、L444 `"密码长度"`、L450 `"昵称长度"`、L456 `"暂未开放"`；另有 B 泳道点名的 `discover-extra/likes/index.vue:255` `msg.includes("余额不足")`（禁改清单内） | 交办明令本车道不许动；要改需与后端错误码同批（把 `includes(中文)` 换成 code 判定），否则改完就是**假绿**（前端不再认后端原文 ⇒ 分支恒不成立） |
| D3 | `@` 未转义的既有 locale 值会触发 vue-i18n 编译错误 | `i18n/locales/zh-CN.ts` L3789 `circle.mentionEntry: "@ 提及圈成员"`（实测报 `Invalid linked format`，渲染仍为原文） | 不在我迁的三件文件里，改它属顺手扩面；修法与本车道 4.2 同款（`{'@'}`），后续批次或主控一并收 |
| D4 | 门的 `I18N_HARDCODED_ALLOWED` 系统性低估：绑定属性形态漏计（§0.1 第 2 条）、`<script>` 区假命中（§0.1 第 1 条）、throw 子项 0 而 B 泳道记 16 条 store 抛错（§0.1 第 3 条） | `scripts/qa/verify-i18n-orphan.mjs:159`（attr 正则）、`:158`（tpl 正则 `[^<>]*` 含换行）、`:162`（throw 正则 `new Error\(\?\s*["'`]` —— `\(\?` 是字面量问号，压根匹配不到 `new Error("…")`） | **判据一改，红就可能被偷偷关掉**，本车道被明令只许动缺省值与注释。三处误差的修法交门禁车道：tpl 加换行禁断、attr 支持 `:x="'中文'"`、throw 正则去掉那个 `\?` |
| D5 | 同文新键与既有死键并存（`village.post.visibilityCircleMembers`/`common.publish` 之外的「发布/校园圈/标题」等有逐字同值的孤儿键） | 见 §6 末段三条举例 | 复活孤儿键会让孤儿棘轮收缩判红，而本车道无权改那条基线；须由能同时重钉两条基线的批次做（接线三件套第 2 条） |
| D6 | `HOT_TOPICS`（publish L321 / post L123 两份同表）、`COMMON_LOCATIONS`（post L125）、`presetTags`（zh-CN.ts `village.post.presetTags` 已是 locale 数组键） | 三处候选数据表 + 一份 locale 数组，四者不同源 | 属演示/候选数据（B 泳道明写"迁 i18n 时不该动"）；单一来源化要动 `constants/village.ts` 与两页，改动面不在本车道 |

**未完成项交还清单（按「条数 + 文件名」，门尺）**：
`pages/messages/index.vue 25`、`pages/home/index.vue 22`、`subpackages/profile-extra/profile/location.vue 19`、
`subpackages/chat/official-chat/index.vue 18`、`components/match/MatchHub.vue 12`、
`components/profile/mine/MyStory.vue 11`、`components/home/TodayRecommendationCard.vue 10`、
`components/profile/NotLoggedProfile.vue 10`、`components/home/NearbyPeople.vue 8`、
`components/profile/public/PublicIdentity.vue 8`、`subpackages/profile-extra/profile/other.vue 8`、
`components/common/LegalTextPage.vue 7`、`components/home/RelationActivity.vue 7`、
`subpackages/circles/circles/circle-home.vue 7`、`components/home/CommunityFeed.vue 6`、
`components/home/InterestRecommendation.vue 6`、`components/home/TodayLoveProgress.vue 6`、
`subpackages/profile-extra/profile/album.vue 6`、余下 65 个文件各 ≤5 条（合计 299 条 / 66 可迁文件）。
禁改清单内的 42 条按归属交回前端道。

---

## 9. 接线三件套（本车道无权改根 package.json / ci.yml，交主控落）

1. **本车道未新建任何门/脚本/仓库文件**：迁移件是 4 个既有文件
   （`apps/client/src/i18n/locales/zh-CN.ts`、`apps/client/src/subpackages/village/village/publish.vue`、
   `.../post.vue`、`apps/client/src/pages/register/index.vue`）+ 1 个既有门的缺省值
   （`scripts/qa/verify-i18n-orphan.mjs`）。
   所以 `package.json` 的 `test:contracts` 链与 `.github/workflows/ci.yml` **无需为本次改动增删条目**——
   `test:i18n-orphan` 已在链里（C 车道 FINDING 14 已复核过一次接线）。
2. **请主控在同一次落点里重钉两条基线**（这是本车道结构上做不到的一件事）：
   - `--allow-hardcoded`：已降 456 → **341**（本车道落）。
   - `--allow-orphans`：现 1251 压线双向红。后续 i18n 批次若开始**复用既有死键**（推荐方向：
     `village.submit`/`village.circleModeCampus`/`village.post.titleLabel` 这类逐字同文孤儿，见 §6 末段），
     孤儿数会下降，必须把缺省同步下调，否则门在收缩维判红。**顺序**：删孤儿键 + 复用 → 跑门 → 按新读数钉两条基线，
     一次落完；分两次落就会有一段"门红但没人负责"的窗口。
3. **门的三处判据误差**（D4）建议交门禁车道下一批做，并保留「只降不升 + 双向收缩」性质不动：
   `verify-i18n-orphan.mjs:162` 的 `throw` 正则 `\(\?` 打不着真实 `new Error("中文")`（⇒ 16 条 store 抛错永远进不了基线）；
   `:159` 的 attr 正则看不见 `:aria-label="'中文'"`（⇒ 至少 13 处本车道已迁的形态在基线里是隐形的）；
   `:158` 的 tpl 正则跨行假命中（⇒ 基线里含约 2 条虚数，publish.vue 残留的 1 条就是它）。

---

## 10. 验证读数台账（原样，不追认）

**V1 · 门（`npm run test:i18n-orphan`）三发 + 收口**

| 发次 | 时点 | I18N_HARDCODED | 分类构成 | FILES | I18N_ORPHANS | ZH_KEYS | 判决 / EXIT |
|---|---|---|---|---|---|---|---|
| 1 | 迁前基线 | 456（缺省 456） | 模板 360 / 属性 42 / toast 33 / `\|\|` 21 / throw 0 | 86 | 1251/1251 | 4143 | PASS / 0 |
| 2 | 只迁完 publish.vue | 414（缺省仍 456） | 模板 324 / 属性 41 / toast 28 / `\|\|` 21 / throw 0 | 86 | **1294**/1251 | 4224 | FAIL（孤儿 1294>1251；裸中文可收缩 414<456）/ 1 |
| 3 | 迁完 post.vue + register（三件全接） | 341（缺省仍 456） | 模板 265 / 属性 33 / toast 24 / `\|\|` 19 / throw 0 | 84 | 1251/1251 | 4222 | FAIL（裸中文可收缩 341<456；孤儿维已回绿）/ 1 |
| 4 | 棘轮降到 341 收口 | 341（缺省 341） | 同上 | 84 | 1251/1251 | 4222 | **PASS / 0** |

- 逐条口径点名依据：第 2、3 发之间 post.vue（45→0）与 register（28→0）是连续迁完后一次复量的，
  **没有单独采样"只迁完 post.vue"那一发**；两件的分文件读数由同一份门的分类器逐件复核
  （`publish.vue 43→1`、`post.vue 45→0`、`register/index.vue 28→0`，合计 −115 = 456−341，两把读数互证一致）。
- 负对照：`--allow-hardcoded 300` ⇒ FAIL（341>300）；`--allow-hardcoded 456` ⇒ FAIL（收缩红）。棘轮真的会咬。

**V2 · 单测（apps/client）**

| 跑次 | 命令 | 读数 |
|---|---|---|
| publish 迁完时 | `npx vitest run src/tests/i18n.spec.ts src/tests/pages/village-post-page.spec.ts src/tests/components/register-index.spec.ts src/tests/design-token-rulings.spec.ts` | **4 files / 129 tests 全绿**（i18n.spec 102 绿） |
| 收口前 | `npm run test:unit`（apps/client 全量） | 见文末补记 |

**V3 · 新键编译/插值探针（一次性，vue-i18n 真实编译器）**
`BEFORE_KEYS=4094 AFTER_KEYS=4173 ADDED=79` ⇒ **79 条新键全部编译无错误、插值可用、渲染非空且不等于键名**。
（键数按对象叶子计，与门的 4143→4222 差 79 一致；差值口径：探针不计数组型键 `presetTags`/`interestKeywords`。）

**V4 · 类型检查**
`cd apps/client && npm run typecheck`（`vue-tsc --noEmit`）⇒ EXIT≠0，**唯一一条**：
`src/subpackages/market/wallet/index.vue(326,16): error TS2304: Cannot find name 'formatCentsAsYuan'`。
定性：该文件在本车道禁改清单里，且它已在工作树里被前端道改过（`git status` = M，L326 调用
`formatCentsAsYuan(cents)` 而 L12 的 import 只取了 `useCoinsStore, centsToYuan`）——
**属前端道在途改动（第五轮 FINDING 9 修法落地时漏了 import），不是本车道造成，按纪律未动它**。
本车道三件文件 + locales 零 TS 报错（TS6133 形态未出现：迁移没有摘掉任何 handler）。

---

## 11. 补记（收口读数）

- **V5 · 收口门读数（在全部改动含 `{'@'}` 转义之后复跑）**：
  `npm run test:i18n-orphan` ⇒ `I18N_ZH_KEYS=4222 / I18N_ORPHANS=1251 I18N_ORPHANS_ALLOWED=1251 /
  I18N_HARDCODED=341 I18N_HARDCODED_FILES=84 I18N_HARDCODED_ALLOWED=341（模板文本=265 属性=33 toast/modal=24
  ||兜底=19 throw=0）/ I18N_RESULT=PASS`，EXIT=0。
- **V6 · 本车道在门文件里的改动面自证**：`git diff scripts/qa/verify-i18n-orphan.mjs` 会把 C 车道
  **尚未提交**的第二维整块（`stripCommentsAndLogs` / `classifyHardcodedChinese` / `hardcodedFail` / `hardcodedShrink` …）
  一起显示成 `+` 行，**不能用它自证本车道改动**。本车道的实际改动只有一处替换：
  `const ALLOW_HARDCODED = Number(arg("allow-hardcoded", "456"))` → `"341"` 与其上方注释块；
  判据行（`orphanFail` / `orphanShrink` / `hardcodedFail` / `hardcodedShrink` / `failDims` / `process.exit(...)`）
  与开工时读到的原文**逐字一致**（收缩红逻辑一条没碰）。
- **V7 · 类型检查复跑（含 `{'@'}` 转义后的最终态）**：`cd apps/client && npm run typecheck` ⇒ EXIT=2，
  `error TS` **恰好 1 条**：`src/subpackages/market/wallet/index.vue(326,16): Cannot find name 'formatCentsAsYuan'`
  ——与 V4 同一条、同 file:line，仍属前端道在途改动（禁改清单内），本车道三件文件 + locales 零 TS 报错。
  这条红**不是**本车道造成，也未顺手修（改它要动 `market/wallet/index.vue` 或 `stores/coins.ts`，两者都在禁改清单）。
- **V8 · 全量单测复跑（最终态，含 `{'@'}` 转义之后）**：`cd apps/client && npm run test:unit` ⇒
  `Test Files 151 passed (151)` / `Tests 1621 passed (1621)`，UNIT_EXIT=**0**，Duration 218.50s。
  与 V2 首跑（同一命令，`151 passed / 1621 passed`，EXIT=0，204.33s）逐项相等 ⇒ 迁移未改变任何既有断言结果。
- **V9 · 交付面**：仓库内新增文件只有本报告一件；三条读数探针（按文件聚合、逐条明细、新键编译自证）
  全部落在 `%TEMP%`，跑完即弃，未在 `apps/client` / `scripts` / `tests` 里留任何临时件；
  全程零 git 写操作（只用了 `git status` / `git diff` / `git show` 三只读命令）。
- **一句话总账**：门尺裸中文 **456 → 341**（−115，Top 3 文件 43+45+28 → 1+0+0，残留那 1 条是分类器假阳性），
  新增 locale 键 **79**（`village.post.*` 50 + `register.*` 29，另有 4 串复用既有键），
  孤儿维 **1251 → 1251**（未恶化、未收缩），单测 1621 全绿，类型检查仅剩前端道在 `market/wallet/index.vue`
  的那 1 条 TS2304（禁改清单内，已按归属定性、未动）。
