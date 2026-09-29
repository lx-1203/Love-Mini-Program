# toast-hook-r10f — 原生 toast 捕获通道真实性实测（MEASUREMENT LANE）

结论先行：r-exec-cli.mjs:588 的前提「钩子包 wx.* ⇒ uni.showToast 覆盖得到」**在真产物上不成立**。
`uni` 是一枚 Proxy，调用期派生的是启动期从 `wx` 复制出来的**私有函数快照表 `ji`**，不是活的全局 `wx`。
页上下文里事后 `wx.showToast=wrapper` 改不到 `ji` ⇒ `uni.showToast` 仍跑原函数 ⇒ 钩子被绕开。
本通道产出的每一个 toast 读数都是「0」，而这个 0 的含义是「仪器没挂上」，却被当成「产品没弹」上报 = 假红。
被绕开的正是并行车道对 `uni.request` 已独立测到的同一族机制（`exec-network-observe.mjs` 据此改用 `uni.addInterceptor`）。

## vendor 里的机制

产物：`apps/client/dist/build/mp-weixin/common/vendor.js`（103990 B，压成 39 行，minified；全程只读）。
以下函数名都是**产物里的字面名**，没有改名。定位一律给字节偏移（`node -e 'indexOf'` 取得）：

- `Gf(e)` @57682 — API 名是否入选：`function Gf(e){return No&&No.scene===1154&&zf.includes(e)?!1:Kf.indexOf(e)>-1||typeof wx[e]=="function"}`。
- `Hi()` @57786 — **启动期快照**：`function Hi(){const e={};for(const t in wx)Gf(t)&&(e[t]=wx[t]);return typeof globalThis!="undefined"&&typeof requireMiniProgram=="undefined"&&(globalThis.wx=e),e}`。关键在 `e[t]=wx[t]`：把 `wx` 上的**函数引用按值复制**进一枚私有对象 `e`。
- `Hi()` 的调用点：@58313 `const K=Hi();`（喂 getAppBaseInfo 等）；@59287 `const ji=Hi();var Fr=Vf(Zf,tp,ji);`（**这一枚 `ji` 才是 uni 用的**）。`exports.wx$1=ji` 在文件尾。
- `Vf(e,t,n=wx)` @57097 — uni 的 Proxy 工厂：
  `function Vf(e,t,n=wx){const r=xf(t),o={get(s,i){return C(s,i)?s[i]:C(e,i)?Tn(i,e[i]):C(ko,i)?Tn(i,ko[i]):Tn(i,r(i,n[i]))}};return new Proxy({},o)}`。
  - `Fr=Vf(Zf,tp,ji)` ⇒ `e=Zf, t=tp, n=ji`。get-trap 无 set 陷阱；默认分支（原生 API 走这条）是 `Tn(i, r(i, n[i]))`，其中 **`n[i]` = `ji[i]`**（启动期快照里的函数值），**不是** `wx[i]`（活全局）。
  - 即：**调用期读的是私有快照对象 `ji` 的属性**。事后重写 `wx.X` 不写 `ji.X` ⇒ uni 派生的仍是那份原函数 = 假红根因。
- `xf(t)` @51695 内联展开（`Tn(i,r(i,n[i]))` 里的 `r`）：对 `showToast` 这类名，`l = c||_(e.returnValue)||Kt(s)||To(s)` 全 false ⇒ `if(!l||!a) return i;` ⇒ 直接返回传入的 `i`（=`ji.showToast` 那份快照）。进一步坐实「派生快照，不查活 wx」。
- `Pf(e)` @51223 / `Tn(e,t)` @51452 — 拦截器缝：`Tn(e,t)=!Pf(e)||!_(t)?t:function(...){...tn(e,nn(e,t,...))}`，`Pf(e)=!(Kt(e)||Ai(e)||Of(e))`；`Kt@51029`=`Ef.test&&vf.indexOf===-1`（`Ef=/^create|Manager$/`@50880）、`Ai`=`yf.test&&If...`（`yf`@50501，含 `^\$|__f__|getLocale|...|hideKeyboard|canIUse|Sync$|Manager$|...`）、`Of`=`Cf.test&&e!=="onPush"`（`Cf=/^on|^off/`@51015）。`addInterceptor`=`tf`@49055，写进按名注册的表 `et[e]`；`Tn` 在**调用期**读 `et` ⇒ 与快照无关，永远生效。

