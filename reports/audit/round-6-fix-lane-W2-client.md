# 第六轮修复波 W2 车道：客户端业务闸门与渲染依据

- 批次：round-6 fix lane W2（客户端业务闸门与渲染依据）
- 基线 HEAD：`74e681ca`
- 范围：`apps/client`（禁改根 `package.json`、`.github/workflows/ci.yml`、`README.md`、`.gitignore`、`tests/**`、`scripts/qa/**`（除第 6 条指定的缺省数字一处）、`apps/api/**`、`apps/admin/**`）
- 载具：`npx vitest run src/tests/<文件>`；收口前全量 vitest + `npm run typecheck`。本车道不起 dev server、不跑构建。
- 状态：进行中（逐条闭合后立刻追加落盘）

## 条目账

| # | 条目 | 状态 |
| --- | --- | --- |
| 1 | 正式包 `isVip` 恒假 ⇒ 真会员被按非 VIP 扣币 | 已闭合 |
| 2 | 每日一问把 `checkedIn` 当唯一渲染依据 | 已闭合 |
| 3 | `useAbortOnHide` 零消费者 | 待闭合 |
| 4 | 配额与封存闸门只判总闸（商城/VIP 动作层） | 待闭合 |
| 5 | 隐私授权闸门 10 页在用、仅 1 页有判点 | 待闭合 |
| 6 | 孤儿键 `village.post.presetTags` | 待闭合 |

---

## 条目 1：正式包 `isVip` 恒假 ⇒ 真会员被按非 VIP 扣币

现象一句：`stores/vip.ts` 的 `isVipRaw` 全仓唯一赋值是 `= false`（另一次是 `resetForLogout()`
置回 false），没有写 true 的路径也没导出，于是 `isVip` 在正式包恒假，
`likes` / `likes-visitors` 的「会员免费放行」分支不可达，真会员落到扣费确认那条路。

真相源排查（实测，决定修法）：
- 后端 `apps/api/.../auth/UserSessionView.java` 的 record 字段里**没有** `vipStatus`
  （`AuthController` 的 `@Operation` 描述写了「含 VIP 状态」，record 没有这一位）
  ⇒ `stores/profile.ts:451-460` 那份镜像在 real 模式恒为 `{isVip:false}`，
  所以审计 lane F 建议的「`isVip` 透传 `profileStore.vipStatus`」同样是死路，本轮不采纳。
- `DtoMapper.java:95-116` 注明「VIP 已下线，`isVip` 恒为 null」，`UserDto.isVip` / `UserBriefDto.isVip` 也不可用。
- 唯一可用真相源：`GET /api/v1/vip/bills` 最近一笔 `status=SUCCESS` 账单的 `periodEnd`
  ——与后端自己的会员判定同口径（`AutoRenewService.isVipExpiringSoon` 就是取
  createdAt 倒序后第一笔带 periodEnd 的 SUCCESS 账单作到期时间），客户端不需要新端点。

改动：
- `apps/client/src/stores/vip.ts:77` 新增三态 `VipStatusState = "unknown" | "vip" | "non_vip"`；
  `:100` `deriveVipStateFromBills()`（按上面的后端口径判，成功账单缺 `periodEnd` ⇒ 停在 `unknown`）；
  `:128` `vipStatus`（替换 `isVipRaw`，初值 `unknown`）；`:369` `refreshVipStatus({forceRefresh})`
  （失败**保持原状态**、写 `vipStatusError`，不降级成 `non_vip`；账单分页在途时拒绝用「当前页快照」判身份）；
  `:408` `ensureVipStatusLoaded()`（已判定则复用内存态，不再出网；并发共用一个在途 Promise）；
  `:94` `isVip = isShowcaseMode || vipStatus==="vip" || isDevVipSimulated`；
  `:425` `resetForLogout()` 复位成 `unknown`（不是 `non_vip`）。
