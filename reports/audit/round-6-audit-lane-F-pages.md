# 第六轮审查 · F 车道：客户端页面级契约空白账

- 仓库：`D:\6\恋爱小程序`，HEAD `74e681ca`
- 范围：`apps/client/src/pages`（8 个 .vue）+ `apps/client/src/subpackages`（66 个 .vue）= 74 个页面；`apps/client/src/tests` 151 个 spec
- 纪律：全程只读；未跑 maven；未跑 `npm run test:client`；未起 dev server / 构建
- 状态：已成文（7 条编号发现 + 命令台账 + 判不出清单）

## 复量：主控给的 74 / 31 / 43 三个数

| 口径 | 主控给的值 | 本车道实测 | 说明 |
|---|---|---|---|
| 页面 .vue 总数 | 74 | 74（pages 8 + subpackages 66） | 一致；pages.json 里 `"path"` 也正好 74 条，1:1 |
| 被 spec 按路径引用到的页面 | 31 | **32 字面 + 5 动态路径 = 37** | 字面口径 = tests 下命中 `<路径>.vue`；另有 5 页被 `pages/guest-landing-pairs.spec.ts` 用 `${page}.vue` 拼路径读源码，**纯字面 grep 看不见**（详见 F-1 口径修正） |
| 无任何路径引用 | 43 | **37** | 字面 32 + 动态 5 = 37 页被引用，余 37 页零引用 |
| 其中「业务级页面判点」为真 | 未给 | **28** | 关键纠偏：32 个被字面引用的页面里 **8 个只被风格/命名/无障碍类 spec**（design-token-rulings、native-switch-naming、press-feedback-and-image-name）引用，**1 个只在别人测里作为注释出现**（support/feedback），都算无业务判点 |
| **业务级判点空白页（硬账分母）** | 43 | **46** | 37 零引用 + 8 仅风格 + 1 仅注释；合计 36,136 行页面代码（全站页面代码 71,719 行的 50.4%） |
| 其中带真实闸门的页面 | 未给 | **23** | 配额 / 封存 / 会员 / 游客落地 / 隐私授权五族，逐页见 F-1 表 |

## FINDING F-1（P1）：46 页无业务级页面判点，其中 23 页带闸门；主控的 43 页账在口径上要修正三处

### 口径修正（这是本车道唯一能反驳主控的地方，先说清）

复量分母用三层口径，逐页跑 `grep -rlF "<页路径>" src/tests`：

1. `.vue` 字面路径引用：**32 页**（主控记 31，差 1）；
2. **动态路径引用**（`readFileSync(resolve(SRC, \`${page}.vue\`))` + `sourceOf("subpackages/setup/campus/index")`）：`src/tests/pages/guest-landing-pairs.spec.ts` 用路由名拼 `.vue`，把 5 页拉回在册：`subpackages/campus/campus/index`、`subpackages/discover-extra/discover/matching`、`subpackages/village/village/tag-posts`、`subpackages/setup/campus/index`、`subpackages/setup/recommend-pref/index`。纯字面 grep 看不见这一层——**任何按 `.vue` 字符串数分母的审计都会把这 5 页误报成空白**；
3. 反向修正：32 页里 **8 页只被风格/命名/无障碍类 spec 引用**（`design-token-rulings.spec.ts`、`native-switch-naming.spec.ts`、`components/press-feedback-and-image-name.spec.ts`），1 页（`subpackages/support/feedback/index.vue`）只在另一个 service 测里作为**注释**被提到。这 9 页没有一条业务判点。

净结果（实测，可复现）：

| 分类 | 页数 | 说明 |
|---|---|---|
| A 挂载式运行时契约 | 11 | import 页面组件并 mount |
| B 页面源码静态契约（业务） | 12 | readFileSync + 断言闸门/取数/导航 |
| B 页面源码静态契约（动态路径） | 5 | guest-landing-pairs 那一层 |
| **业务级判点合计** | **28** | |
| C 仅风格/命名/无障碍判点 | 8 | 无业务判点 |
| D 仅注释提及 | 1 | 无判点 |
| E 零引用 | 37 | 无判点 |
| **业务级判点空白合计** | **46** | 36,136 行页面代码（全站页面代码 71,719 行的 50.4%） |

C 档 8 页点名：`campus/certification`、`campus/post-topic`、`chat/official-chat`、`circles/post-topic`、`profile-extra/profile/privacy`、`profile-extra/settings/dnd`、`village/publish`、`vip/index`。**其中 `village/publish.vue` 与 `chat/official-chat/index.vue` 主控算进了「31 页有判点」，实际它们在盘上的判点是色值 token 与 `<switch>` 命名，页面里那条游客落地链一条没钉。**

### 46 页逐页账（闸门列 = 实测到的机制名，不是印象）

`gate` 列取自逐页 grep：`guideGuestToLogin` / `usePageAccess` / `LockScreen` / `NotLoggedWaiting` / `guest-guide` / `isCommerceOn` / `commerceSealed` / `isBoardSealed` / `useCheckInStore` / `featureFlags.` / `quotaExhausted` / `checkedInToday` / `requireLogin` / `isUnlocked` / **`ensurePrivacyAuthorized`（第五族：相册/相机隐私授权闸门，10 页在用）**。
`store 判点` 列 = 该页消费的 store 在 `src/tests/stores/` 下是否有同名 spec（**注意：store 有判点 ≠ 页面闸门有判点**，本表把两者分开记）。

