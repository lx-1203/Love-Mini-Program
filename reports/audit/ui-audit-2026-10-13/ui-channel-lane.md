# UI 通道腿（ui-channel-lane）— 2026-10-13

本轮职责：① 拉起 DevTools 自动化通道并用正向对照证明它真能驱动；② 在 mock / real 两档做「附近 tab」带内验证（`/api/v1/config/campuses` 401 豁免修复的行为取证）。
纪律：每个结论都贴机器行原文；租约用 `scripts/qa/ui-lease.mjs`；临时件只落 `tmp/qa/`；不改 `scripts/qa/**`、`apps/**`、`.zcode/**`、台账。

状态：**进行中**（骨架先行，逐步追加）。

## 通道就绪读数

DevTools 本轮起点 = **未运行**（`tasklist | grep -i wechatdevtools` → 无匹配；`netstat` 9000-9999 段无 automator 端口）。零点击冷启按在册路线跑通，两条命令都由 `tmp/qa/v37-lease-run.mjs` 包着租约跑（锁文件 `tmp/qa/locks/ui-audit-v37.lock`，owner=`ui-channel-lane-v37`）。

① `check_wechatide_status`（cli-automator 子进程 argv 形态，`tmp/qa/run-check-ide-status.mjs`，node22）：

```
LEASE_BEFORE=[]
LEASE_RESULT=ACQUIRED file=D:\6\恋爱小程序\tmp\qa\locks\ui-audit-v37.lock owner=ui-channel-lane-v37 pid=29760
[wechatide] toolCall:check_wechatide_status requires toolCall:auth,now running toolCall:auth for client=Qoder
STATUS_JSON={"success":true,"loginExpired":false,"loginUser":{"nickName":"烙吢魺",…},"skillVersion":"0.3.9","tokenRequired":false,"versionRelation":"skip_check",…}
ELAPSED_MS=6171
CHILD_EXIT=0
LEASE_RELEASE={"released":true,…} / LEASE_HELD_AFTER=[]
```

⇒ IDE 服务端口起来：`TCP 127.0.0.1:9430 … LISTENING 15176`（9430 在听 ≠ 自动化通道，只是命令被接受后的副作用）。

② `node22 scripts/qa/ws-channel-up.mjs --project apps/client/dist/build/mp-weixin-real --wait 300`（端口由脚本自己发现，读 `scripts/qa/ide-port.json` → 9420）：

```
IDE_PORT_SOURCE=config D:/6/恋爱小程序/scripts/qa/ide-port.json → 9420
WS_DOWN_REASON connect ECONNREFUSED 127.0.0.1:9420
WS_UP_SPAWNED pid=37008 cli=auto --auto-port 9420 project=…\mp-weixin-real
  · 3s 端口 9420 未监听；9000-9999 段在听的是 9430
  · 20s / 33s / 46s timeout waiting for automator response
  · 49s~58s Cannot destructure property 'rawPath' of 't.getPageMetaByWebviewId(...)' as it is null.
WS_UP=OK port=9420 ownerPid=24892 等待=61s connectMs=123 page=pages/login/index hits=00000000 单条查询=13.5ms
WS_UP_BAND=match port=9420 本腿要的档位 project=…\mp-weixin-real VITE_API_MODE=real MODE=real envSha8=f0677920 / 端口上活着的实例自报 apiMode=real 项目路径=(无) 落点=pages/login/index（两条独立证据：路径比对=na，env 档位比对=match）
WS_UP_BAND_证据 Tool.getInfo 键名=[version,SDKVersion] Tool.getInfo 异常=无 应用内 require(config/env.js)=OK|real|config/env.js 应用内异常=无
WS_UP_BAND_RESULT=match exit=0
```

凭据只有这两行：**`WS_UP=OK port=9420`** + **`WS_UP_BAND_RESULT=match`**。`--wait 300` 是必要的（61s 才热完，`--wait 60` 会擦边判红）。
`hits=00000000` 不是通道坏了：那八条是 ws-channel-up 内置的 `.discover-header__*` 探针，而落点在 `pages/login/index`（real 档冷启未登录），本来就选不到。
档位自证（盘上读，与实例自报一致）：`BAND mp-weixin-real MODE=real VITE_API_MODE=real sha8=f0677920`。

## 正向对照

载体：`tmp/qa/v37-positive-control.mjs`（判据出处 `apps/client/src/pages/login/index.vue:638-648 / :771 / :163-165 / :700-730`；`.login-sms-fallback` 与表单里的 `.btn-text` 挂的是**同一个** `togglePhoneLogin`，所以两个方向都算合法对照，脚本自适应）。

第一次跑（open-form 方向）+ 第三次跑（close-form 方向）合起来的原文：