- 拉取时机：`apps/client/src/subpackages/vip/index.vue:305` 支付成功后 `forceRefresh` 重取；
  动作层（下面两处）决策前 `ensureVipStatusLoaded()`。App 启动期不无谓出网
  ——`membershipEnabled=false` 时没有任何消费方。
- `apps/client/src/subpackages/discover-extra/likes-visitors/index.vue:214-229`、
  `apps/client/src/subpackages/discover-extra/likes/index.vue:215-232`：
  会员功能启用时先取身份再决策，`unknown` ⇒ toast「会员状态未确认，请稍后重试解锁」并**放弃扣费**
  （口径写进注释：扣错会员的钱不可逆，这次点击被拒只是稍后重试一次）；
  确认是会员 ⇒ **不再调用** `POST /wallet/unlock`（该端点契约即「按单价扣费并记录解锁」，
  后端 `RealWalletUnlockService` 无身份旁路），只做本地解锁 + 会员文案。
- `apps/client/src/i18n/locales/zh-CN.ts:2762` 新增 `likesVisitors.unlockVipStatusUnknown`。

判点（挂载/行为级，不判源码文本）：
- `src/tests/stores/vip-status.spec.ts` 12 例：unknown 初值不出网 / 未来到期 ⇒ `vip`+`isVip` 真 /
  真相源是 `/vip/bills?page=0&size=20` / 已过期 ⇒ `non_vip` / 只有 REFUNDED+FAILED ⇒ `non_vip` /
  成功账单缺 periodEnd ⇒ 停 `unknown` / 出网失败 ⇒ 停 `unknown` 且记录原因 / 已判定后复用不再出网 /
  并发只出一次网 / 登出复位回 `unknown` / `forceRefresh` 覆盖旧结论 / 账单分页在途时拒判。
- `src/tests/pages/likes-unlock-vip-gate.spec.ts` 5 例（真 likes/coins/session/app-config/vip store，
  只桩出网层）：会员 ⇒ `/wallet/unlock` 0 次 + `showModal` 0 次 + 列表转已解锁；
  非会员（阳性对照）⇒ 弹确认 + 发 1 次扣费；取不到身份 ⇒ 两者都不做；
  `membershipEnabled=false` ⇒ 不打 `/vip/bills`（证明对今日正式包零行为变化）；登出复位后不再按会员放行。

反向变异（串行，改坏 ⇒ 红 ⇒ 原样还原 ⇒ 复绿，改后 sha256 见复绿读数）：
1. `deriveVipStateFromBills` 的 `endMs >= nowMs ? "vip" : "non_vip"` 改成恒 `"non_vip"` ⇒
   `Tests 7 failed | 10 passed (17)`，红原文：
   `AssertionError: expected 'non_vip' to be 'vip' // Object.is equality`（vip-status.spec.ts:97）、
   `× 喜欢与访客页…会员功能开启且 store 收到会员态 ⇒ 不发扣费请求、不弹扣费确认框`。
2. `likes-visitors/index.vue` 会员分支改回 `for (item of lockedItems) await likesStore.unlockUser(...)` ⇒
   `Tests 1 failed | 4 passed (5)`，红原文：
   `AssertionError: expected [ { url: '/wallet/unlock', …(3) } ] to have a length of +0 but got 1`。
3. 同页 `if (vipState === "unknown")` 改成 `=== "vip"`（闸门方向写反）⇒
   `Tests 2 failed | 3 passed (5)`，红原文：
   `AssertionError: expected [ '会员状态未确认，请稍后重试解锁' ] to include '会员免费解锁'`、
   `AssertionError: expected [ { url: '/wallet/unlock', …(3) } ] to have a length of +0 but got 1`。
还原后复绿：`Test Files 2 passed (2) / Tests 17 passed (17)`；
sha256 `src/stores/vip.ts=f3e5d349d3e8056db327c024879bcddc1dfd025ea95f68fc03dd2e7d4b88a96a`、
`likes-visitors/index.vue=a3eedccc51a01ae5ce8c3536346cee7128c4790a037ec72881340045f9f15724`、
`likes/index.vue=69df9ee9d7a9a69fc07aebaa3da358b3868f867e03e2f17c2fcced34e3feee84`。