| # | 页面（行数） | 判点 | 闸门机制 | store 判点（间接） | 硬账？ |
|---|---|---|---|---|---|
| 1 | `pages/discover/index.vue`(701) | E 无 | `quotaExhausted`+`requireLogin` | discover/campus/spec ✔、discover-utils ✔（但全仓 spec 里 `quotaExhausted` **0 次引用**） | **是（配额闸门零判点）** |
| 2 | `subpackages/discover-extra/likes/index.vue`(1771) | E 无 | `usePageAccess`+`isUnlocked`+`isCommerceOn`+`featureFlags.` | likes ✔ coins ✘ app-config ✘ vip ✘ | **是（付费封存+会员闸门）** |
| 3 | `subpackages/discover-extra/likes-visitors/index.vue`(913) | E 无 | `usePageAccess`+`isUnlocked`+`isCommerceOn`+`guest-guide`+`featureFlags.` | likes ✔ coins ✘ vip ✘ | **是（同上，且是独立页）** |
| 4 | `subpackages/market/shop/index.vue`(802) | E 无 | `commerceSealed`+`useCheckInStore` | checkin ✔ coins ✘ | **是（封存态动作层见 F-4）** |
| 5 | `subpackages/market/detail/index.vue`(693) | E 无 | `commerceSealed` | app-config ✘ | **是** |
| 6 | `subpackages/tools/love-center/index.vue`(395) | E 无 | `isBoardSealed`+`isCommerceOn` | app-config ✘ | **是（自造第三套封存判定）** |
| 7 | `subpackages/tools/love-center/nearby.vue`(424) | E 无 | `requireLogin`（页内自造） | discover ✔ | **是（配额不判，见 F-4）** |
| 8 | `subpackages/tools/search/index.vue`(1078) | E 无 | `LockScreen` | search ✔ | **是（游客态整页锁，无判点）** |
| 9 | `subpackages/discover-extra/discover/history.vue`(640) | E 无 | `LockScreen` | discover ✔ | **是** |
| 10 | `subpackages/tools/activities/detail.vue`(1002) | E 无 | `LockScreen` | activity ✔ | **是** |
| 11 | `subpackages/discover/activities/index.vue`(1243) | E 无 | `usePageAccess` | activity ✔ | 是（弱：仅会话门槛） |
| 12 | `subpackages/discover/discussions/index.vue`(203) | E 无 | `usePageAccess` | — | 是（弱） |
| 13 | `subpackages/tools/help/index.vue`(364) | E 无 | `usePageAccess` | — | **是：`helpPageRequirements` 是 page-access.ts 里唯一为它单立的一枚，且注释写明「门槛下移到两个 CTA 目标页」，两个目标页一个只有风格判点(official-chat)、一个零判点(feedback/history)** |
| 14 | `subpackages/chat/official-chat/index.vue`(1157) | C 仅无障碍判点 | `usePageAccess`+`isUnlocked`+`LockScreen` | profile ✔ session ✔ | **是（CTA 落点页）** |
| 15 | `subpackages/profile-extra/feedback/history.vue`(724) | E 无 | 无（门槛在数据层 401） | feedback ✔ | **是（page-access.ts:109 明写它靠 401 兜底，无页面判点）** |
| 16 | `subpackages/profile-extra/profile/tasks.vue`(803) | E 无 | `checkedInToday` | profile ✘（tasks 走 session） | 是 |
| 17 | `subpackages/setup/profile/index.vue`(1862) | E 无 | `ensurePrivacyAuthorized`（头像/相册）+ 被 profile-guard 的 LOCKED_PAGES 承接 | profile ✔ | **是（隐私授权维无判点；路由维由 guards/profile-guard.spec 在册）** |
| 18 | `subpackages/setup/interest/index.vue`(264) | E 无 | 无 | — | 否 |
| 19 | `subpackages/setup/schedule/index.vue`(343) | E 无 | 无 | — | 否 |
| 20 | `subpackages/setup/showcase/index.vue`(513) | E 无 | 无 | — | 否 |
| 21 | `subpackages/setup/dev/index.vue`(524) | E 无 | 无（dev 页） | session ✔ | 否 |
| 22 | `subpackages/setup/campus/index.vue`(515) | B 动态 | `guideGuestToLogin` | profile ✔ | 已覆盖（仅落地维） |
| 23 | `subpackages/setup/recommend-pref/index.vue`(403) | B 动态 | `guideGuestToLogin` | — | 已覆盖（仅落地维） |
| 24 | `subpackages/campus/campus/index.vue`(1152) | B 动态 | `guideGuestToLogin` | campus ✔ | 已覆盖（仅落地维） |
| 25 | `subpackages/campus/campus/topic-detail.vue`(924) | E 无 | 无 | campus ✔ | 否 |
| 26 | `subpackages/campus/campus/certification.vue`(1054) | C 仅无障碍 | **`ensurePrivacyAuthorized`** | campus ✔ | **是（隐私授权闸门无判点）** |
| 27 | `subpackages/campus/campus/post-topic.vue`(1181) | C 仅命名 | **`ensurePrivacyAuthorized`** | campus ✔ | **是** |
| 28 | `subpackages/circles/circles/circle-home.vue`(1577) | E 无 | 无 | circle ✔ | 否 |
| 29 | `subpackages/circles/circles/topic-detail.vue`(1034) | E 无 | 无 | circle ✔ report ✔ | 否 |
| 30 | `subpackages/circles/circles/post-topic.vue`(1526) | C 仅命名 | **`ensurePrivacyAuthorized`** | circle ✔ activity ✔ village ✔ | **是** |
| 31 | `subpackages/discover-extra/discover/match-success.vue`(319) | E 无 | 无 | match ✔ profile ✔ | 否 |
| 32 | `subpackages/discover-extra/home/segment.vue`(392) | E 无 | 无 | — | 否 |
| 33 | `subpackages/legal/agreement/index.vue`(21) | E 无 | 无 | — | 否（`components/legal-text-page.spec.ts` 判的是共用组件壳，不是这两页在册路径） |
| 34 | `subpackages/legal/privacy/index.vue`(21) | E 无 | 无 | — | 否（同上） |
| 35 | `subpackages/profile-extra/profile/album.vue`(966) | E 无 | **`ensurePrivacyAuthorized`** | profile ✔ | **是** |
| 36 | `subpackages/profile-extra/profile/favorites.vue`(305) | E 无 | 无 | village ✔ | 否 |
| 37 | `subpackages/profile-extra/profile/other.vue`(563) | E 无 | 无 | likes ✔ report ✔ | 否 |
| 38 | `subpackages/profile-extra/profile/visitors.vue`(661) | E 无 | 无 | likes ✔ | 否 |
| 39 | `subpackages/profile-extra/profile/privacy.vue`(522) | C 仅命名 | 无 | profile ✔ | 否 |
| 40 | `subpackages/profile-extra/verification/index.vue`(1316) | E 无 | **`ensurePrivacyAuthorized`**（`:191`，选图前） | — | **是** |
| 41 | `subpackages/profile-extra/verification/real-name.vue`(1014) | E 无 | 无 | — | 否 |
| 42 | `subpackages/profile-extra/settings/dnd.vue`(995) | C 仅命名 | 无 | — | 否 |
| 43 | `subpackages/tools/love-center/mbti.vue`(681) | E 无 | 无 | — | 否 |
| 44 | `subpackages/tools/love-center/consulting.vue`(154) | E 无 | 无 | — | 否 |
| 45 | `subpackages/village/village/history.vue`(616) | E 无 | 无 | village ✔ | 否（但 `village.post` 命名空间被 B2 迁移改过，见 F-6） |
| 46 | `subpackages/village/village/publish.vue`(1494) | C 仅 token | **`ensurePrivacyAuthorized`** | circle ✔ profile ✔ session ✔ village ✔ | **是** |
| — | `subpackages/support/feedback/index.vue`(933) | D 仅注释 | 无（数据层 401） | feedback ✔ | 是（同 #15，注册页 `pages/register/index.vue` 有挂载判点，此页没有） |

