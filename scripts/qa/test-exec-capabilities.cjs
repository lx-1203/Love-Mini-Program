#!/usr/bin/node
/* 能力原语模块的离线自测（capability 车道 2026-10-06，先例 test-exec-verb-dispatch.cjs 的体例）。
   ── 钉住的病 ──
   exec-capabilities.mjs 的解析/裁决/注记函数决定配方腿在设备上做什么、行上记什么：
   · modalScript 没有脚本化回值就等于没驱动（C1 的最小纪律）；
   · netFault 不点名 mode/url 就等于断全站还自称"注入"（C3 的最小纪律）；
   · 夹具没有 teardown 就是不可回滚（decisions#6：跑完恢复原态，不留测试残留）；
   · assertRoute 抠不到期望落点时把"未知"当"命中"（C5 的假绿通路）；
   · 载荷源里出现 uni 记号 = 在设备上必炸（evaluate 上下文实测，C6 同根因）。
   跑法：node scripts/qa/test-exec-capabilities.cjs
   聚合器认：SUMMARY: assertion failures = N + CAPS_TEST=PASS|FAIL。零设备、零落盘。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const MOD = path.join(REPO, "scripts", "qa", "exec-capabilities.mjs");
/* ESM 模块从 CJS 测试里加载：落到 tmp 的动态 import 包装（不落 node_modules，不改 package.json）。 */
const WRAPPER = path.join(REPO, ".zcode", "tmp", "caps-import.mjs");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 150) + ")"));
}
function eq(name, got, want) { t(name, JSON.stringify(got) === JSON.stringify(want), "got=" + JSON.stringify(got) + " want=" + JSON.stringify(want)); }