实测读数：`npx vitest run src/tests/stores/vip-status.spec.ts src/tests/pages/likes-unlock-vip-gate.spec.ts`
⇒ `Test Files 2 passed (2)`、`Tests 17 passed (17)`。全量 vitest 与 typecheck 读数见文末收口一节。

判不出：
- 微信真机上「会员点解锁是否真的没被扣交友币」要连后端 `vip_bill`/`wallet_transaction_log` 才算得出，
  本车道不起 dev server、不跑构建，也不碰 `apps/api`。
- `periodEnd` 是无时区的本地 ISO（后端 `LocalDateTime` 按业务时区入库）：设备时区与业务时区不同时，
  临界到期（±数小时）会判错一侧；本轮按「与后端续费扫描同口径」处理，未额外做时区归一。
- 「会员本地解锁、刷新后锁状态回退」这条只能到源码推导（见遗留债第 1 项）。


---
---

## 条目 2：每日一问把 `checkedIn` 当唯一渲染依据

现象一句：`subpackages/tools/daily-question/index.vue:162`、`:205` 用 `v-if="!checkInStore.checkedIn"`
决定锁屏与题目区，而 `checkedIn` 是内存态、全站 `fetchStatus()` 只有
`services/websocket/store-dispatch.ts:402` 与 `subpackages/market/shop/index.vue:45` 两个非 store 内触发点
⇒ 登出重登（第五轮 FINDING 15 已把 `checkedIn` 纳进登出复位）后本页必落锁屏，
当天明明已签到也要再点一次「去签到」发 `POST /check-in` 才回得来。

改动：
- `apps/client/src/subpackages/tools/daily-question/index.vue:7` 增加 `onShow` 引入；
  `:119-121` `onShow(() => { void checkInStore.fetchStatus(); })`（走 store 既有刷新入口，
  不自己拼 storage 读法；`fetchStatus` 自带 30s 新鲜度短路与竞态 token，不会多加往返）。
- 签到门槛原样保留：本页依旧只在「已签到」时放题目，改的是「状态没取到」不再冒充「没签到」。

判点：`src/tests/pages/daily-question-checkin-status.spec.ts` 5 例（挂载级 + 1 条静态契约）——
复位（`checkedIn=false`）后触发 onShow ⇒ `GET /check-in/status` 确实出网 1 次；
服务端 `checkedInToday=true` ⇒ `.lock-card`/`.lock-back` 不渲染且 `.question-card` 渲染；
服务端 `checkedInToday=false` ⇒ 锁屏与「去签到」CTA 仍在、题目卡不渲染（证明闸门没被撤）；
请求 reject ⇒ 不把「没取到」写成已签到；
静态契约钉 `onShow` 体内调用 `checkInStore.fetchStatus()` 且页面不用 storage 自造第二真相源。

反向变异：把 `onShow` 体改成 `void 0;` ⇒
`Tests 3 failed | 2 passed (5)`，红原文：
`AssertionError: expected [] to have a length of 1 but got +0`（未发起状态获取）、
`AssertionError: expected false to be true`（已签到仍显示锁屏）、
`AssertionError: expected '<script setup lang="ts">…' to match /onShow\(\(\) => \{\s*void checkInSto…/u`。
还原后复绿：`Test Files 1 passed (1) / Tests 5 passed (5)`，
`sha256 src/subpackages/tools/daily-question/index.vue=db273a100e344368d660a07812307b50bc42a9e77d4dec68a436e28996083242`。

实测读数：`npx vitest run src/tests/pages/daily-question-checkin-status.spec.ts`
⇒ `Test Files 1 passed (1)`、`Tests 5 passed (5)`。