**闸门存在却零业务判点的页面：23 页**（原 15 页 + 第五族「隐私授权」拉进来的 8 页：#17 `setup/profile`、#26 `campus/certification`、#27 `campus/post-topic`、#30 `circles/post-topic`、#35 `album`、#40 `verification/index`、#46 `publish`，加上本已是硬账的 #support/feedback）。
计数口径：`grep -rln "ensurePrivacyAuthorized" pages subpackages components` = **10 页在用**（另有 `pages/profile/index.vue` 与 `village/post.vue` 两页有挂载判点），而 `grep -rln "ensurePrivacyAuthorized" src/tests` = **只有 2 个文件**（`tests/pages/village-post-page.spec.ts` 判其中 1 页、`tests/utils/privacy.spec.ts` 判工具本身）⇒ **8 页的授权前置无人看管**，且这一族的失败形态是「微信后台未声明隐私指引 ⇒ chooseImage 静默返回空」，属真机腿才可见、静态判点最划算的一类。
其余 23 页是软账（合计 46 页）。

## FINDING F-2（P2）：`useAbortOnHide` 是死代码——「在途请求未取消」在全部 74 页成立

实测命令与读数：

```
grep -rn "useAbortOnHide" apps/client/src --include=*.vue --include=*.ts | grep -v tests
→ 唯一命中：services/http.ts:937 的一句注释「复用时（如 useAbortOnHide 的页面级 signal）…」
grep -rn "useAbortOnHide|abort-on-hide" apps/client/src/tests → 0 命中
逐页 grep abort=0（74/74）
```

- 载体存在（`composables/useAbortOnHide.ts`，含 mp-weixin AbortController 兜底与文档「用法：页面传入 request({ signal })」），**消费者 0 个、判点 0 条**。
- 直接后果：74 页里 **0 页**在 `onHide`/`onUnload` 取消在途请求。跨账号场景（登出→重登）与快速切页场景下，上一账号的在途响应会写回已被 `resetForLogout()` 清空的 store——这正是 F-3 的机制。
- 该兜底的 `signal.addEventListener` 本身是 no-op（文件内自述「已知限制」），即便今天接上也不保证真中止底层 `uni.request`。
- 生命周期组合实测（`onLoad`/`onShow`/`onUnload`/`onUnmounted` 逐页 grep）：
  - `onUnload` 只有 **2 页**注册（`subpackages/tools/daily-question/index.vue:109`、`subpackages/discover-extra/discover/history.vue`）；
  - 定时器面：全仓页面里带 `setInterval` 的 3 页（`pages/register/index.vue`、`subpackages/chat/chat-session/index.vue`、`subpackages/tools/heart-signals/index.vue`）**都有 `clearInterval`**，`pages/login/index.vue` 注释自证「本页已无 setInterval」，`onUnmounted` 4 处——**这一维没查到回归，如实记阴性**；
  - 首屏不取数形态：**0 页**「有 store 消费却无任何取数入口」——`legal/*`(21 行×2) 与 `tools/help`、`love-center/consulting`、`profile/privacy` 是纯静态/组件内取数，属正常；
  - 深链守卫面：22 页用 `onLoad((query)…)` 取参，抽判 8 页（`village/post`、`village/detail`、`village/tag-posts`、`campus/topic-detail`、`market/detail`、`match-success`、`messages`、`village/index`）**都有缺参兜底**；`village/tag-posts.vue:287-299` 是范本（先 `guideGuestToLogin()`，再判 `tagName` 缺失→toast+返回，注释还写明原两条泄漏路径）；`village/village/index.vue:547-553` 对非法 `?channel=` 静默回落默认频道（可接受，但**无判点**）。
  - 一条阴性结论要替产品记下来：`?dev-user=1` 直开注入 mock 会话的路径（`pages/messages/index.vue:351-356`）**已被 `utils/dev-user-gate.ts` 的 `isDev()||useMock()` 挡住**，生产包恒忽略——不是缺陷。

建议修法：把 `useAbortOnHide` 接进**受保护取数页的 top-N**（wallet/security/likes/likes-visitors/search/album/favorites/visitors/village-index），或删掉这个 composable 并在 `services/http.ts:937` 注释里停止引用；两条路都行，**留着不接是最差的一条**（它让「有取消机制」成为可被引用的假事实）。判点写法：静态钉「页面 import 了 useAbortOnHide 且 request 调用带 signal」，成本 1 条 `it`/页。

## FINDING F-3（P1）：登出清 25 个 store 之后，两处闸门状态**没人重新拉**，其中一处直接改变扣费分支

逐页抽判（3 处硬结论 + 2 处阴性）：

1. **签到状态：每日一问页不校正，全站只有两个 `fetchStatus()` 触发点。**
   `grep -rn "checkInStore.fetchStatus|fetchStatus" apps/client/src` → 非 store 内消费者的只有
   `services/websocket/store-dispatch.ts:402`（事件驱动）与 `subpackages/market/shop/index.vue:45`（onShow）。
   `subpackages/tools/daily-question/index.vue` 把 `checkInStore.checkedIn` 当**唯一渲染依据**（`:162`、`:205` 两处 `v-if="!checkInStore.checkedIn"` 决定锁屏与题目区），页面里**不调 fetchStatus**。
   登出→重登（同一账号、当天已签到）后：`stores/checkin.ts:571 resetForLogout(){ dispose(); $reset(); }` → `checkedIn=false`（`:217` state 初值），且 `:282` 的缓存短路 `(this.checkedIn !== null || this.consecutiveDays > 0) && isCacheFresh('checkin:status')` 在 $reset 后不成立；用户看到的是**锁屏 + 「去签到」**，必须再点一次 `checkIn()` 发 `POST /check-in`（幂等键 `checkin-<date>`）才回到题目页。
   次生风险（源码推导，**未跑真机，标口径**）：`checkIn()` 成功分支 `:464 this.checkedIn = true` + `:479 this.pointsBalance += this.pointsEarned`，而幂等重放返回的是同一份结果 ⇒ 本地余额在下次 `fetchStatus` 前虚加一份积分。
   判点缺口：`src/tests/stores/checkin.spec.ts` 在盘（store 有判点），`daily-question-page.spec.ts` 的 7 条 `it` 全是分页/loading/maxlength 维（实测标题逐条核过），**没有一条问「进页面时签到状态从哪来」**。
   建议修法：每日一问页 `onLoad`/`onShow` 调一次 `void checkInStore.fetchStatus().catch(...)`（store 自带短路，不会加往返），并在 `daily-question-page.spec.ts` 加 1 条静态判点（`onShow`/`onLoad` 体内必须出现 `fetchStatus(`）。