```
V37_PC_TOP=pages/login/index
V37_PC_ROUTE_BRIDGE=pages/login/index                     ← 同一实例的双载体交叉核对：WS 与桥读到同一条路由
V37_PC_SELECT=.login-sms-fallback ⇒ HIT | mode=open-form   （第一次跑）
V37_PC_TEXT_READBACK=".login-sms-fallback text()=\"验证码或密码登录\""
V37_PC_OFFSET={"left":16,"top":644.9000244140625}
V37_PC_ACT_PRE_STATE=stack=pages/login/index .input-field=ABSENT
V37_PC_ACT_tap=⇒ ok                                        （第一次跑点完，表单真的渲染出来了）
--- 第三次跑（自适应选到表单分支的那个 toggle）---
V37_PC_SELECT=.btn-text[文案=返回微信登录]（源 :771，与 :644 同一个 togglePhoneLogin） ⇒ HIT | mode=close-form
V37_PC_TEXT_READBACK="返回微信登录"
V37_PC_OFFSET={"left":16,"top":749.5}
V37_PC_ACT_PRE_STATE=stack=pages/login/index .input-field=PRESENT(2)
V37_PC_ACT_tap=⇒ ok
V37_PC_ACT_READBACK=.input-field PRESENT(2) → ABSENT | stack pages/login/index → pages/login/index | 方向=close-form | 目标选择器 tap 后=还在(HIT)
V37_PC_VERDICT=POSITIVE_CONTROL=PASS（选得到 + 动得了 + 状态按源码语义翻了一个方向，且路由没变 ⇒ 不是换页造成的假象）
```

对照用的选择器是**源里存在**的（`:638-648` 的 `.login-sms-fallback`、`:771` 的 `.btn-text`、`:700-730` 的两枚 `.input-field`），
读回的元素数 `PRESENT(2)` 与模板里的两枚输入框（手机号 + 密码）逐字对得上 ⇒ 这条腿的 SELECT/ACT 都真有答案，
后面所有"选不到"才量得出产品事实，不会重演上一轮三条假「state not applied」（那三条的 `wsApplied` 全空）。

一次踩坑记录（不是通道坏了，别重复诊断）：bring-up 刚打印 `WS_UP=OK` 之后的**头一次** `page.$` 会把**已渲染**的
`.login-sms-fallback` 答成 `null`（同一秒的 `ws-channel-up` 内置探针也是全 0）。用 `tmp/qa/v37-select-diag.mjs --deep`
当场复查，`.login-page/.login-quick/.btn-phone-quick/.login-sms-fallback/.btn-guest` 全部 `$=HIT $$=count=1`，
未渲染的 `.login-form/.input-field/.nearby-home` 才是 `count=0` ⇒ 判据是**通道要再跑一次查询做对照**，
任何"第一条读数"都不能直接当产品事实（本轮据此没有把这次 MISS 记成缺陷）。

## 附近页两档实测

载体：`tmp/qa/v37-nearby-probe.mjs`（由 `tmp/qa/nearby-switchtab-probe.mjs` 扩出来的一份**副本**，
按任务要求加档位参数，原探针一个字没改）。走的是应用内**真 `wx.switchTab`**，不是桥 `simulator_open_page`
（后者属 compiler 族，会重编译并重启 AppService，量不到 tab 语义——这正是前四轮 nearby→login→discover
那三次假象的来源之一）。

### real 档（`real@f0677920`，WS 9420，identity=A）

```
V37_CHANNEL_OK=ws port=9420 band=real@f0677920
V37_IDENTITY=sessionSource=phone-login loginVerify=logged-in userId=100158 tokenLen=249
V37_NETHOOK=ERR uni is not defined
V37_BEFORE=stack=pages/discover/index top=pages/discover/index
V37_SWITCHTAB=switchTab-ok
V37_AFTER=pages/nearby/index
V37_AFTER_SETTLE=pages/nearby/index
V37_CENSUS={".nearby-home":"1",".nearby-home__title":"1",".nearby-home__subtitle":"1",".nearby-entries":"1",
  ".nearby-entry":"5",".people-entry-list":"1",".people-entry":"2",".nearby-section":"0",".campus-cards":"1",
  ".campus-entry":"4",".circle-mini":"8",".activity-entry":"3",".nearby-post-item":"3",
  ".nearby-home__empty":"0",".nearby-login-guide":"0"} TOTAL=31
V37_AUTH_AFTER=store=logged-in userId=100158 tokenLen=249
V37_NET_CAMPUSES=41:HTTP_REQUEST GET http://127.0.0.1:8080/api/v1/config/campuses（带 Authorization: Bearer …userId=100158）
                   42:HTTP_REQUEST 同上（onLoad/onShow 各发一次）
                   45:HTTP_RESPONSE …"status":200…
V37_NET_CAMPUSES_401=""            ← IDE network 缓冲里 grep -n 401：无命中行
V37_CONSOLE_AUTH="" / V37_CONSOLE_ERR=""   ← 口径：grep 无命中行 ≠ console 为空（在册能力边界 A3「加载期 console 不可得」）
V37_NETHOOK_DRAIN={"hooked":false,"total":0,"campuses":[],"tail":[]}
V37_VERDICT=PASSES(nearby-stable)
```

读数解释（只写量到的）：真档 token 有效 ⇒ `/config/campuses` **本来就该 200**，这一档证的是
「修完之后正常路径没被打坏」：附近页停在原位、内容清点 31 个节点在（含 `.campus-entry`=4 ⇒ 校区圈分区渲染出来了）、
store 仍是 logged-in userId=100158、token 长度没被清空 ⇒ **认证状态机没有被这次请求推动**。

### mock 档（待补）

## REALCOV 可选腿
（待补）

## 未证与阻塞
（待补）