判不出：
- 真机上「登出重登后当天已签到仍进得去题目页」需要真实后端当日状态；本车道不起 dev server。
- `fetchStatus` 的 30s 新鲜度短路（`stores/checkin.ts:282`）在判点里被刻意判成「恒过期」
  （mock `utils/cache-ttl` 的 `isCacheFresh`），所以「同一次会话内重复 onShow 不重复出网」
  这条只有 store 侧既有判点覆盖，本 spec 不声称覆盖。

---

## W2b 接力（撞 150 轮上限后的续车道）

- 接力基线：同一 HEAD `74e681ca`，工作树里 W2 的未提交改动原样保留、未做任何还原。
- 本轮范围（主控 2026-11-02 收窄后的交办）：**只做条目 5 与条目 6**。
  条目 3/4 移交 W2c 独立车道（`reports/audit/round-6-fix-lane-W2c-client.md`），本轮不判它们的账。
- 禁写清单核对：本轮只动了 `apps/client/**` 与 `scripts/qa/verify-i18n-orphan.mjs` 的
  `--allow-orphans` 缺省数字一处；根 `package.json`、`ci.yml`、`README.md`、根 `tests/**`、
  `apps/api/**`、`apps/admin/**`、`docker**`、`doc**` 一字未动；全程零 git 写操作。

### 接手时盘上读数（实测，非转述）

| 载体 | 读数 |
| --- | --- |
| `npx vitest run src/tests/pages/abort-on-hide-wiring.spec.ts`（W2 留的未跟踪新 spec） | `Tests 3 failed \| 2 passed (5)`——`subpackages/market/shop/index.vue` 只落了 import 与 `useAbortOnHide()`，`GET /products` 那次请求没带 `signal`，静态判点与两条挂载判点同时红。**归 W2c 车道账**（本轮为让收口全量跑得动，把那一行 signal 补上，未记条目 3 的账） |
| `npm run test:i18n-orphan`（HEAD 抽出基线树 `git archive 74e681ca apps/client/src`） | `I18N_ZH_KEYS=4222 I18N_ORPHANS=1251 I18N_HARDCODED=341` ⇒ **PASS**（两维都正好压在基线上） |
| `npm run test:i18n-orphan`（接手时工作树，含 W2 改动） | `I18N_ZH_KEYS=4225 I18N_ORPHANS=1251 I18N_HARDCODED=342` ⇒ **FAIL（裸中文 342>341）**，红源见文末收口一节 |
| 隐私门扫描面（剥注释后全量扫 `pages subpackages components utils services stores composables`） | 受限 API 调用点文件 **12** 个、调用点 **14** 处；引用 `ensurePrivacyAuthorized` 的生产文件 **12** 个 ⇒ 其中 **2 个文件整页没有守卫**：`subpackages/village/village/detail.vue:617`（评论配图 `uni.chooseImage`）、`components/common/ShareCard.vue:196`（`uni.saveImageToPhotosAlbum`） |
| `village.post.presetTags` | 全仓唯一命中＝定义处 `i18n/locales/zh-CN.ts:2049`（`.mimosa/hook-state` 里的两处是 hook 快照，不是源）；孤儿门按数组叶子把它算成 **8 条**孤儿 |

---

## 条目 5（W2b 收口）：隐私授权闸门——「调受限 API 前必须已过授权」装上能抓漏页的判点

### 判的不变量

**任何一次微信隐私接口调用（`chooseImage / chooseMedia / chooseVideo / chooseAudio /
chooseMessageFile / saveImageToPhotosAlbum / getRecorderManager / authorize`），
在这次调用的动作路径上必须已经 `await ensurePrivacyAuthorized()` 成功过。**
两个边界口径先写清：
- 不含 `uploadFile` / `compressImage`：它们不读用户受保护数据，路径来自已过守卫的选择器；
- `ensurePrivacyAuthorized` 被调用但**没等它**（既不 `await` 也不接 `.then`）不算守卫——
  那是装饰，动作照旧出网。

### 改前实况（本轮自己复量，不采信交办转述）