2. **VIP 状态：`vipStore.isVip` 在生产包恒假，而两页一组件把它当动作层免费放行依据。**
   `grep -rn "isVipRaw" apps/client/src` → 只有 3 处：`stores/vip.ts:76` 初始 `false`、`:94` computed 透传、`:304` `resetForLogout()` 置回 `false`。**没有任何代码路径把它写成 true，store 也没导出它。**
   即 `isVip = isShowcaseMode || false || isDevVipSimulated`（后者 `:85` 在 `!isDev && !useMock()` 下恒 false）⇒ 正式包恒 false。
   消费点全是动作层：
   - `subpackages/discover-extra/likes/index.vue:216`、`subpackages/discover-extra/likes-visitors/index.vue:212`：`if (featureFlags.membershipEnabled && vipStore.isVip) { …VIP 免费放行… return; }`，走不到这一支就落到下面的 `uni.showModal` 扣费确认 + `likesStore.unlockUser()` ⇒ **真 VIP 用户被按非 VIP 扣币**；
   - `components/discover/CardDetailOverlay.vue:435`、`:487`：VIP 免解锁发消息特权恒不生效。
   同仓**有**服务端喂的镜像：`stores/profile.ts:451-460` 从接口写 `isVip`（`profileStore.vipStatus`），并且已经被人正确消费（`composables/useAvatarFrame.ts:32-36`）。⇒ 判点缺口不是「不知道该怎么做」，是两处闸门没接到同一个来源。
   实测判点分布：`grep -rln "isVip|useVipStore" apps/client/src/tests` → `stores/profile.spec.ts`、`stores/session.spec.ts` 两个文件命中（判的是 profile 镜像与会话字段），**vipStore 这条链 0 判点**；`logout-registry.spec.ts` 只问「resetForLogout 存在且被调用」，恒绿的复位判点盖不住「源本来就没值」。
   建议修法（择一，都要带判点）：① `vipStore.isVip` 改成 `profileStore.vipStatus?.isVip` 的透传（一个 computed，删掉 isVipRaw）；② 登录后由 `refreshSession`/bootstrap 写 `isVipRaw`。判点：静态钉 `subpackages/discover-extra/likes/index.vue` 的 VIP 分支表达式引用同一枚来源 + 一条挂载测「profile 镜像 isVip=true 时不走扣费弹窗」。

3. **余额/列表类页面：实测是干净的，两条阴性要落账**（避免下轮再当假设查一遍）：
   - `subpackages/market/shop/index.vue:44-46` onShow 里 `if (commerceSealed.value) return; void checkInStore.fetchStatus();` ⇒ 它是**唯一**会顺手把签到状态拉回来的页面，但这属于巧合而非契约；
   - `subpackages/profile-extra/profile/favorites.vue:158-160` `onShow → villageStore.fetchPosts({}, true)`、`album.vue:431-433` `onShow → loadAlbum()`、`likes/index.vue:560` watch `isUnlocked` 变 true 后补拉、`discover/match-success.vue:103-120` 冷链/残留不一致时 `matchStore.reset()` + `loadFallbackPartner(userId)` ⇒ **「登出后回到该页空白/没人拉」在这些页不成立**。

4. 结构性原因（和 F-2 同一条）：`resetAccountScopedStores()` 在 `clientApi.logout()` 的 `finally` 里执行，而 `clearTokens()` 也在同一窗内被 `services/http.ts` 的 401 分支调用；**没有任何在途请求被取消**，所以「复位后被旧响应重新填上」的窗口在 74 页全部存在。这一条我只能给源码推导，真机腿判不出（本机无微信真机）。

判不出清单（本条）：跨账号「旧响应回写」的实际可见性需要真机/模拟器双账号连点；本地推导只到窗口存在为止。

## FINDING F-4（P1）：同一族闸门在页面层有三种粒度和四种实现，「动作层不判」确认存在 2 处

### 4.1 封存（commerceSealed）族：三种粒度

| 页面 | 谓词 | 粒度 |
|---|---|---|
| `subpackages/market/shop/index.vue:32` | `!appConfig.isCommerceOn()` | **只判总闸 commerce.enabled** |
| `subpackages/market/detail/index.vue:33` | `!appConfig.isCommerceOn()` | **只判总闸** |
| `subpackages/market/wallet/index.vue:57` | `!appConfig.isCommerceOn("coin")` | 分域 coin |
| `subpackages/discover-extra/likes/index.vue:66`、`likes-visitors/index.vue:57` | `commerceCoinOn = isCommerceOn("coin")` | 分域 coin |
| `subpackages/tools/love-center/index.vue:75-76` | 自造 `isBoardSealed(boardId)`：`(boardId==="love-course"\|\|"social-course") && !isCommerceOn("consult")` | 分域 consult，且只罩两块板 |
| `subpackages/profile-extra/settings/index.vue:371` | `if (appConfig.isCommerceOn("coin"))` | 分域 coin |

后端实际下发的键（`grep -oE '"?commerce\.[a-z_]+' apps/api/src/main/java`）= `commerce.enabled / commerce.coin / commerce.consult / commerce.course / commerce.vip`。
⇒ **若运维按 likes/wallet 的口径封 `commerce.coin=false` 而 `commerce.enabled=true`，商城列表页与商品详情页不会封存**（钱包、喜欢解锁、设置页会）。这是同一族闸门里唯一两处「只判总闸」的页面，仓内没有任何注释或判点声明「商城归总闸管」，所以无法把它当成有意设计来记账。
建议修法：二选一并留痕——① shop/detail 改 `isCommerceOn("coin")`；② 若商城确实只随总闸，就在两页谓词旁写一行口径注释 + 一条静态判点（`market/shop/index.vue` 里 `isCommerceOn()` 必须无参），防止下轮又被「统一粒度」顺手改掉。

### 4.2 「闸门只在展示层」的两处确认 + 三处阴性