## 实测执行

`.zcode/tmp/toast-hook-harness.mjs` + 仓库内离线测试 `scripts/qa/test-native-hook-route.cjs`（node22 跑真产物，无设备）：

- 用 `vm.runInContext` 加载**真 vendor.js**，注入可枚举的假 `wx`（含 showToast/hideToast/showModal/showLoading/request/getSystemInfoSync/…），跑完启动路径，取内联探针暴露的真实 `Fr`（=uni）、`ji`、`Pf`。**proof=executed**（不是复刻；复刻仅用于交叉核对）。
- **忠实拓扑**（`requireMiniProgram` 已定义 ⇒ `globalThis.wx` 独立于 `ji`，正是「页上下文 automation_evaluate 改自己那枚 wx」的真实情形）：
  `uni.showToast` 基线 → 跑原函数；随后 `wx.showToast=wrapper`；再 `uni.showToast` → trace=`["ORIG:showToast"]`，`hookSeen=0` ⇒ **绕开**。且 `ji.showToast` 身份不因重写而变。
  - 反证拓扑（`requireMiniProgram` 未定义 ⇒ `Hi()` 把 `globalThis.wx` 覆写成 `ji` 本身）：同代码 `hookSeen=1`（钩子被看到）。两枚拓扑给出相反结果 ⇒ 上面的「绕开」是真测出来的，非空转恒假。
- **拦截器缝（推荐）**：`uni.addInterceptor('showToast',{invoke})` → invoke 被回调且拿到 `payload.title="apiErrors.loginRequired"`；`Pf(showToast/hideToast/showModal/showLoading)=true`（产物谓词自证，与 request 同族）。`showLoading` 的 invoke 返回 false 会掐死调用（`ret={}`）⇒ 捕获钩子必须 return 非 false（透传，不改产品行为）。
- **备用缝**：`uni.showToast=wrapper` 粘得住（Proxy 无 set 陷阱，落 target，get 直接返回），且不改 `ji`。
- 离线测试输出：`SUMMARY: assertion failures = 0` / `NATIVE_HOOK_ROUTE=PASS` / `HOOK_ROUTE=CONFIRMED_BYPASS`。

复刻交叉核对：本车道对 `Gf/Hi/Vf/Pf/Tn/xf/tf` 的引用全部逐字取自产物 `indexOf` 偏移处的原文；动态结论（uni 派生 `ji`、addInterceptor 走调用期 `et`）由真产物 vm 执行得到，不依赖复刻。

## 各 API 可否拦

由产物 `Pf()` 直接算（vm 里对真函数调用，非文档推断）：

| API | Pf（可被 addInterceptor 拦？） | 备注 |
|---|---|---|
| showToast | true | 捕获型钩子的主目标 |
| hideToast | true | 适合做**零 UI 副作用**的装钩自检（canary）：实测连续两次 `uni.hideToast()` → invoke 回调 2 次 |
| showModal | true | 「原生 Modal 有没有被调用」观察半边（c21 (d)-c-3） |
| showLoading | true | invoke 返回 false 会掐死，须透传 |
| request | true | 并行车道 `exec-network-observe.mjs` 已据此选 `addInterceptor('request')` |
| getStorageSync | **false** | `yf` 含 `Sync$` ⇒ 不可拦；**不能**拿它当 canary（实测 canary 不触发） |
| onShow / 事件类 | false | `Cf=/^on|^off/` 排除 |

⇒ 拦截器**覆盖**这四个 toast API；推荐的捕获机制就是把 `nativeHookSource` 从「包 `wx[name]`」换成「`uni.addInterceptor(name,{invoke})`」，canary 走 `hideToast`（不可见、零副作用）。console 那半边不受影响：`console.*` 不是经 `ji` 快照派生的（uni Proxy 只包 API 表），现有 `cwrap` 包 `console.log/warn/error` 是活对象读，可保留。

## 调用点分布

`grep -rn ... apps/client/src`（toast-family）：