- 审计 F-4.4 的「10 页在用、只有 2 个判点文件」成立，但漏了一维：那 10 页**不是全集**。
  剥注释后全量扫描（扫描面 7 个目录、562 个文件）得到 12 个越权文件、14 处调用点，
  其中 2 个此前**完全没有守卫**（上面接手读数表）。这两页不是边角：一个是村口详情页的
  评论配图（用户每天在点），一个是签到分享卡「保存到相册」（写相册 scope）。
- 既有 2 个判点文件的成色实测：
  - `src/tests/utils/privacy.spec.ts` 15 例判的是工具本体（状态机/reject reason/超时放行），不判任何调用方；
  - `src/tests/pages/village-post-page.spec.ts:58-60` 把 `ensurePrivacyAuthorized`
    **桩成恒 resolve** ⇒ 该页即便判绿，也只证「授权通过时能选图」，
    「授权被拒时动作必须停」这条腿在全仓 0 覆盖。
- 不剥注释会一次性造出 7 条假红（`services/api.ts` 4 处、`utils/compress-image.ts` 1 处、
  `components/chat/VoiceRecorder.vue` 1 处、`utils/privacy.ts` 自己的用法示例 1 处都是注释里的
  `uni.chooseImage` 字样）——扫描器口径与本仓 `tests/entity-ddl-drift.spec.mjs` 剥 SQL 注释同族。

### 改动（生产代码 2 处 + locale 2 键）

- `apps/client/src/subpackages/village/village/detail.vue`
  `chooseCommentImage` 改 `async`，在 3 张上限检查之后、`uni.chooseImage` 之前
  `try { await ensurePrivacyAuthorized(); } catch { toast + return }`；新增 import。
  这里刻意**不开**「离开页面取消」那类额外改动，只补守卫，避免踩 W2c 的条目 3。
- `apps/client/src/components/common/ShareCard.vue`
  `handleSaveImage` 同型守卫，且放在 `isProcessing.value = true` **之前**——
  被拒时不进入处理中态，否则分享卡的保存按钮会一直 disabled 到下次复位。
- `apps/client/src/i18n/locales/zh-CN.ts` 新增
  `village.detail.privacyRequiredImage`、`home.privacyRequiredImage`，
  值逐字取自全站既有同文句（`profile` / `verification` / `realName` / `feedback` 等命名空间
  都是这一句「需同意隐私协议后才能选择图片」）⇒ **不是新措辞**，只是把同一句话接进缺它的两个命名空间。

### 判点

静态门 `apps/client/src/tests/pages/privacy-gate-wiring.spec.ts`（5 例，实测绿）：
1. 分母 sanity：越权文件 ≥12、调用点 ≥14、引用守卫的生产文件 ≥14，且审计在册 10 页必须全部被扫到
   （数字掉了先怀疑扫描器，不怀疑代码）；
2. **判点 1 漏页**：每个有隐私调用点的生产文件必须引用守卫，否则红——
   豁免册 `PRIVACY_UNGUARDED_FILE_EXEMPTIONS` **实测 0 条**；
3. **判点 2 动作路径**：每个调用点所在函数体内必须有早于它的守卫；一跳对账两种合法形态——
   调用本文件内含守卫的 helper（`utils/audio-recorder.ts` 的 `ensurePermission`），
   或被本文件内含守卫的调用方在守卫之后调起（`support/feedback` 的
   `void ensurePrivacyAuthorized().then(() => chooseImageInternal())`）；
   豁免册 `PRIVACY_ACTION_PATH_EXEMPTIONS` **实测 0 条**；
4. **判点 3 假守卫**：裸调 `ensurePrivacyAuthorized();`（既无 `await` 也无 `.then`）即红；
5. **判点 4 在册名册只增不减**：审计登记 10 页任一页不再引用守卫即红。
   两条豁免册都带反向对账（豁免项如今若不违例 ⇒ 必须划掉，否则红）——照
   `tests/gate-wiring.spec.mjs:163/221` 与 `PHANTOM_DML_EXEMPTIONS`（`tests/entity-ddl-drift.spec.mjs:65`）
   的「具名 + 写理由 + 只减不增」同族纪律。