确认（动作层不判）：
1. **`subpackages/tools/love-center/nearby.vue` 的每日推荐配额**：寻觅页 `pages/discover/index.vue` 在动作层判（`:138`、`:168` 两处 `uni.showToast({ title: t("discover.card.quotaExhaustedTitle") })` 早退），本页动作只有自造的 `requireLogin()`（`:94-99`，仅 toast 不跳），`handleSwipe`/`handleSuperLike` 直调 `discoverStore.swipeRight/swipeLeft`；`stores/discover/actions/swipe.ts` 里 `grep quotaExhausted|remaining|dailyLimit` **0 命中** ⇒ 配额判定既不在页面动作层也不在 store，只在寻觅页。且本页 `:215` 给 `CardSwiper` 传的是**写死的 `:remaining-count="0"`**。
   另注：`components/discover/CardSwiper.vue:125` 声明了必填 prop `remainingCount`，**全组件其余部分 0 次引用**（`grep -n "remaining" components/discover/CardSwiper.vue` 只命中声明行）⇒ 这个 prop 是死口，谁传都不影响渲染与拦截，把「剩余次数」的表达责任留在了 `pages/discover` 页内（`:358`），复用同一卡片的第二页（本页）因此天然没有配额展示也没有配额闸门。
2. **`subpackages/profile-extra/profile/tasks.vue` 的 `checkedInToday`**：`:403-404` 只在渲染分支里判（后端字段回填 UI），没有动作层出口；`subpackages/market/shop/index.vue:44` 同理（封存时早退取数，无动作可判，属正常）。

阴性（实测干净，替后续车道省一次重复排查）：
- `subpackages/market/detail/index.vue:252-256` `handleBuyNow()` 动作层判封存（先 toast 再 return）；
- `subpackages/tools/love-center/index.vue:91` `onBoardTap` 动作层判 `isBoardSealed`，且模板 `:156` 同步 `:aria-disabled`；
- `subpackages/discover-extra/likes/index.vue:201-204`、`likes-visitors/index.vue:153/201` 的 `handleUnlock` 动作层判 `commerceCoinOn` 与 `isUnlocked`（`!isUnlocked` 直接 return）。

### 4.3 游客闸门的四种实现与在册覆盖

实测四种并存：
1. `guideGuestToLogin()`（`guards/guest-access.ts`，onLoad 第一句、先于任何请求）——**7 页**在用：`campus/campus/index`、`discover-extra/discover/matching`、`market/wallet`、`setup/campus`、`setup/recommend-pref`、`tools/security`、`village/tag-posts`；
2. `usePageAccess(requirements)`（onShow 判定）——**11 页**；但它 `:79-81` 对「本地无 token 的游客」**故意 return 放行**（`guest-landing-policy.json` 的 anchors[3] 就是把这句钉成锚点的），所以它**不是游客闸门**，只是失效 token/权限闸门；
3. 页内 `LockScreen`/`NotLoggedWaiting`/`guest-guide` 展示层引导——15 页；
4. 页内自造 `requireLogin()`（只 toast）——`pages/discover/index.vue`、`subpackages/tools/love-center/nearby.vue`。

在册名册 `scripts/qa/guest-landing-policy.json` 只有 **30 行**（25 行 `guide-401`、3 行 `flag-bounce`、2 行 `guard-bounce`）。两处账不平：
- **5 页已用 `guideGuestToLogin()` 却在册记 `family=guide-401`**（`campus/campus/index`、`discover/matching`、`setup/campus`、`setup/recommend-pref`、`village/tag-posts`，源码自 a51323ce(2026-09-29) 起就是守卫先行，而 `guard-bounce` 这一族是 2026-10-31 为 wallet/security 新立的）。由于两族落地页与标记类相同（`.login-page__brand`，见 markers），**设备腿跑得绿也分辨不出「守卫先行」还是「请求先漏出去再被 401 弹走」**——真正钉住顺序的是 `src/tests/pages/guest-landing-pairs.spec.ts`（本轮实测通过）。⇒ 归因口径失真，但判点没漏。
- **`src/tests/guest-landing-policy.spec.ts` 不查这一维**：它 5 条 `it` 实测判的是「锚点存在且唯一」「rows[].page 有源文件」「family 在 markers 有口径」「wallet/security 两行在册且 family=guard-bounce」「派生名册含这两行」。**没有任何一条问「源码里调用 guideGuestToLogin 的页面集合 == 在册 family=guard-bounce 的页面集合」**。
  建议修法（1 条判点，穷尽门）：在该 spec 加一条 `it`，用 `readdirSync` 扫 `subpackages`/`pages` 得到调用 `guideGuestToLogin()` 的页路径集合，与 `policy.rows.filter(family==='guard-bounce')` 做双向对账（本仓已有同款穷尽门：`stores/logout-registry.spec.ts` 的 store 对账，实测在盘且通过）。加上这条后，上面 5 行要么改 family，要么改锚点，不再靠人记得。

### 4.4 第五族闸门：隐私授权（本轮补数时才发现，主控题面未列）

`grep -rln "ensurePrivacyAuthorized" pages subpackages components` = **10 页**在用（`pages/profile`、`campus/certification`、`campus/post-topic`、`circles/post-topic`、`profile/album`、`verification/index`、`setup/profile`、`support/feedback`、`village/post`、`village/publish`）。
`grep -rln "ensurePrivacyAuthorized" src/tests` = **2 个文件**：`pages/village-post-page.spec.ts`（只判 post 页）与 `utils/privacy.spec.ts`（判工具本身）。
⇒ **8 页的「选图/上传前必须先过隐私授权」这条前置零判点**（这 8 页全部落在 F-1 的 46 页账里）。这一族的失败形态是微信端 `chooseImage` 静默返回空/报 112 类隐私错误，真机腿才看得见，**最适合用静态判点**：一条门即可覆盖——「凡调用 `chooseImage|chooseMedia|uploadFile|compressImage` 的页面，其调用点之前必须出现 `ensurePrivacyAuthorized`」。
建议修法：把这条做成 `scripts/qa` 形态的扫描门（与 F-7 的 a11y 基线门同批装），存量 8 页一次入册递减。

## FINDING F-5（P3）：无障碍/平台差异抽样实测数（只报数到条的）

载具：自建 node 扫描器（跨行抓 `<input …>`/`<image …>` 开标签，按属性判定），仓外草稿 `a11y-census.cjs`。**不用单行 grep**——单行 `grep -oE "<input[^>]*"` 会把跨行标签截断，实测把「缺 maxlength」数成 48/48（全中），修正后是 21/48；同理 `pages/register/index.vue` 的 5 个 input 其实**全部带 maxlength**，按单行口径会被误报 5 条。这条口径教训建议进下一轮车道交接。

