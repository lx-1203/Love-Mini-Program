# 登录页取景可达性：一条被写进名册的错判，以及修仪器后怎么作废它

日期 2026-10-23（R14 轮中）。触发点：收口门 coverage 判据报
`SWEEPCOVER_PROBLEM 够不着名册里的 pages/login/index 这一轮真拍到了 2 张可用帧 ⇒ 把该行从名册删掉，豁免不许赖着`（R12 那一发）。
名册里那行是 R13 轮写进去的，理由栏写着"构造上拍不到"，证据栏写着"R12 的『登录帧』经查实为 discover 误录"。
这条证据句是**错的**，本文把它按实测改写，并记下仪器为此补的那只手。

## 一、实测：R10/R11/R12 的 login 帧是真登录页

逐轮读各轮 `sweep-manifest.json` 自己的落点读数（不是我看着文件名猜的）：

| 轮 | top | bottom | 清单自记 landingPath | landingMismatch |
|---|---|---|---|---|
| R10 | 169557B `b307df7d…` | 165986B `d3e3b7d2…` | `pages/login/index` | false |
| R11 | 171907B `398eb3fc…` | 168357B `d9cd1632…` | `pages/login/index` | false |
| R12 | 210087B `8d20c664…` | 209363B `ee7e70dc…` | `pages/login/index` | false |
| R13 | 162995B `c96eaa63…` | 166621B `46601f51…` | `pages/discover/index` | **true** |
| R14 | 163060B `096f6c85…` | 166777B `2ac0ca55…` | `pages/discover/index` | **true** |

再把 R12 的 `pages__login__index__top.png` 用 Read 打开看过：画面是登录表单本体
（寻觅 / 遇见同频的人 / 微信一键登录 / 手机号快捷登录 / 稍后再看 / 没有账号？去注册 / 协议勾选），
不是寻觅页。⇒ "R12 登录帧为 discover 误录"这句撤回。R13/R14 那两张才是真落错页（且仪器已如实标 mismatch）。

## 二、根因：R13 的水合修复把这只门一起关死了

`pages/login/index.vue` 的转发判定读 `sessionStore.isLoggedIn`，而它只是
`Boolean(state.userSession?.loggedIn)`（`apps/client/src/stores/session.ts:340`），
`userSession` 由 `bootstrap()` 从 storage 填。于是：

- **有票但 store 未水合** ⇒ `isLoggedIn=false` ⇒ 页面停在登录页 ⇒ 拍得到（R10-R12 就是这个条件，撞上的）；
- store 一水合 ⇒ 立刻转 discover ⇒ 拍不到。

R13 为了修 chat / official-chat / discover-activities 三页在 userSession 未水合窗口期把已登录用户弹去登录页的问题，
给取景腿加了**全局一次性**显式 `session.bootstrap()`（`scripts/qa/shoot-fidelity-sweep.mjs` 的 `SWEEP_SESSION_BOOTSTRAP`）。
那三页是对的，但水合是全局的，顺带把 login 唯一的可达条件也消灭了——
所以 R13 之后 login 恒落 discover，被当成"构造上够不着"登进名册。
名册的 reason 栏描述的其实是**自家仪器改后的行为**，却被写成了产品的固有属性。

## 三、补的那只手：`--no-bootstrap`

旗标语义（写在代码注释里，不靠本文档记忆）：
1. 开场不做全局水合（票仍写进 storage）；
2. **必须**在 warmup 之后把 store 的 `userSession` 清回未水合（`SWEEP_SESSION_DEHYDRATE`）。
   第 2 步不是可选：warmup 会真启动应用，`App.onLaunch` 自己就 bootstrap 了，
   只跳过开场引导实测无效（2026-10-23 第一发探针：两帧仍落 discover）。
   清 store 而不动 storage，才复现出 R10-R12 那个条件。

实测两发：
- 探针（`--only pages/login/index`，独立 out 目录）：`loggedIn:true->false` ⇒
  top 210214B / bottom 209424B，落点 `pages/login/index`，`landingMismatch=0`，`FIDELITYSWEEP_RESULT=PASS`；
  帧画面肉眼核对为登录表单（与 R12 同构图，仅状态栏时钟不同）。
- 回填 R13 / R14：各得 2 张可用帧（R13 `c88d78b4`/`d0c3ae26`，R14 `96bb31c5`/`4090fdcb`），
  清单路由数仍 71（按路由×状态合并，没动别的页的读数）。

## 四、名册那行的作废，以及新帧的去向

覆盖门的判点是"名册里的页一旦真拍到可用帧就把那行判红"。login 现在每轮都拍得到 ⇒
该行按门自己的规矩从 `blocked-routes.json` 删除，不靠豁免留着。
删之前它挡的是 R12 那一发的绿，删之后 R12/R13/R14 的覆盖门都该按"真覆盖"过。

login 的两张 R14 帧是**第一次进找茬分母**（前两轮它们是坏帧，从没被审过），
所以补派一条只跑这页的泳道 `R14-L15`（任务书 `tmp/qa/lanes/R14/R14-L15.brief.md`，
派发记在 `tmp/qa/lanes/R14/finder-dispatch-manifest.json`），
而不是让别的泳道顺手带——带不到，它们的分母里没有这页。

## 五、这条账的形状（给下一程）

- 仪器改一处全局行为，要顺手数一遍它**关掉了**哪些页的可达条件；否则"拍不到"会被登记成"产品够不着"，
  而名册一旦写下，下一程就拿它当豁免理由，错判就有了自我延续的载体。
- 名册里凡是"某轮的帧是误录"这种关于**证据**的断言，必须绑一个盘上现存的档名＋哈希，
  能被下一程直接打开核对；否则它就是一句无法证伪的话。本条那句就是没绑住才活了一轮。