运行时腿 `apps/client/src/tests/pages/privacy-denial-action.spec.ts`（4 例，实测绿）：
挑两页**分别覆盖两种守卫写法**——
- `subpackages/profile-extra/verification/index.vue`（`await` 同函数式；实名证件写库链路，越权代价最高）：
  拒授权 ⇒ `uni.chooseImage` **0 次** + `clientApi.uploadPostImage` 0 次 + `POST` 请求 **0 条** +
  只弹「需同意隐私协议后才能选择图片」+ 不出现「学生证已上传」+ 上传卡空态占位仍在（页面态没被赋值）；
- `subpackages/support/feedback/index.vue`（`.then` 派生式，静态门靠一跳对账才放行，所以必须单独证运行时这条链真被守住）：
  拒授权 ⇒ `chooseImageInternal` 一条都不走、`uploadFeedbackImage` 0 次、不弹「图片上传成功」。
两页各带一条**阳性对照**（授权通过 ⇒ `chooseImage` 确实被调用 1 次 / 上传卡空态消失），
否则「一次都没调用」会因为夹具本身点不着而恒绿。

### 反向变异（串行：改坏 ⇒ 门红 ⇒ 原样还原 ⇒ 复绿）

1. **绕过守卫的调用点（在册页内）**：在 `subpackages/campus/campus/certification.vue` 的
   `uploadStudentCard` 之前插 `function mutationProbeB() { uni.chooseImage({ count: 1 }); }` ⇒
   `Tests 1 failed | 4 passed (5)`，红原文：
   `AssertionError: 存在「守卫不在动作路径上」的调用点：subpackages/campus/campus/certification.vue#uni.chooseImage@L163 所在函数及其一跳调用方/helper 里都没有早于它的 ensurePrivacyAuthorized: expected [ Array(1) ] to deeply equal []`
   ——注意判点 1（漏页）此时**仍然绿**（该文件确实引用了守卫），只有判点 2 咬得住这种形态。
   变异态 sha256 `certification.vue=43428b43ca5012985807f243c81212a784b0f296eb63dfbb6cf5b30223f7dd62`。
2. **整页没有守卫（真漏页）**：在 `subpackages/profile-extra/profile/favorites.vue` 插
   `function mutationProbeA() { uni.chooseImage({ count: 1 }); }` ⇒ 判点 1 红，红原文：
   `AssertionError: 存在「未过隐私授权就调用受限 API」的漏页：subpackages/profile-extra/profile/favorites.vue 调用 uni.chooseImage(L133)，但整页没有 ensurePrivacyAuthorized: expected [ Array(1) ] to deeply equal []`
   ⇒ 这就是交办问的「新加一个不带守卫的选图页会不会被抓住」：**会，且第一轮判点就咬**。
   变异态 sha256 `favorites.vue=a5ac633321a350e080143c9eadc95e3984591a89acac4e76800f22b44d1075de`。
3. **假守卫（调了不等）**：`subpackages/profile-extra/profile/album.vue` 的
   `await ensurePrivacyAuthorized();` 去掉 `await` ⇒ 判点 3 红，红原文：
   `AssertionError: 存在「调了不等」的装饰性守卫：subpackages/profile-extra/profile/album.vue:L185 出现裸调用「try {ensurePrivacyAuthorized()」，既没 await 也没接 .then ⇒ 动作不等授权: expected [ Array(1) ] to deeply equal []`
   变异态 sha256 `album.vue=332cb72212e60e4355990666b8c5e073037fae9a991e764780ed20691547f059`。
还原后复绿：`Test Files 2 passed (2) / Tests 9 passed (9)`（静态门 5 + 运行时腿 4）。
还原校验：`git diff --stat` 对 `certification.vue` / `favorites.vue` / `album.vue` 均为空（三文件回到 HEAD 态）。