- `<input>` 总数 **48**，缺 `maxlength` **21 条 / 13 个页面**（微信端静默截 140 的那条约定）：
  `tools/security/index.vue` **6**、`support/feedback/index.vue` 2、`tools/search/index.vue` 2、`campus/certification.vue` 2、`vip/promo-code.vue` 1、`village/post.vue`… 0（实测 0，前一轮印象里的 3 条是单行 grep 假数）、`pages/login/index.vue` 1、`pages/messages/index.vue` 1、`campus/hub.vue` 1、`campus/post-topic.vue` 1、`campus/topic-detail.vue` 1、`chat/chat-session/index.vue` 1、`chat/official-chat/index.vue` 1、`circles/post-topic.vue` 1、`circles/topic-detail.vue` 1、`discover-extra/likes/index.vue` 1、`setup/schedule/index.vue` 1。
  最重的是安全中心（改绑手机号 `type="number"` + 4 个 `type="password"` + 注销确认文本框），注销确认框无 maxlength 属**语义风险**（要输 `DELETE` 类确认串，被截不会致错，但手机号框被截会静默少位）。
- `<image>` 总数 **387**，缺可访问名（既无 `alt` 也无 `aria-label`）**80 条 / 30 个页面**。最集中：`circles/circle-home.vue` **13/13**（整页图片全无名）、`pages/messages/index.vue` 13/18、`village/detail.vue` 7/23、`village/post.vue` 4/21、`official-chat` 4/14、`pages/profile/index.vue` 4/13、`verification/index.vue` 3/9、`campus/index.vue` 3/4、`match-success.vue` 3/4。
  在册覆盖：`components/press-feedback-and-image-name.spec.ts` 用**显式 3 页 6 例**的 case 表钉 image 命名（official-chat、certification、chat-session），**没有穷尽门**（`grep 穷尽|exhaustive|allImages` 0 命中）⇒ 其余 74 条无判点。
- 触屏按压反馈：`@tap/@click` 有 handler 而整文件 0 处 `press-feedback` 的页面 **3 个**：`profile-extra/notifications/index.vue`(4 handler)、`profile-extra/profile/other.vue`(5)、`setup/campus/index.vue`(3)。

建议修法：这三族都走「先装穷尽门再清存量」——把 21/80/3 三个数写成 `readFileSync` 扫描式基线（本仓 `scripts/qa/audit-fallback-literals.cjs` 就是同形态），新页命中即红，存量按清单递减；比逐页补挂载测便宜一个量级。

## FINDING F-6（P3）：B2 的 i18n 迁移是等价改写，但有 1 个孤儿键与 1 处口径要先纠

**先纠一处题面事实**：任务说「抽 `git diff 74e681ca^ 74e681ca`」。实测 `74e681ca` 是**纯文档提交**（`git show --stat` = 9 个 `reports/audit/*.md`，2474 insertions，0 个 .vue/.ts）。三个页面的迁移在 **`b8a60114`**（第五轮修复提交：`i18n/locales/zh-CN.ts +86`、`pages/register/index.vue 54±`、`village/post.vue 92±`、`village/publish.vue 102±`）。下面全部按 `b8a60114^..b8a60114` 对。

读数：
- 新增键 **80 个**（从 diff `+` 行按 `"k":` 提取），全部落进**既有命名空间** `village.post.*`（51 个）与 `register.*`（29 个），没有新造顶层命名空间；publish/post 两页共用同一批 `village.post.*`（`grep -c village.post` = publish 79 / post 68，同键同值，符合 diff 里「两页同文的串共用同一个键」的自述）。
- **孤儿键 1 个**：`village.post.presetTags`（8 元素数组：校园日常/兴趣分享/找搭子/求助/表白墙/校友动态/生活记录/技术交流）。判法：先把 `newkeys.txt` 的裸键名逐个 `grep -rlF "<dotted>" pages subpackages components stores services composables config` —— 第一轮**全部 80 个都报孤儿**是我的判点坏了（页面里写 `t("village.post.xxx")`，裸键名带引号搜不到；另 python 写出 `dotted.txt` 带 `\r\n`，`grep -F` 拿到的模式尾部有 CR，也是恒 0）。修好判法后：79 个有引用，**只有 `presetTags` 0 引用**，而页面上这 8 个标签的文本仍散在 `components/village/HotTopicsSection.vue:85`、`config/popular-topics.ts:43` 的裸中文里 ⇒ 键加了没接线，是**新增的第二处真值来源**（未来两边会漂）。
- **非等价改写：0 条。** 逐字对 10 组（旧字面 vs 新键值）：
  | 旧（页面裸中文） | 新键 | 值 | 判定 |
  |---|---|---|---|
  | `创建账号` | `register.title` | `创建账号` | 逐字 |
  | `用手机号注册，开始遇见同频的人` | `register.subtitle` | 同 | 逐字 |
  | `` `重新发送 ${smsCountdown}s` `` | `register.smsResendCountdown` | `重新发送 {n}s` | 等价（占位符化） |
  | `设置密码（8–20 位）` | `register.passwordPlaceholder` | 同 | 逐字（en-dash 未漂） |
  | `昵称（1–20 字）` / `需满 18 周岁` / `注 册` / `注 册 中` / `已有账号？` / `去登录` | `register.*` | 同 | 逐字（含「注 册」的排版空格都保住了） |
  | `该话题已添加` / `` `最多 ${POST_MAX_CUSTOM_TAGS} 个话题` `` | `village.post.topicAlreadyAddedToast` / `maxTopicsToast`=`最多 {n} 个话题` | 等价 |
  | `已在正文末尾插入 @，请输入昵称` | `mentionInsertedToast`=`已在正文末尾插入 {'@'}，请输入昵称` | 等价（`{'@'}` 是 vue-i18n 链接语法转义，渲染同文；diff 注释自述两版输出实测一致） |
  | `位置仅保存在草稿，暂不随本条帖子对外展示` | `locationDraftOnlyNote` | 同 | 逐字 |
  | `真实分享校园生活，友善互动，让更多人认识有趣的你～` | `publishTipDesc` | 同 | 逐字（波浪号保留） |
  | `<text class="post-tool__label">更多</text>` | 复用既有 `common.more`（zh-CN:37/365 = `更多`） | 逐字，且**没为它新建键** |
  没有发现被顺手改成排比/口号的串；`兴趣圈子发帖暂不支持话题，所选话题不会随本条发布` 这类长告警句原样搬入。