- `uni.showToast` = **521**，`uni.showModal` = **53**，`uni.showLoading` = **12**，`uni.hideToast` = 0 ⇒ uni.* 合计 **586**。
- `wx.showToast` / `wx.showModal` / 直呼 `wx.*` toast 族 = **0**。

⇒ 通道不是「部分活」而是**整条死**：全部 toast 调用点都走 `uni.*` ⇒ 派生启动期 `ji` 快照 ⇒ 被 `wx.*` 层钩子绕开。
- 游客回登录的 toast：`apps/client/src/services/http.ts:479` `uni.showToast({title: t(...loginRequired...)})`（:479 明确 `apiErrors.loginRequired`，随后 :493 `uni.reLaunch(LOGIN)`）⇒ 死通道。
- DND 保存反馈：`apps/client/src/subpackages/profile-extra/settings/dnd.vue:248/271/276` 全 `uni.showToast` ⇒ 死通道（DND08「Toast 条数=1」正是这条产出的读数）。
- 与 1107 条执行行 `toast` 字段零非空完全自洽：不是 app 没弹，是钩子被绕开。

## 结论

前提(:588) 的「覆盖得到」**证伪**。`uni` 的 get-trap 调用期读的是 `Hi()` 启动期复制的私有快照 `ji`，事后 `wx.X=` 改不到它 ⇒ `uni.showToast/showModal/showLoading` 的每次调用都绕过 `wx.*` 钩子。本通道此前对 toast 的每一条读数都不可信，且「0」被当成产品红是仪器故障冒充产品发现。正确缝 = `uni.addInterceptor(api,{invoke})`（Pf 覆盖四者、调用期读 `et`、拿到 payload、可透传）。

## 建议补丁

> **不代改** `r-exec-cli.mjs`（另一路正在集成）。以下是要点 + 精确替换，供你贴入。

1) `nativeHookSource()`（:595-617）— 把「包 `wx[name]`」换成「`uni.addInterceptor` + 自检 canary」，并把状态从三态扩到**四态**（把「装了但被绕开」和「没装上」分开）：

```js
function nativeHookSource() {
  return "() => { try {" +
    "if (globalThis.__qaNativeHooked) return 'already';" +
    "globalThis.__qaToasts = []; globalThis.__qaLogs = [];" +
    "var num = function (v) { return (typeof v === 'number' && isFinite(v)) ? v : null; };" +
    "var txt = function (v) { try { var s = (typeof v === 'string') ? v : (v && v.title !== undefined ? String(v.title) : JSON.stringify(v)); return String(s === undefined ? '' : s).slice(0, 200); } catch (e) { return String(v).slice(0, 200); } };" +
    "if (typeof uni === 'undefined' || !uni || typeof uni.addInterceptor !== 'function') return 'no-uni';" +   // 新增可分辨态
    "var rec = function (name) { return function (o) {" +
    "  try { globalThis.__qaToasts.push({ api: name, title: txt(o && o.title), content: txt(o && o.content), confirm: !!(o && o.confirmText), cancel: !!(o && o.cancelText), dur: num(o && o.duration), ts: Date.now() }); } catch (e) {}" +
    "  return true; }; };;" +                                                     // 关键：返回非 false，透传，绝不掐调用
    "var apis = ['showToast','hideToast','showModal','showLoading']; var bound = 0;" +
    "for (var k = 0; k < apis.length; k++) { try { uni.addInterceptor(apis[k], { invoke: rec(apis[k]) }); bound++; } catch (e) {} }" +
    "if (!bound) return 'no-addInterceptor';" +
    /* 装钩自检（零 UI 副作用）：hideToast 在不显示时调用无浮层，invoke 必被回调 ⇒ 证明拦截器落在运行时真读的那条 */
    "var canary = false; try { uni.addInterceptor('hideToast', { invoke: function () { canary = true; } }); uni.hideToast(); } catch (e) {}" +
    /* console 半边不变（不经 uni 快照派生） */
    "var cwrap = function (lv) { try {" +
    "  var orig = console[lv] ? console[lv].bind(console) : null; if (!orig) return;" +
    "  console[lv] = function () { try { var a = Array.prototype.slice.call(arguments); globalThis.__qaLogs.push({ level: lv, text: txt(a.length>1?a.join(' '):(a[0]&&a[0].title!==undefined?String(a[0].title):String(a[0]))), ts: Date.now() }); } catch (e) {} return orig.apply(console, arguments); }; } catch (e) {} };" +
    "cwrap('log'); cwrap('warn'); cwrap('error');" +
    "globalThis.__qaNativeHooked = true; globalThis.__qaNativeRoute = canary ? 'live' : 'bypass';" +
    "return canary ? 'installed-live' : 'installed-bypass';" +
    "} catch (e) { return 'ERR ' + e.message; } }";
}
```