### 门与豁免对账表（条目 5）

| 格 | 内容 | 静态判点跑绿 | 生产代码确实接上 | 既有判点没被打破 |
| --- | --- | --- | --- | --- |
| ① 漏页维 | 12 个越权文件全部引用守卫（改前 10/12，漏页 2） | `privacy-gate-wiring.spec.ts` 判点 1 绿；豁免 **0 条** | `village/detail.vue`、`ShareCard.vue` 各补 1 处 `await ensurePrivacyAuthorized()` + 2 个 locale 键 | 全量 vitest 见收口一节（`village-post-page.spec.ts` 等既有隐私相关判点未改、未红） |
| ② 动作路径维 | 14 处调用点逐处对账（同函数 / helper 一跳 / 调用方一跳） | 判点 2 绿；豁免 **0 条**；变异 1 证其能红 | 14 处全部在守卫之后（扫描器实测，非抽样） | 同上 |
| ③ 假守卫维 | 14 个引用守卫的生产文件里的每一次调用 | 判点 3 绿；变异 3 证其能红 | 无裸调用形态 | 同上 |

豁免数合计：**0**（两册皆空集，新建册）。

### 判不出（条目 5）

- 真机上「微信后台未声明隐私指引 ⇒ `requirePrivacyAuthorize` fail / errno 112」的实际表现，
  本机无微信真机、且 `utils/privacy.ts` 在非 mp-weixin 端恒走 `unsupported` 放行分支 ⇒
  本轮判点只判「代码有没有等这道闸」，不判「平台到底怎么回」。
- `utils/privacy.ts:248-255` 的 8 秒超时是**放行**（resolve）而非拒绝：授权弹窗挂起满 8s 时
  动作仍会出网。这是 2026-08-31 真机挂起兜底的既定产品口径，本门不改动它，只把它的存在记在账上。
- 「拒绝授权后用户看不到任何可点的重试入口」这类可用性结论要真机腿才能定，写判不出。

---

## 条目 6（W2b 收口）：孤儿键 `village.post.presetTags`

### 先量「话题面板到底从哪拿列表」

实测三处真相源，`presetTags` 谁都不在列：

| 消费面 | 数据源 | 位置 |
| --- | --- | --- |
| 村口发帖页话题弹层 | 页内常量 `HOT_TOPICS`（10 条，裸中文） | `subpackages/village/village/post.vue:123`（模板 `:1094` `v-for`） |
| 圈子/校园发布页话题弹层 | **同一份 10 条同文表**的第二份拷贝 | `subpackages/village/village/publish.vue:321`（与 post.vue 逐字同表，第五轮 B2 已记账为 D6「演示/候选数据，迁 i18n 时不该动」） |
| 圈子话题选择器 | `config/popular-topics.ts` 的 `popularTopics`（12 条，带 `usageCount` 与 `nameKey` → `config.popularTopics.*` 已 i18n 化） | `components/village/TopicSelector.vue` ← `subpackages/campus/campus/post-topic.vue` |
| 热门话题板块 | 后端 `GET /post-tags/popular?limit=5`（mock 模式落 5 条本地兜底） | `components/village/HotTopicsSection.vue:85-95` |

`village.post.presetTags` 的 8 个值是 `config/popular-topics.ts` **前 8 条的同文复制**
（校园日常/兴趣分享/找搭子/求助/表白墙/校友动态/生活记录/技术交流），
与两页面板实际在用的 10 条 `HOT_TOPICS` 是**两份不同的清单**
（只「校园日常/找搭子/表白墙」等 4 条重合，且顺序、数量都不同）。

### 裁决：删键，不接线

- 接线＝把两页用户可见的话题清单从 10 条换成 8 条另一组词 ⇒ 那是**内容变更**，
  不是修 bug，且交办明令不许顺手改界面措辞/清单；