- 键位一致性/回归面：`pages/register/index.vue` 与 `village/post.vue` 的 5 + 3 个 `<input>` **全部保留 `maxlength`**（F-5 复量确认），迁移没有连带丢属性。
- **判不出**：`b8a60114` 只改 `zh-CN.ts`，`i18n/locales/` 目录下**没有 en-US.ts**（实测 `ls`），`i18n/index.ts:23,48` 声明 `locale/fallbackLocale` 均 `zh-CN` ⇒ 「英文键缺失」这条常见红在本仓不成立，不是遗漏。
- 在册判点：`src/tests/i18n.spec.ts` **实测 102 tests 全绿（5.92s）**，但它判的是 Admin 视图/store 回退/法律文本/mock 夹具四类键存在性，**不覆盖 `village.post.*`/`register.*` 这批新键**，也没有「键加了但页面不引用」的反向孤儿门 ⇒ 上面那个 `presetTags` 孤儿是靠本车道手工发现的，盘上无人看管。
  建议修法：把孤儿判定做成一条静态门（解析 `zh-CN.ts` 得全 dotted 键集 → 扫 `pages/subpackages/components/stores` 引用 → 报告未被引用且无 `t()` 动态拼接前缀的键），先以 `presetTags` 为首个存量红入册。

## FINDING F-7（建议，非缺陷）：页面级契约推进方案与实测成本

### 两种既有口径的适用边界（都用盘上真文件量过）

| 口径 | 范本文件 | 实测行数 | 覆盖页面 LOC | 比率 | 能证什么 |
|---|---|---|---|---|---|
| 静态源码契约（`readFileSync` + `@vue/compiler-sfc`） | `pages/daily-question-page.spec.ts` | 82 | 891 | 9.2% | 判点读哪个旗标、守卫排在哪句之前、模板绑了哪个常量 |
| 同上（多页共用一文件） | `pages/guest-landing-pairs.spec.ts` | 139 | 3,308（5 页） | 4.2% | onLoad 第一句、被让位的原路径、目标不硬编码 |
| 同上（含 store+api 三层） | `pages/village-post-delete.spec.ts` | 309 | 3,691 + store | 8.4% | 请求形态、四处列表摘除、失败不动列表、页面二次确认 |
| 同上（跨 5 源文件） | `pages/nearby-page.spec.ts` | 116 | 8,744 | 1.3% | 路由/Tab 单源 + 页内取数入口 |
| 挂载式运行时契约 | `components/wallet-recharge-idempotency.spec.ts` | 270 | 691 | 39.0% | **真点按钮真不发请求/真带 Idempotency-Key** |
| 挂载式 | `pages/wallet-security-guest-gate.spec.ts` | 213 | 1,921（2 页） | 11.1% | 游客档控件不渲染、GET 不发 |
| 挂载式 | `pages/heart-signals-countdown.spec.ts` | 209 | 826 | 25.3% | 倒计时随卸载停止 |
| 挂载式 | `components/login-index.spec.ts` / `profile-index` / `register-index` / `settings-index` | 206 / 142 / 255 / 181 | 1,484 / 3,164 / 1,435 / 991 | 13.9% / 4.5% / 17.8% / 18.3% | 渲染分支与交互结果 |

结论口径：**静态契约中位 ~5%（1.3%–10.9%），挂载契约中位 ~18%（4.5%–39%）**，差 3–4 倍。

### 分工判据（不要逐页拍脑袋）

- **必须挂载**（判据是「动作层不发请求/不扣费/不进分支」，静态正则读不出条件求值顺序与响应式来源）：**6 页**
  `discover-extra/likes/index.vue`、`discover-extra/likes-visitors/index.vue`（VIP 免费放行分支 + coin 封存 + 余额不足跳转，正是 F-3/F-4 两处动作层）、`tools/love-center/nearby.vue`（配额绕过）、`market/shop/index.vue` + `market/detail/index.vue`（封存粒度）、`profile-extra/feedback/history.vue`（`page-access.ts:109` 明写它没有入口守卫，只有 401 兜底）。
- **静态即可**（判据是「守卫句顺序 / 取数入口唯一 / 模板绑哪枚常量」）：**9 页**
  `pages/discover/index.vue`（`quotaExhausted` 动作早退两处）、`tools/search/index.vue`、`discover-extra/discover/history.vue`、`tools/activities/detail.vue`、`discover/activities/index.vue`、`discover/discussions/index.vue`、`tools/help/index.vue`、`profile-extra/profile/tasks.vue`、`chat/official-chat/index.vue`。
- **不该逐页补、应换成穷尽门**：其余 **31 页**（含 F-4.4 的 8 页隐私授权维）。四条门：
  1. 游客守卫对账门（F-4.3，扩展 `guest-landing-policy.spec.ts`，~90 行，形态照抄 `stores/logout-registry.spec.ts`）；
  2. 封存粒度门（`isCommerceOn(` 的 module 参数与页面归属表对账，~60 行）；
  3. a11y 基线递减门（21 条缺 maxlength / 80 条缺可访问名 / 3 页缺按压反馈，~120 行，形态照抄 `scripts/qa/audit-fallback-literals.cjs`）；
  4. 隐私授权前置门（F-4.4：10 页在用 vs 1 页有判点，凡 `chooseImage|chooseMedia|uploadFile|compressImage` 调用点前必须有 `ensurePrivacyAuthorized`，~70 行）。

### 成本（按实测行数，不拍脑袋）

| 项 | 页数 | 页面 LOC | 单价（实测口径） | 增量 spec 行 |
|---|---|---|---|---|
| 挂载判点 | 6 | 6,198 | 0.18 | ≈ 1,116 |
| 静态判点 | 9 | 8,660 | 0.05 | ≈ 433 |
| 四条穷尽门 | 31（含隐私族 8） | — | — | ≈ 340 |
| **合计（23 硬账页 + 31 软账页的门）** | 46 | 36,136 | — | **≈ 1,889 行 / 约 13–17 个文件** |

对照：46 页全按挂载口径 ≈ 36,136 × 0.18 ≈ **6,500 行**（本方案 3.6 倍）；全静态 ≈ 1,800 行但**证不到动作层**（F-3 的 VIP 扣费分支、F-4 的配额绕过照漏）。
运行时成本（实测吞吐）：`i18n.spec.ts` 单文件 102 tests 跑 5.92s（environment 3.09s）；4 文件 30 tests 跑 40.26s（environment 累计 96.77s ⇒ **每个 jsdom 环境 2–4s**，与用例数几乎无关）。⇒ 新增 6 个挂载文件 ≈ +20–25s，9 静态 + 3 门 ≈ +8–12s。现有盘子 151 文件 / 1,573 个 `it`，增量占比可接受。
落地次序：第 1 批只做 4 条门 + `likes`/`likes-visitors` 两个挂载文件（先把 F-3 的 VIP、F-4 的 coin、F-4.4 的隐私授权三条钉住）；第 2 批 9 页静态；第 3 批剩余 4 页挂载。

## 本车道实际跑过的命令与读数（台账）