async function main() {
  let C = null;
  try {
    fs.mkdirSync(path.dirname(WRAPPER), { recursive: true });
    fs.writeFileSync(WRAPPER, "import * as C from " + JSON.stringify("file://" + MOD.split("\\").join("/")) + "; export default C;\n", "utf8");
    C = (await import("file://" + WRAPPER.split("\\").join("/"))).default;
  } catch (e) { console.log("IMPORT_ERR " + e.message); }
  t("能力模块可加载且导出面齐（缺一个就是判点没接线）", !!C && ["parseModalScript", "modalMockSource", "modalAnswersSource", "modalDrainSource", "interpretModalDrain",
    "modalDriveNote", "modalObservedNote", "parseNetFault", "netFaultArmSource", "netFaultMockSource", "netFaultRestoreSource",
    "netDrainSource", "interpretNetDrain", "netFaultNote", "countNetCalls", "recipeFor", "validateFixture", "validateRecipes",
    "fixtureVerdict", "expandTemplate", "templateUnresolved", "parseNavSteps", "navStepVerdict", "channelStamp", "CHANNEL_WS"].every((k) => typeof C[k] === "function" || k === "CHANNEL_WS"),
  C ? "ok" : "见 IMPORT_ERR");

  if (C) {
    /* ── C1：modalScript ── */
    const bad1 = C.parseModalScript({ showModal: {} });
    t("C1 showModal 没有 answers ⇒ 拒收（没有脚本化回值的 modal 驱动等于没驱动）", bad1.ok === false && /answers/.test(bad1.reason), bad1.reason);
    const bad2 = C.parseModalScript({ showModal: { answers: [{ foo: 1 }] } });
    t("C1 showModal 回值不带布尔 confirm ⇒ 拒收（判据答的是取消/确定，不猜）", bad2.ok === false && /confirm/.test(bad2.reason), bad2.reason);
    const bad3 = C.parseModalScript({ showActionSheet: { answers: [{ tapIndex: 1.5 }] } });
    t("C1 showActionSheet 回值不带整数 tapIndex ⇒ 拒收", bad3.ok === false, bad3.reason);
    const ok1 = C.parseModalScript({ showModal: { answers: [{ confirm: false }, { confirm: true }] } });
    t("C1 两段式脚本（先取消后确定，PFI25 判据①②）解析出 2 条 answers", ok1.ok === true && ok1.script.showModal.answers.length === 2, JSON.stringify(ok1.script || bad3));
    const armSrc = C.modalArmSource("showModal");
    t("C1 mock 载荷按 api 键读 answers 袋、记录调用实参（title/itemList）——驱动与观察分列的机制", armSrc.includes("__qaModalAnswers") && armSrc.includes("__qaModalCalls") && armSrc.includes("itemList"), "");
    /* REAL-OT-06 回归钉（2026-10-10）：占位符模板自带引号，api 名裸替换；历史上 JSON.stringify 再包一层
       ⇒ `""showModal""` 语法错误，应用侧实报 Uncaught Unexpected identifier 'showModal'（b4 OT05 step#5）。 */
    let armParseErr = "";
    try { new Function("return (" + C.modalArmSource("showModal") + ")"); } catch (e) { armParseErr = e.message; }
    t("C1 mock 载荷可被解析为函数表达式（不炸 Unexpected identifier，应用侧 eval 同判）", !armParseErr && armSrc.includes('api: "showModal"'), armParseErr || "ok");
    t("C1 mock 载荷是函数声明串（automator isFnStr 认 'function' 开头 ⇒ 直发 functionDeclaration）", armSrc.trim().startsWith("function"), "");
    t("C1 mock 载荷没有 uni 记号（evaluate/App.callFunction 上下文任何 uni 记号必炸）", !/uni/.test(armSrc) && !/uni/.test(C.modalAnswersSource({ showModal: { answers: [] } })) && !/uni/.test(C.modalDrainSource()), "");
    const drain = C.interpretModalDrain('{"calls":[{"api":"showModal","title":"删除语音"}]}');
    t("C1 drain 解析出调用记录（观察侧）", drain.calls.length === 1 && drain.calls[0].title === "删除语音", "");
    t("C1 drain 遇通道噪声不抛、报 err（读数没取到 ≠ 没弹窗）", C.interpretModalDrain("not json").calls.length === 0 && !!C.interpretModalDrain("not json").err, "");
    eq("C1 modalDriveNote：armed/answered/restored 三数同框", C.modalDriveNote(ok1, { calls: [{}, {}] }, true), "on(armed=showModal answers=2 answered=2 restored=yes)");
    t("C1 modalDriveNote：restore 失败必须写 NO（mock 留在载具上=污染下一腿）", /restored=NO/.test(C.modalDriveNote(ok1, { calls: [] }, false)), "");
    t("C1 modalObservedNote：带调用实参摘要", /showModal「删除语音」/.test(C.modalObservedNote(drain)), C.modalObservedNote(drain));

    /* ── C3：netFault ── */
    t("C3 mode 不在词表 ⇒ 拒收（fail-all|fail-url|record 之外的写法不许静默当 fail-all）", C.parseNetFault({ mode: "slow" }).ok === false, "");
    t("C3 fail-url 不点名 urlIncludes ⇒ 拒收（不点名 URL 的失败注入等于断全站）", C.parseNetFault({ mode: "fail-url" }).ok === false, "");
    const nfOk = C.parseNetFault({ mode: "fail-all", statusCode: 500, data: { qaFault: "x" } });
    t("C3 fail-all 解析出 statusCode/data", nfOk.ok === true && nfOk.spec.statusCode === 500, "");
    const nfRec = C.parseNetFault({ mode: "record" });
    t("C3 record 模式（零注入记账）合法", nfRec.ok === true && nfRec.spec.statusCode === 0, "");
    const nfSrc = C.netFaultMockSource();
    t("C3 mock 载荷先记账（__qaNetCalls）再判 mode；record/fail-url 未命中走 __qaOrigRequest 透传（arm 前抓的原引用，不递归）",
      nfSrc.includes("__qaNetCalls") && nfSrc.includes("__qaOrigRequest") && nfSrc.includes("__qaNetSpec"), "");
    t("C3 arm 载荷先抓原引用再写 spec（顺序反了 record 模式就丢原实现）",
      C.netFaultArmSource({ mode: "record" }).indexOf("__qaOrigRequest") < C.netFaultArmSource({ mode: "record" }).indexOf("__qaNetSpec"), "");
    t("C3 restore 载荷清 __qaNetSpec（残留 spec=下一腿请求继续被拦）", /__qaNetSpec = null/.test(C.netFaultRestoreSource()), "");
    t("C3 netFaultNote：mode/intercepted/restored 同框", /mode=fail-all/.test(C.netFaultNote(nfOk.spec, { calls: [{}, {}] }, false)) && /intercepted=2/.test(C.netFaultNote(nfOk.spec, { calls: [{}, {}] }, false)) && /restored=NO/.test(C.netFaultNote(nfOk.spec, { calls: [{}, {}] }, false)), "");
    eq("C3 countNetCalls：URL 过滤计数（OT06 ④「5 次点击窗口内 POST /matches/like 条数」的取数式）",
      C.countNetCalls([{ url: "/api/v1/matches/like" }, { url: "/api/v1/posts" }, { url: "/api/v1/matches/like" }], "/matches/like"), 2);
    t("C3 全部载荷没有 uni 记号", [nfSrc, C.netFaultArmSource(nfOk.spec), C.netFaultRestoreSource(), C.netDrainSource()].every((s) => !/uni/.test(s)), "");

    /* ── C2：夹具 ── */
    t("C2 夹具只有 setup 没有 teardown ⇒ 拒收（不可回滚的夹具不许上腿）",
      C.validateFixture({ setup: [{ via: "api", method: "POST", path: "/x" }], teardown: [] }).ok === false, "");
    t("C2 夹具 op 缺 via ⇒ 拒收（词表 api|store-call|store-patch|store-cleanup）",
      C.validateFixture({ setup: [{ name: "x" }], teardown: [{ via: "api", method: "GET", path: "/x" }] }).ok === false, "");
    t("C2 api op 缺 method/path ⇒ 拒收", C.validateFixture({ teardown: [{ via: "api", method: "GET" }] }).ok === false, "");
    t("C2 store-cleanup 缺 arrays/byId ⇒ 拒收", C.validateFixture({ teardown: [{ via: "store-cleanup", store: "village" }] }).ok === false, "");
    const fxOk = C.validateFixture({
      setup: [{ via: "store-patch", store: "profile", patch: { voiceStatusUrl: "x" } }],
      teardown: [{ via: "store-call", store: "profile", call: "clearVoiceStatus" }],
    });
    t("C2 PFI25 形状（store 注入 + 显式恢复）合法", fxOk.ok === true, fxOk.reason || "");
    t("C2 fixtureVerdict：teardown 失败=残留（行上必须看得见，不许静默当 clean）",
      C.fixtureVerdict({ setup: [{ ok: true }], teardown: [{ ok: false }] }).kind === "residue", "");
    t("C2 fixtureVerdict：setup 失败=前置没构造成功（判定不得当已按前置执行）",
      C.fixtureVerdict({ setup: [{ ok: false }], teardown: [{ ok: true }] }).kind === "setup-failed", "");
    t("C2 fixtureVerdict：全成=clean", C.fixtureVerdict({ setup: [{ ok: true }], teardown: [{ ok: true }] }).clean === true, "");
    eq("C2 模板展开：{captured.postId} 进路径", C.expandTemplate("/posts/{captured.postId}", { postId: 901 }), "/posts/901");
    t("C2 模板未解析时点名（teardown 不许凭空发）", C.templateUnresolved("/posts/{captured.postId}", {}).join(",") === "postId", "");

    /* ── C5：多步 nav ── */
    t("C5 未知 step kind ⇒ 拒收（词表外的步骤静默跳过=少跑）",
      C.parseNavSteps([{ do: "open" }, { do: "teleport" }]).ok === false, "");
    t("C5 steps 为空 ⇒ 拒收", C.parseNavSteps([]).ok === false, "");
    const stepsOk = C.parseNavSteps([{ do: "open", page: "a" }, { do: "assertRoute", routeIncludes: "a" }, { do: "shot", label: "x" }]);
    t("C5 三步序列合法", stepsOk.ok === true && stepsOk.steps.length === 3, "");
    t("C5 assertRoute 命中", C.navStepVerdict({ do: "assertRoute", routeIncludes: "vip/bills" }, "pages/profile/index|subpackages/vip/bills").ok === true, "");
    t("C5 assertRoute 未命中 ⇒ ok=false 且带实际落点（把未知当命中就是 C5 的假绿通路）",
      C.navStepVerdict({ do: "assertRoute", routeIncludes: "vip/bills" }, "pages/login/index").ok === false && /got=/.test(C.navStepVerdict({ do: "assertRoute", routeIncludes: "vip/bills" }, "pages/login/index").text), "");
    t("C5 assertRoute 没写 routeIncludes ⇒ 判 false（配方错误不许当断言通过）",
      C.navStepVerdict({ do: "assertRoute" }, "anything").ok === false, "");
    t("C5 非断言步 verdict=null（只有 assertRoute 走这条裁决）", C.navStepVerdict({ do: "shot" }, "x") === null, "");

    /* ── C4：通道声明 ── */
    eq("C4 CHANNEL_WS=ws；channelStamp 空值落 unspecified（不猜）", [C.CHANNEL_WS, C.channelStamp(""), C.channelStamp("ws")], ["ws", "unspecified", "ws"]);
  }

  /* ── 交叉：case-recipes.json 与判据台的机器校验（键存在/tapTarget 覆盖/夹具可回滚）──
     这里只跑 validateRecipes 的**结构半边**（corpus 由 test-cap-recipes.cjs 对真判据台核），
     并把配方文件本身的 JSON 可解析性钉在这里（文件写坏时本测试先红）。 */
  const RECIPES_PATH = path.join(REPO, "scripts", "qa", "case-recipes.json");
  let recipes = null;
  try { recipes = JSON.parse(fs.readFileSync(RECIPES_PATH, "utf8")); } catch (e) { console.log("RECIPES_JSON_ERR " + e.message); }
  t("case-recipes.json 可解析且 kind 名正", !!recipes && recipes.kind === "case-recipes", recipes ? "recipes=" + Object.keys(recipes.recipes || {}).length : "解析失败");
  if (recipes && C) {
    const keys = Object.keys(recipes.recipes || {});
    t("八条欠账逐例有配方（PFI25/VI25/VI34/OT05/OT06/OT09/OC09/VB03）",
      ["PAGES-PROFILE-INDEX|PFI25", "SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI25", "SUBPACKAGES-VILLAGE-VILLAGE-INDEX|VI34",
       "次要20|OT05", "次要20|OT06", "次要20|OT09", "次要21|OC09", "次要22|VB03"].every((k) => keys.includes(k)), keys.join(" "));
    for (const k of keys) {
      const r = recipes.recipes[k];
      const fx = C.validateFixture(r.fixture);
      t("配方 " + k + " 夹具可回滚", fx.ok, fx.reason || "ok");
      const st = C.parseNavSteps(r.steps || []);
      t("配方 " + k + " 步骤词表合法", st.ok, st.reason || "steps=" + (r.steps || []).length);
      if (r.modalScript) { const ms = C.parseModalScript(r.modalScript); t("配方 " + k + " modalScript 合法", ms.ok, ms.reason || ""); }
      if (r.netFault) { const nf = C.parseNetFault(r.netFault); t("配方 " + k + " netFault 合法", nf.ok, nf.reason || ""); }
    }
  }

  /* ── C6：所有 *Source 生成器产出的"要交给 evaluate 的字符串"必须自己可解析 ──
     为什么单独有这一节（本程实测代价）：navigateToSource 与 handlerCallSource 尾部各多一个 `}`，
     产出的源码 new Function 直接抛 `missing ) after argument list`；
     而本测试此前 65 项全绿——因为它只测裁决函数与结构解析，**从没解析过模块自己生成的那段源码**。
     后果是一条设备腿白跑（四例 OT/OC 全部 dispatched=0，记 UNVERIFIED-INSTRUMENT），
     而且是到设备上才暴露。"生成源码"的模块不解析自己的产物，就等于把语法错误推到真机上。
     判点做成"遍历导出名以 Source 结尾的函数"，将来新增生成器自动被覆盖，不靠人记得加。 */
  if (C) {
    const recipeSample = recipes ? Object.values(recipes.recipes || {})[0] : null;
    const specFor = (name) => {
      if (/handlerCall/i.test(name)) return { method: "handleLike", routeIncludes: "profile", args: [1], componentId: "cta-1" };
      if (/navRead|route/i.test(name)) return {};
      if (/modal/i.test(name)) return { answers: [{ confirm: true }], api: "showModal" };
      if (/netFault|fault/i.test(name)) return { mode: "fail-all", urls: ["/api/v1/x"] };
      if (/fixture/i.test(name)) return { setup: [{ op: "seed", key: "k" }], teardown: [{ op: "rollback", key: "k" }] };
      if (recipeSample && Array.isArray(recipeSample.steps) && /nav|open/i.test(name)) return recipeSample.steps[0];
      return "/pages/profile/index";
    };
    let srcChecked = 0, srcBad = [];
    for (const [name, fn] of Object.entries(C)) {
      if (typeof fn !== "function" || !/Source$/.test(name)) continue;
      let src = null, how = "";
      for (const arg of [specFor(name), { url: "/pages/profile/index" }, "/pages/profile/index", []]) {
        try { const out = fn(arg); if (typeof out === "string" && out.trim() !== "") { src = out; how = "ok"; break; } } catch (e) { /* 换下一种入参形状 */ }
      }
      if (src === null) { srcBad.push(name + "(构造不出字符串)"); continue; }
      srcChecked++;
      /* 用 new Function 解析而不是数括号：括号计数会把"字符串字面量里的大括号"算进去，
         而语法树只关心真结构括号——本仓已经栽过一次"用措辞判结构"。 */
      try { new Function("return (" + src + ")"); }
      catch (e) { srcBad.push(name + " ⇒ " + String(e.message).slice(0, 70)); }
    }
    t("C6 每个 *Source 生成器产出的源码都可解析（语法错不许留到设备上才暴露）",
      srcBad.length === 0, srcChecked + " 个生成器；不可解析: " + (srcBad.join(" | ") || "无"));
    t("C6 检查本身不许空转：至少覆盖到 navigateTo/handlerCall 两个生成器",
      srcChecked >= 2, "srcChecked=" + srcChecked);
  }

  console.log("SUMMARY: assertion failures = " + fails);
  console.log("CAPS_TEST=" + (fails === 0 ? "PASS" : "FAIL") + "（checks=" + checks + "）");
  process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => { console.log("CAPS_TEST=FAIL stage=uncaught " + String((e && e.stack) || e).split("\n")[0]); console.log("SUMMARY: assertion failures = " + (fails + 1)); process.exit(1); });