- 更关键：接上它等于在 `config/popular-topics.ts` 已有同名同值键表之外**再造第二个真相源**
  （审计 F-6 的原话正是「键加了没接线，是新增的第二处真值来源」），
  而 `config.popularTopics.*` 那套键还多带 `id / usageCount / nameKey` 三位，功能上严格覆盖 `presetTags`；
- ⇒ 另有真相源成立，按交办口径删键。`HOT_TOPICS` 两份同表合并进 `constants/village.ts`
  是第五轮 D6 移交的独立债（要同时动两页与常量层），本轮不扩面，记在下面遗留债里。

### 改动与读数

- 删除 `apps/client/src/i18n/locales/zh-CN.ts` 的 `village.post.presetTags`（10 行：键名 + 8 个值 + 尾随逗号归位）。
  删除前逐处确认全仓（`apps/client/src`、`apps/admin/src`、`scripts/qa`）除定义处零命中，
  且没有任何 spec 断言它的存在（`grep -rn presetTags apps/client/src/tests` 零命中）。
- `npm run test:i18n-orphan`（根目录）删键前后读数：

| 维度 | 删键前（当前工作树） | 删键后 |
| --- | --- | --- |
| zh 键数 `I18N_ZH_KEYS` | 4225 | **4217**（−8：数组按叶子计 8 个键） |
| 孤儿数 `I18N_ORPHANS` | 1251（基线 1251，压线） | **1243** |
| 裸中文数 `I18N_HARDCODED` | 342（基线 341 ⇒ 已红，红源见收口一节） | **342**（locale 文件在 `HARD_CODED_EXCLUDE` 的 `/i18n/` 路径排除里，删键不影响这一维） |

- 孤儿维是**双向棘轮**（`verify-i18n-orphan.mjs:231` `orphanShrink`：实测 < 基线同样判红），
  所以「数字必须变」的条件成立：删键后 `I18N_RATCHET_SHRINK 实测孤儿 1243 < 基线 1251` 直接判红 ⇒
  只把 `--allow-orphans` 的缺省值 1251 改成 1243（`scripts/qa/verify-i18n-orphan.mjs:42` 一行），
  判据逻辑、分类器、其它默认值一行未动；`git diff --stat` 对该文件＝`1 file changed, 1 insertion(+), 1 deletion(-)`。
  改后本机重跑：`I18N_ORPHANS=1243 I18N_ORPHANS_ALLOWED=1243`（孤儿维转 PASS，
  只剩裸中文维仍红，红源不属本条）。
  反证留档：脚本自带注释「`--allow-orphans 1200 ⇒ exit 1`」，本轮不重复证明棘轮会咬，
  由条目 5 的三条变异与本轮变异记录承担「判点能红」的证据。

### 门与豁免对账表（条目 6）

| 格 | 静态判点跑绿 | 生产代码确实删/接 | 既有判点没被打破 |
| --- | --- | --- | --- |
| 内容 | `npm run test:i18n-orphan` 孤儿维 `1243/1243` 绿（唯一仍红的是裸中文维 342>341，红源＝W2 条目 1 的 `stores/vip.ts:369`，见收口一节，不属本条） | `presetTags` 键与 8 个值全部从 locale 消失：`grep -rn presetTags apps/client/src`（排除 `.mimosa` 快照）零命中；`I18N_ZH_KEYS` 4225→4217 与之吻合 | 全量 vitest（含 `src/tests/i18n.spec.ts` 102 例）见收口一节；本轮删的键没有任何 spec 引用（删前实测零命中） |

### 判不出（条目 6）

- 「删键后两页话题面板是否还能正常展示 10 条」在 jsdom 里没有对应判点（`HOT_TOPICS` 是页内常量、
  不走 locale），只能由全量 vitest 的既有页面判点间接托底；真机渲染本轮不跑（不起 dev server、不构建）。
- `HOT_TOPICS` 两份同表（post.vue:123 / publish.vue:321）与 `config/popular-topics.ts` 三源并存的收敛，
  需要同时动两页模板与常量层，属第五轮 D6 移交的独立债，本轮按交办「不扩面」不动。