| 命令 | 读数 |
|---|---|
| `find pages -name "*.vue"` / `find subpackages …` | 8 / 66 ⇒ 74 页 |
| `grep -cE '"path"' pages.json` | 74（与页面 1:1） |
| spec 清点 | 151 个 `.spec.ts`；`it/test` 共 1,573 个用例 |
| `grep -rohE "(pages\|subpackages)/[…]+\.vue" src/tests \| sort -u` | 32 个页面路径 |
| 自建 `census.cjs`（三层口径逐页分类） | A挂载 11 / B静态 12 / B动态路径 5 / C仅风格 8 / D仅注释 1 / E零引用 37；页面总 LOC 71,719，无业务判点 46 页 36,136 行 |
| `grep -rn "useAbortOnHide" \| grep -v tests` | 1 命中且是 `services/http.ts:937` 的注释 ⇒ 消费者 0、判点 0 |
| 逐页 `grep -c "onUnload("` | 全仓仅 2 页注册（`tools/daily-question/index.vue:109`、`discover-extra/discover/history.vue`） |
| `grep -rln "setInterval" pages subpackages` | 3 页，全部有 `clearInterval`；login 注释自证已无 setInterval ⇒ 定时器面阴性 |
| `grep -rnE "guideGuestToLogin" pages subpackages` | 7 页；在册 `guard-bounce` 只 2 页 ⇒ 5 页 family 失真 |
| python 解析 `scripts/qa/guest-landing-policy.json` | rows 30（guide-401 25 / flag-bounce 3 / guard-bounce 2）、anchors 18、markers 3 族 |
| `grep -rn "checkInStore.fetchStatus"`（去 store 内） | 2 个消费者：`websocket/store-dispatch.ts:402`、`market/shop/index.vue:45`；每日一问页 0 |
| `grep -rn "isVipRaw" apps/client/src` | 3 处（初始 false / computed 透传 / 登出置 false），**无写 true 的路径** |
| `grep -rn "isCommerceOn(" --include=*.vue` | 无参 2 页（shop/detail）、`"coin"` 5、`"consult"` 3、`"course"` 1、`"vip"` 1；后端下发 5 个 commerce.* 键 |
| `grep -n "remaining" components/discover/CardSwiper.vue` | 仅 1 行（prop 声明）⇒ 死 prop |
| `grep -rn "quotaExhausted" src/tests` | 0 命中 |
| 自建 `a11y-census.cjs`（跨行抓标签） | `<input>` 48 / 缺 maxlength 21（13 页）；`<image>` 387 / 缺可访问名 80（30 页）；有 handler 无 `press-feedback` 3 页 |
| 单行 grep 对照（**反例**） | 同一目标单行 `grep -oE "<input[^>]*"` 数出 48/48 ⇒ 跨行标签被截断，单行口径不可用 |
| `git show --stat 74e681ca` | 9 个 `reports/audit/*.md`、2474 insertions、**0 个源码文件** ⇒ 任务给的 diff 锚不成立 |
| `git diff --stat b8a60114^ b8a60114 -- <3 页 + locales>` | zh-CN.ts +86、`register/index.vue` 54±、`village/post.vue` 92±、`village/publish.vue` 102±；**无 en-US.ts**（`ls i18n/locales/` 只有 zh-CN.ts） |
| `git log -1 -S "guideGuestToLogin" -- <5 页>` | 全部 a51323ce（2026-09-29）⇒ 早于 `guard-bounce` 一族（2026-10-31） |
| `PATH=…/node-v22 npx vitest run src/tests/pages/guest-landing-pairs.spec.ts src/tests/pages/daily-question-page.spec.ts src/tests/stores/logout-registry.spec.ts src/tests/pages/wallet-security-guest-gate.spec.ts` | **4 files / 30 tests 全绿**，40.26s |
| `PATH=…/node-v22 npx vitest run src/tests/i18n.spec.ts` | **102 tests 全绿**，5.92s |

未跑：`npm run test:client`（会往 `src/services/generated/api-types.ts` 写盘）、maven（另一车道独占）、dev server、构建。仓库文件除本报告外零改动；草稿与扫描器全在仓外 `C:\Users\dsghy\AppData\Local\Temp\lanef\`。

## 判不出清单（如实交下轮或真机腿）

1. **微信真机/开发者工具腿全部判不出**：静默截 140 的实际截断行为、`reLaunch` 后 Tab 页是否重建、登出→重登的跨账号可见残留（F-3 第 4 点的响应回写窗口）、锁屏/引导层实机墨迹。本机无微信真机链路，未起 dev server。
2. **每日一问「去签到」二次点击的后端语义**判不出是 201 新签到还是幂等重放返回旧结果（`checkIn()` 成功分支无条件 `pointsBalance += pointsEarned`，重放即本地虚加）——需要 `/check-in` 的 `@Idempotent` 实测响应，maven 归另一车道。
3. **真 VIP 账号是否真被扣币**（F-3 第 2 点）：源码已证 `vipStore.isVip` 正式包恒假，但「会员走 `POST /wallet/unlock` 是否真扣」需带会员身份的钱包流水核对，本地无凭据。
4. **商城只判总闸是有意还是遗漏**（F-4.1）：五个 commerce.* 键都下发，但 ADR-2 原文没给商城归属；本车道只记「两侧都无判点」这一事实，不替产品裁定。
5. **80 条缺可访问名 `<image>` 的实际读屏影响**：只数了静态条数；读屏器实机播报未验证。带 `alt=""` 的装饰图已按「有声明」排除，口径写清在此。
6. **41 页零引用里有多少被 e2e 腿覆盖**：`tests/e2e/specs/all-pages-smoke.spec.ts` 存在且吃 `routes.generated.ts`（派生自 policy 的 30 行），**其余 44 页不在派生名册** ⇒ 页面级 e2e 也不覆盖它们；但 all-pages-smoke 本轮能否跑（需 dev server + 租约）判不出。

## 一句话结论

46 页（36,136 行，占页面代码 50.4%）无业务级页面判点，其中 **23 页带真实闸门**（配额 / 封存 / 会员 / 游客落地 / 隐私授权五族）；本批登出清理新暴露的两处「状态源没人重新拉」里，**VIP 那处直接改变扣费分支且全仓 0 判点**；`useAbortOnHide` 是被注释引用但无人接的死机制；i18n 迁移 80 个键全部等价改写、0 条非等价、1 个孤儿键（`village.post.presetTags`）；主控的 43 页账按口径修正为 46 页（32 字面引用 + 5 动态路径引用 − 9 个只有风格/注释判点的页面）。