2) `nativeDrainSource()`（:618-622）— 把 route 一起带回，行才有依据分辨三种死法：

```js
function nativeDrainSource() {
  return "() => { try { var t = (globalThis.__qaToasts || []).splice(0); var l = (globalThis.__qaLogs || []).splice(0); " +
    "return JSON.stringify({ toasts: t, logs: l.slice(-12), hooked: !!globalThis.__qaNativeHooked, route: globalThis.__qaNativeRoute || (globalThis.__qaNativeHooked ? 'bypass' : 'none') }); } " +
    "catch (e) { return JSON.stringify({ toasts: [], logs: [], hooked: false, route: 'err', err: String(e && e.message) }); } }";
}
```

3) `interpretNative()`（:633-638 两条分支）— 解析并透传 `route`：在返回对象里加 `route: j.route || (j.hooked ? 'bypass' : 'none')`（解析失败分支 `route:'err'`）。

4) `nativeInstall()`（:731-740）状态机 — 认 `'installed-live'`/`'installed-bypass'`/`'already'`/`'no-uni'`/`'no-addInterceptor'`/`'ERR'`：
```js
const st = /installed-live/.test(r) ? "installed-live" : /installed-bypass/.test(r) ? "installed-bypass"
  : /already/.test(r) ? "already" : /no-uni/.test(r) ? "no-uni" : /no-addInterceptor/.test(r) ? "no-addInterceptor"
  : /ERR/.test(r) ? "ERR" : "unknown";
return { on: true, route: (st === "installed-live" ? "live" : st === "installed-bypass" ? "bypass" : "not-installed"), note: "install=" + st + " raw=" + r.slice(0, 80) };
```

5) `row()` / `evidenceGaps()`（:671-682）— 让行能把三种情形分账（关键交付点）。`cap` 传 `{on, route, toastCount, consoleCount}`：
```js
if (k.toast) out.push(
  !cap.on        ? "判据点名 Toast，本腿没带 --native-capture ⇒ 未采（行上恒空「不许」读成「没弹」）"
  : cap.route==='bypass' ? "toast 通道已装但运行时**被绕开**（vendor 启动期快照 ji，addInterceptor canary 未回调）⇒ 行上 toast 恒空是【仪器失效/载具 bug】，**禁止据此记产品红**"
  : cap.route!=='live'   ? "toast 通道未确认在位（route=" + cap.route + "）⇒ 恒空读作「没采到」，非「没弹」"
  : (cap.toastCount>0 ? "" : "toast 通道 live 且窗口内 0 条原生调用 ⇒ 这才是「app 真没弹」的判据信号")
);
```
行上新增字段（供机器读）：`nativeRoute: capOn ? cap.route : 'off'`，并把 :789 的 `nativeCapture` 串改为 `"on(uni.addInterceptor(showToast/hideToast/showModal/showLoading)+console)"`。

**三种死法如何在 manifest 里分得开**：
- 没装：`nativeInstall.route='not-installed'`（no-uni/no-addInterceptor/ERR/THREW），行 `nativeRoute='not-installed'`，欠账写「未采」。
- 装了但被绕开（载具 bug，非产品红）：`nativeRoute='bypass'`（canary 未回调），欠账显式写「禁止据此记产品红」。
- 装了且真没弹（产品发现）：`nativeRoute='live'` 且窗口 toastCount=0，欠账写「app 真没弹」。
三者 `nativeRoute` 与 `evidenceGaps` 文本互斥，读的人不会再把仪器坏了当 app 无罪/有罪。

## 读数

TOASTHOOK_RESULT=CONFIRMED_BYPASS uni_route=snapshot interceptable=showToast,hideToast,showModal,showLoading wx_direct_calls=0 uni_calls=586 proof=executed
