/**
 * 后台「写入口 × 后端权限档位」交叉契约门。
 *
 * ── 判据演进 ──
 * 旧版（R16 P2-14(d)）只做两件事：视图 import 了写函数 ⇒ 模板里出现
 * `sessionStore.canWrite`、写函数入口出现 `if (!sessionStore.canWrite) return`。
 * 那是**纯文本存在性**判据：它既没有「超管档位」这条轴，也从不读后端的
 * `@PreAuthorize`，所以 DEFECT 1 的整批缺陷（校区 ADMIN 在 42 个超管端点上白吃 403）
 * 全都能判绿。本版把判据换成真正的双向交叉核对。
 *
 * ── 现在的判据 ──
 *   A. 从 apps/api 的 Java 源码正则出每个 admin 写端点【实际要求的角色集合】：
 *        方法级 @PreAuthorize → 类级 @PreAuthorize → 再与 SecurityConfig 的
 *        URL 级写规则（/api/v1/admin/** 的 POST/PUT/PATCH/DELETE = ADMIN,SUPER_ADMIN）取交集，
 *        并叠加认证注入图（JwtAuthenticationFilter + User#isWriteAdmin：
 *        SUPER_ADMIN 也被授予 ROLE_ADMIN，故 hasRole('ADMIN') 端点 SUPER_ADMIN 亦可）。
 *   B. 从 apps/admin/src/api/*.ts 正则出每个导出函数实际发出的 HTTP 方法 + 路径，
 *        与 A 的端点表做 Spring 路径模式匹配 ⇒ 函数 → 角色档位。
 *   C. 对每个视图：定位写函数的**调用点所在处理函数**，要求该处理函数的守卫位
 *        与模板控件的 v-if/:disabled 位都满足「UI 位允许的角色 ⊆ 后端接受的角色」。
 *        档位不匹配即红：
 *          (a) 超管端点挂在只有 canWrite 的控件上  → ADMIN 会吃 403；
 *          (b) 后端只认纯 ADMIN 而 UI 位放过 SUPER_ADMIN → 反向 403。
 *   D. 旧版的存在性判据保留（canWrite 总闸 + http.ts 本地拦截必须在位）。
 *
 * ── 本门关不掉的盲区（刻意写明，不做假象交叉核对）──
 *   1. 控件↔处理函数的归属只认「同一个元素标签里 @click/@confirm/@change 直接引用该函数」
 *      这一种形态。经由子组件透传（`@confirm="vm.handle"`）、行内匿名箭头
 *      （`@click="() => del(x)"`）或 computed 出来的事件名挂上去的控件，
 *      会被计入 `unattachedControls` 而**不判红**——守卫仍在处理函数层判（C 的那一半是硬的）。
 *   2. 调用点的「所在函数」按脚本块顶层 function/const 箭头函数的边界切；
 *      写在别的函数内部的内联箭头回调会被归到外层顶层函数，守卫若挂在内层小函数里会被误报。
 *      （宁可误报也不能漏报，故没有为此加豁免。）
 *      ⚠ 第五轮结构缺口收口（报告「门可信度」节末 a/b）：
 *        - 脚本块顶层【直接】出现的写调用（不落在任何顶层函数体内）不再享受「整文件守卫并集」，
 *          改为直接判红（见 analyze 的 `(顶层)` 分支）——过去一个缺守卫的处理函数可被同文件
 *          另一个处理函数的守卫蒙混。扫描前先用 stripJavaComments 把脚本注释洗成空格，
 *          于是 JSDoc 里提到的函数名（如 Roles.vue:10 的 `assignRoleMenus(...)`）不再被误当写调用。
 *        - guardsIn 只认字面 `!sessionStore.<位>`：把档位赋给中间变量再判会被算成"无守卫"（误报，
 *          保守，可接受），两种失败方向写在 guardsIn 的函数头注释里。
 *   2b. 档位轴同时识别模板同一标签门控表达式里的裸角色字面比较（`x === 'SUPER_ADMIN'` 等，
 *      见 BARE_ROLE_CMP），据此判「前端比后端严」（后端写档含某角色、UI 却把它藏起来）→ 判红；
 *      刻意不识别 isSuperAdmin 这类把角色藏进 .value 的 computed，以免误伤合法的超管专属控件。
 *   3. 端点匹配靠静态正则，不展开 SecurityConfig 里除「四条 admin 写规则」以外的规则；
 *      Service 层的校区/圈层校验（AdminDataScope）不在本门射程内 —— 那是
 *      scripts/verify-admin-scope.mjs（运行时门）的活。
 *   4. TS 路径里的 `${...}` 与 Spring 的 `{var}` 都归一为通配段，因此
 *      「变量段实际只会取到某几个值」这种收窄无法判断（例如 /users/admins/{id} 与
 *      /users/{id} 同时存在时按通配双命中，取【最严】档位，方向保守）。
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const API_DIR = join(ROOT, "apps", "admin", "src", "api");
const VIEWS_DIR = join(ROOT, "apps", "admin", "src", "views");
const HTTP_FILE = join(API_DIR, "http.ts");
const WRITE_POLICY_FILE = join(ROOT, "apps", "admin", "src", "utils", "write-policy.ts");
const JAVA_ROOT = join(ROOT, "apps", "api", "src", "main", "java", "com", "campuslove", "api");
const SECURITY_CONFIG = join(JAVA_ROOT, "config", "SecurityConfig.java");
const JWT_FILTER = join(JAVA_ROOT, "config", "JwtAuthenticationFilter.java");
const USER_ENTITY = join(JAVA_ROOT, "entity", "User.java");

/** 已知不含写控件的共享文件（http 客户端自身与测试替身不参与判定）。 */
const API_FILE_IGNORE = (name) => name === "http.ts" || name.includes(".test.");

/** 视图豁免表：相对 apps/admin/src/views 的 posix 路径 → 理由。刻意空表。 */
const VIEW_EXEMPTIONS = new Map();

/**
 * 「自助类写端点」白名单（第五轮 B-FINDING 4 后为空，机制保留）。
 *
 * 这里豁免的是【没有任何档位守卫、但按后端确实该连只读角色都能调】的自助写处理函数。
 * 曾经唯一的条目 content/Users.vue#handleChangePwd 的理由「change-password 接受 AUDITOR
 * （类级 hasAnyRole）」是【错的】：SecurityConfig 的 URL 级写规则
 * `POST /api/v1/admin/** → hasAnyRole("ADMIN","SUPER_ADMIN")` 在过滤器层就把 AUDITOR 拦了，
 * 方法级类注解根本没机会生效；api/http.ts 的本地写闸同样拦 AUDITOR。所以那条豁免据以成立的
 * 前提不成立，门据此报「无守卫处理函数 0」是假数。
 * 修法（本文件 + apps/admin/src/views/content/Users.vue）：给改密入口挂真实档位守卫 canWrite
 * （后端把 change-password 收敛到 ADMIN/SUPER_ADMIN，R4-00389 已放开校区 ADMIN 自助改密），
 * 并划掉这条豁免。
 *
 * 元判点（metaCheckSelfServiceExemptions，判红方向见 --self-test）：白名单里若还有条目，
 * 它 reason 里引用的端点【必须能在门自己的 expandAuthorities 结果里放行 reason 声称的角色】，
 * 否则门自身判红——豁免理由写错方向（声称放宽实则被 URL 层拦）不再能蒙过本门。
 * 新增条目必须同时给出后端注解出处 + 可被元判点校验的端点，否则这条白名单会慢慢变成"不想判就塞进来"。
 */
const SELF_SERVICE_WRITE_HANDLERS = new Map();

/**
 * 元判点的解析辅助：从豁免 reason 文本里抠出「HTTP 动词 + 路径」与「声称放行的角色集合」。
 * reason 约定含形如 `POST /v1/admin/xxx 接受 ADMIN/SUPER_ADMIN` 的片段；解析不出来即判红
 * （拒绝「写条含糊的豁免」混过去）。
 */
function parseExemptionReason(reason) {
  const ep = reason.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[\w./{}-]+)/u);
  const roles = (reason.match(/接受\s*([A-Z_/]+)/u) || [])[1];
  return {
    verb: ep ? ep[1] : null,
    path: ep ? ep[2] : null,
    roles: roles ? roles.split("/") : null,
  };
}

const WRITE_CALL = /(?:^|[^.\w])(post|put|patch|del)\s*(?:<[^()]*>)?\s*\(/;
const ADMIN_WRITE_BITS = ["canWrite", "canSuperAdminWrite"];
/** 档位位名的正则交替串（单一来源，别在各条正则里各写一份位名，避免与 ADMIN_WRITE_BITS 漂移）。 */
const WRITE_BITS_ALT = ADMIN_WRITE_BITS.join("|");

/**
 * 裸角色字面比较的词表（第五轮 B-FINDING 5）。
 *
 * 模板里除 `sessionStore.<位>` 之外，还存在把角色直接摊平进 v-if 的写法
 * （`v-if="currentAdminRole === 'SUPER_ADMIN'"`）。这类「裸角色比较」过去完全在档位轴的射程外，
 * 于是「前端比后端严」（后端允许校区 ADMIN、UI 却只放开 SUPER_ADMIN）这个方向没有任何判点。
 * 现在把 `X === 'ADMIN'|'SUPER_ADMIN'|'AUDITOR'`（含反写 `'ROLE' === X`）识别成该角色的单元素集合。
 * 刻意【不】识别 `isSuperAdmin` 这类 computed（它把角色藏进 .value，静态无法确证），
 * 以免把大量合法的 `isSuperAdmin && canSuperAdminWrite` 同档控件误判——那类控件本就档位对齐。
 */
const ROLE_LITERALS = ["ADMIN", "SUPER_ADMIN", "AUDITOR"];
const BARE_ROLE_CMP = /([A-Za-z_$][\w$]*)\s*===?\s*['"](ADMIN|SUPER_ADMIN|AUDITOR)['"]|['"](ADMIN|SUPER_ADMIN|AUDITOR)['"]\s*===?\s*([A-Za-z_$][\w$]*)/g;

/** 事件表达式里不是处理函数的标识符（避免把 `page--`、`$event` 之类当函数名）。 */
const EVENT_EXPR_STOPWORDS = new Set([
  "true", "false", "null", "undefined", "if", "else", "await", "async", "function", "return",
  "new", "typeof", "in", "of", "do", "while", "for", "$event", "event", "value", "Math",
  "String", "Number", "Boolean", "Array", "Object", "Date", "JSON",
]);

/* ------------------------------------------------------------------ *
 * 通用小工具
 * ------------------------------------------------------------------ */

function walkFiles(dir, match, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walkFiles(p, match, out);
    else if (match(p)) out.push(p);
  }
  return out;
}

/**
 * 去掉 Java 的块注释与行注释（保留行号结构），避免 Javadoc 里的 @PreAuthorize 被当成真判据。
 *
 * ⚠ 必须带字符串状态机：`@RequestMapping("/api/v1/admin/**")` 里的 `/*` 会让朴素正则把
 * 之后的真代码当注释整段吞掉（本门第一版就栽在这里，端点表直接空转）。
 */
function stripJavaComments(src) {
  let out = "";
  let i = 0;
  let mode = "code"; // code | line | block | string | char
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === "code") {
      if (c === "/" && n === "/") { mode = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && n === "*") { mode = "block"; out += "  "; i += 2; continue; }
      if (c === '"') { mode = "string"; out += c; i += 1; continue; }
      if (c === "'") { mode = "char"; out += c; i += 1; continue; }
      out += c; i += 1; continue;
    }
    if (mode === "line") {
      if (c === "\n") { mode = "code"; out += c; } else out += " ";
      i += 1; continue;
    }
    if (mode === "block") {
      if (c === "*" && n === "/") { mode = "code"; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : " ";
      i += 1; continue;
    }
    // 字符串/字符字面量：原样保留，只处理转义
    if (c === "\\") { out += c + (n ?? ""); i += 2; continue; }
    if ((mode === "string" && c === '"') || (mode === "char" && c === "'")) mode = "code";
    out += c; i += 1;
  }
  return out;
}

/** 解析 hasRole('X') / hasAnyRole('A','B') ⇒ 角色数组；解析不出来返回 null。 */
function rolesFromPreAuthorize(expr) {
  const m = expr.match(/has(?:Any)?Role\s*\(([^)]*)\)/u);
  if (!m) return null;
  const roles = [...m[1].matchAll(/'([A-Z_]+)'/gu)].map((x) => x[1]);
  return roles.length > 0 ? roles : null;
}

/** Spring 路径 + TS 模板路径统一成段数组，`{var}` 与 `${x}` 都归为 "*"。 */
function pathSegments(path) {
  return path
    .split("?")[0]
    .replace(/\$\{[^}]*\}/gu, "*")
    .replace(/\{[^}]+\}/gu, "*")
    .split("/")
    .filter((s) => s !== "" && s !== "api");
}

function segmentsMatch(pattern, probe) {
  if (pattern.length !== probe.length) return false;
  return pattern.every((seg, i) => seg === "*" || probe[i] === "*" || seg === probe[i]);
}

/* ------------------------------------------------------------------ *
 * A. Java 端点表
 * ------------------------------------------------------------------ */

const URL_WRITE_GRANT = ["ADMIN", "SUPER_ADMIN"];
const URL_READ_GRANT = ["ADMIN", "SUPER_ADMIN", "AUDITOR"];

/**
 * 把「要求的角色」换算成「实际能通过的后台角色集合」，再与 URL 级许可取交集。
 *
 * Spring 的 hasRole('ADMIN') 查的是 ROLE_ADMIN 权限；SUPER_ADMIN 是否也持有 ROLE_ADMIN
 * 由 JwtAuthenticationFilter 按 User#isWriteAdmin() 注入决定（见 securityAuthorityFromJava）。
 */
function expandAuthorities(required, urlGrant, superAdminCarriesAdmin) {
  const all = ["ADMIN", "SUPER_ADMIN", "AUDITOR"];
  const granted = new Set(urlGrant);
  const out = [];
  for (const role of all) {
    const holds = required.some((req) => {
      if (req === role) return true;
      if (req === "ADMIN" && role === "SUPER_ADMIN") return superAdminCarriesAdmin;
      return false;
    });
    if (holds && granted.has(role)) out.push(role);
  }
  return out;
}

/** 从真实 Java 源码判定「SUPER_ADMIN 是否也持有 ROLE_ADMIN」，判不出来就直接红（宁可不判）。 */
function securityAuthorityFromJava() {
  const userSrc = stripJavaComments(readFileSync(USER_ENTITY, "utf8"));
  const isWriteAdmin = userSrc.match(
    /boolean\s+isWriteAdmin\s*\(\s*\)\s*\{[\s\S]{0,300}?\}/u
  );
  if (!isWriteAdmin) {
    throw new Error("User#isWriteAdmin() 源码形态变了，无法判定 SUPER_ADMIN 是否持有 ROLE_ADMIN");
  }
  const carries = /SUPER_ADMIN/i.test(isWriteAdmin[0]);
  const jwtSrc = stripJavaComments(readFileSync(JWT_FILTER, "utf8"));
  if (!/new SimpleGrantedAuthority\("ROLE_ADMIN"\)/u.test(jwtSrc)) {
    throw new Error("JwtAuthenticationFilter 不再注入 ROLE_ADMIN 字面量，权限注入图需人工重定");
  }
  return { superAdminCarriesAdmin: carries, evidence: isWriteAdmin[0].replace(/\s+/gu, " ") };
}

/** SecurityConfig 的 URL 级 admin 写规则必须在位，否则档位算错（规则被删＝交集放大＝假绿）。 */
function assertSecurityConfigShape() {
  const src = readFileSync(SECURITY_CONFIG, "utf8");
  for (const verb of ["POST", "PUT", "PATCH", "DELETE"]) {
    const re = new RegExp(
      `requestMatchers\\(HttpMethod\\.${verb},\\s*"/api/v1/admin/\\*\\*"\\)\\s*\\.hasAnyRole\\("ADMIN",\\s*"SUPER_ADMIN"\\)`,
      "u"
    );
    if (!re.test(src)) {
      throw new Error(`SecurityConfig 里 ${verb} /api/v1/admin/** 的 ADMIN,SUPER_ADMIN 规则形态变了，本门拒绝对档位做判定`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * B. 前端 api 函数 → 端点
 * ------------------------------------------------------------------ */

const VERB_BY_CALL = { get: "GET", post: "POST", put: "PUT", patch: "PATCH", del: "DELETE" };

/** 收集 api 模块中会发出写请求的导出函数名 + 其实际请求（方法, 路径）。 */
function collectWriteApiFunctions() {
  const names = new Set();
  const calls = new Map();
  for (const file of readdirSync(API_DIR)) {
    if (!file.endsWith(".ts") || API_FILE_IGNORE(file)) continue;
    const src = stripJavaComments(readFileSync(join(API_DIR, file), "utf8"));
    const lines = src.split(/\r?\n/);
    let current = null;
    let buffer = [];
    const flush = () => {
      if (!current) return;
      const body = buffer.join("\n");
      if (WRITE_CALL.test(body)) {
        names.add(current);
        const found = [];
        for (const c of body.matchAll(/\b(post|put|patch|del|get)\s*(?:<[^()]*>)?\s*\(\s*([`"'][^`"']*[`"'])/g)) {
          const raw = c[2].slice(1, -1);
          if (!raw.startsWith("/")) continue;
          found.push({ verb: VERB_BY_CALL[c[1]], path: raw });
        }
        if (found.length > 0) calls.set(current, found);
      }
      current = null;
      buffer = [];
    };
    for (const line of lines) {
      const decl = line.match(/^export (?:async )?function (\w+)|^export const (\w+) *=/);
      if (decl) {
        flush();
        current = decl[1] || decl[2];
        buffer = [line];
        continue;
      }
      if (current) buffer.push(line);
    }
    flush();
  }
  return { names, calls };
}

/** 一个 api 函数可能命中多个端点模式；取「最严」档位（保守）。 */
function tierOfAccepted(accepted) {
  const set = new Set(accepted);
  if (!set.has("ADMIN") && set.has("SUPER_ADMIN")) return "super-only";
  if (set.size === 1 && set.has("ADMIN")) return "strict-admin";
  return "any-write";
}

function resolveEndpoints(req, endpoints) {
  const hits = endpoints.filter((e) => e.verb === req.verb && segmentsMatch(e.segments, pathSegments(req.path)));
  return hits;
}

/* ------------------------------------------------------------------ *
 * C. 视图：调用点归属 + 模板控件归属
 * ------------------------------------------------------------------ */

function scriptBlock(src) {
  const m = src.match(/<script setup[^>]*>([\s\S]*?)<\/script>/);
  return m ? { body: m[1], offset: m.index + m[0].indexOf(m[1]) } : null;
}

/** 取视图从 api 模块 import 进来的符号名（含多行形态）。 */
function importedApiSymbols(src) {
  const names = new Set();
  const re = /import\s*\{([^}]*)\}\s*from\s*["']([^"']*\/api\/[^"']+)["']/gs;
  for (const m of src.matchAll(re)) {
    for (const raw of m[1].split(",")) {
      const token = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
      if (token) names.add(token);
    }
  }
  return names;
}

/** 脚本块顶层函数边界：[{name, start, end}]（start/end 为字符偏移）。 */
function topLevelFunctions(scriptSrc) {
  const spans = [];
  const re = /^(?:export )?(?:async )?function (\w+)|^const (\w+)(?::[^=]*)?= (?:async )?\(/gm;
  let m;
  while ((m = re.exec(scriptSrc)) !== null) {
    spans.push({ name: m[1] || m[2], start: m.index });
  }
  return spans.map((s, i) => ({ ...s, end: i + 1 < spans.length ? spans[i + 1].start : scriptSrc.length }));
}

function enclosingFunction(scriptSrc, offset) {
  return topLevelFunctions(scriptSrc).find((f) => offset >= f.start && offset < f.end) || null;
}

/** 守卫位集合：处理函数里出现的 `if (!sessionStore.BIT) return`。 */
function guardsIn(text) {
  const bits = new Set();
  // 旧判据只认 `if (!sessionStore.canX) return` 一种字面写法，
  // 于是 saveAnnouncement 的 `if (!circle || !sessionStore.canWrite || saving) return;`
  // 被算成"无守卫"——门把自己的写法偏好当成了产品缺陷（4 条假盲区）。
  // 现在按语义判：任何 if(条件) … return 的早退，条件里出现 !sessionStore.<档位> 即算守卫。
  //
  // ⚠ 本判点的两个失败方向（第五轮 门可信度结构缺口 b，务必读）：
  //   (1) 保守方向【误报】：把档位赋给中间变量再判（`const can = sessionStore.canWrite; if (!can) return;`），
  //       这里看不见 `!sessionStore.<位>`，会把有守卫的函数算成"无守卫"→ 上 unguardedHandlers 棘轮并判红。
  //       方向保守（宁可误报），可接受；要消红就把守卫写成字面 `!sessionStore.<位>`。
  //   (2) 放宽方向【漏报】：本函数只在早退里找守卫，若守卫写法命中了但角色档位算错，
  //       由 guardsIn 之外的档位交集逻辑负责，不会因本函数漏判而假绿。
  const bitAlt = ADMIN_WRITE_BITS.join("|");
  for (const m of text.matchAll(/if\s*\(([^{};]*)\)\s*(?:\{)?[^{}]*?\breturn\b/gu)) {
    for (const g of m[1].matchAll(new RegExp(`!\\s*sessionStore\\.(${bitAlt})\\b`, "gu"))) {
      bits.add(g[1]);
    }
  }
  return bits;
}

/** 模板元素标签（允许属性值里出现 < >），返回 [{tag, attrs}]。 */
function templateElementTags(tplSrc) {
  const out = [];
  const re = /<([a-zA-Z][\w-]*)((?:(?!\/>)[^<>"']|"[^"]*"|'[^']*')*)>/gs;
  let m;
  while ((m = re.exec(tplSrc)) !== null) out.push({ tag: m[1], attrs: m[2] });
  return out;
}

/**
 * 标签上挂的事件表达式里引用的处理函数名 + 该标签的「实际可点击角色集合」。
 *
 * 语义：同一标签上的多个 v-if/:disabled 取交集（都得成立才可点）；
 * 单个表达式里 `canA && canB` 取交集、`canA || canB` 取并集。
 * 盲区：祖先元素的条件（`<view v-if="canSuperAdminWrite"><button v-if="canWrite" …/></view>`）
 * 看不见，会被当成只按 canWrite 开放 ⇒ 方向保守（可能误报，不会漏报），见文件头。
 */
function controlBindings(tplSrc, tierRoles) {
  const bindings = new Map();
  const intersect = (a, b) => a.filter((r) => b.includes(r));
  const union = (a, b) => [...new Set([...a, ...b])];
  for (const { attrs } of templateElementTags(tplSrc)) {
    const events = [...attrs.matchAll(/(?:@|v-on:)([\w.-]+)="([^"]*)"/g)];
    if (events.length === 0) continue;
    const handlers = new Set();
    for (const ev of events) {
      // `@click="openEdit(school)"` 与 `@confirm="handleSubmit"`（不带括号）两种写法都要认出来，
      // 否则整批 ConfirmDialog 的确认控件都会被视为「找不到归属控件」而记成盲区。
      for (const id of ev[2].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
        if (EVENT_EXPR_STOPWORDS.has(id[1])) continue;
        handlers.add(id[1]);
      }
    }
    let roles = null;
    // 裸角色字面比较单独算一份集合（第五轮 B-FINDING 5）：只有"由裸比较造成的收窄"才触发
    // 「前端比后端严」判红，避免把合法按位收窄的控件也拉进这条新判点。
    let bareRoles = null;
    for (const m of attrs.matchAll(/(?:v-if|v-show|:disabled|v-bind:disabled)="([^"]*)"/g)) {
      const expr = m[1];
      const bits = [...expr.matchAll(new RegExp(`sessionStore\\.(${WRITE_BITS_ALT})`, "g"))].map((x) => x[1]);
      const bareSets = [];
      for (const rc of expr.matchAll(BARE_ROLE_CMP)) {
        const role = rc[2] || rc[3];
        if (role) bareSets.push([role]);
      }
      if (bits.length === 0 && bareSets.length === 0) continue;
      const combine = /\|\|/.test(expr) ? union : intersect;
      let acc = null;
      if (bits.length > 0) {
        acc = tierRoles[bits[0]];
        for (const b of bits.slice(1)) acc = combine(acc, tierRoles[b]);
      }
      if (bareSets.length > 0) {
        let bacc = bareSets[0];
        for (const rs of bareSets.slice(1)) bacc = combine(bacc, rs);
        acc = acc === null ? bacc : intersect(acc, bacc);
        bareRoles = bareRoles === null ? bacc : intersect(bareRoles, bacc);
      }
      roles = roles === null ? acc : intersect(roles, acc);
    }
    for (const h of handlers) {
      if (!bindings.has(h)) bindings.set(h, []);
      bindings.get(h).push({
        roles: roles === null ? null : [...new Set(roles)],
        bare: bareRoles === null ? null : [...new Set(bareRoles)],
      });
    }
  }
  return bindings;
}

function relativeViewPath(absolute) {
  return absolute.slice(VIEWS_DIR.length + 1).split("\\").join("/");
}

/* ------------------------------------------------------------------ *
 * 交叉核对主函数（纯输入 → 问题清单，--self-test 用合成源码喂它）
 * ------------------------------------------------------------------ */

/**
 * @param input.javaFiles   [{path, src}]  admin 控制器源码
 * @param input.apiFiles    [{name, src}]   前端 api 模块
 * @param input.viewFiles   [{rel, src}]    视图
 * @param input.policySrc   write-policy.ts 源码（档位角色集合的唯一事实来源）
 * @param input.authority   {superAdminCarriesAdmin}
 * @param input.securityConfigSrc  SecurityConfig 源码（URL 级规则形态必须可判定）
 * @param input.httpSrc     api/http.ts 源码
 */
function analyze(input) {
  const problems = [];
  const blindSpots = { unattachedControls: [], unmatchedAdminCalls: [], ungardedHandlers: [] };
  // 自助豁免表默认取模块级全局；--self-test 可注入一份"坏方向"的表来证明元判点会咬。
  const selfService = input.selfServiceExemptions || SELF_SERVICE_WRITE_HANDLERS;

  // —— 档位：从 write-policy.ts 源码解析角色集合，而不是在门里抄一份 ——
  const tiers = {};
  for (const bit of ADMIN_WRITE_BITS) {
    const m = input.policySrc.match(new RegExp(`${bit}:\\s*\\[([^\\]]*)\\]`, "u"));
    if (!m) throw new Error(`write-policy.ts 里找不到 ${bit} 的角色集合快照`);
    tiers[bit] = [...m[1].matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]);
    // 下限断言：快照写成 `[...SOME_SET]` 这类不可正则形态时读到的是空集合，
    // 空集合会让「UI 位角色 ⊆ 后端接受角色」恒成立 ⇒ 整条交叉核对假装在跑。
    if (tiers[bit].length === 0) {
      throw new Error(`write-policy.ts 的 ${bit} 档位读不到字面量角色集合（快照形态变了），拒绝以空档位报绿`);
    }
  }

  // —— URL 级规则形态可判定性 ——
  for (const verb of ["POST", "PUT", "PATCH", "DELETE"]) {
    const re = new RegExp(
      `requestMatchers\\(HttpMethod\\.${verb},\\s*"/api/v1/admin/\\*\\*"\\)\\s*\\.hasAnyRole\\("ADMIN",\\s*"SUPER_ADMIN"\\)`,
      "u"
    );
    if (!re.test(input.securityConfigSrc)) {
      problems.push(`SecurityConfig: ${verb} /api/v1/admin/** 的 URL 级写规则不再可判定（档位交集无法成立）`);
    }
  }

  const endpoints = [];
  for (const jf of input.javaFiles) {
    const src = stripJavaComments(jf.src);
    // 类级 @RequestMapping 可缺（feedback/FeedbackController.java 把全路径写在方法上），
    // 缺了就按 base="" 处理；两条路都要求最终全路径落在 /api/v1/admin 下才计入。
    const baseMatch = src.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?"([^"]+)"/u);
    const base = baseMatch ? baseMatch[1] : "";
    if (base && !base.startsWith("/api/v1/admin") && !src.includes("/api/v1/admin")) continue;
    const classIdx = src.search(/\b(?:public\s+)?(?:final\s+)?class\s+\w+/u);
    const head = classIdx >= 0 ? src.slice(0, classIdx) : src;
    const classPre = [...head.matchAll(/@PreAuthorize\s*\(\s*"([^"]+)"\s*\)/gu)].pop();
    const classRoles = classPre ? rolesFromPreAuthorize(classPre[1]) : null;
    const body = classIdx >= 0 ? src.slice(classIdx) : src;
    const mappingRe = /@(Get|Post|Put|Patch|Delete)Mapping\b(\s*\(([^)]*)\))?/gu;
    let m;
    while ((m = mappingRe.exec(body)) !== null) {
      const verb = m[1].toUpperCase();
      const args = m[3] || "";
      const pathM = args.match(/(?:value\s*=\s*)?"([^"]*)"/u);
      const methodPath = pathM ? pathM[1] : "";
      // ⚠ String.prototype.search 会忽略第二个参数（位置），必须切片后再搜——
      // 首版栽在这里：sigIdx 恒等于文件里第一个 public 的下标，窗口塌成空串，
      // 方法级 @PreAuthorize 全部读不到、只剩类级放宽档，整条交叉核对假装在跑。
      const rest = body.slice(m.index);
      const relSig = rest.search(/\b(?:public|protected|private)\b[^\n;{]*\(/u);
      const afterWindow = relSig >= 0 ? rest.slice(0, relSig) : rest.slice(0, 600);
      const prevBrace = body.lastIndexOf("\n    }", m.index);
      const beforeWindow = body.slice(prevBrace >= 0 ? prevBrace + 1 : 0, m.index);
      const preM =
        afterWindow.match(/@PreAuthorize\s*\(\s*"([^"]+)"\s*\)/u) ||
        beforeWindow.match(/@PreAuthorize\s*\(\s*"([^"]+)"\s*\)/u);
      const required = preM ? rolesFromPreAuthorize(preM[1]) : classRoles;
      // 既无方法级也无类级 @PreAuthorize：只剩 SecurityConfig 的 URL 级档位（写=ADMIN/SUPER_ADMIN）
      const urlGrant = verb === "GET" ? URL_READ_GRANT : URL_WRITE_GRANT;
      const fullPath = posix.join(base, methodPath);
      if (!fullPath.startsWith("/api/v1/admin")) continue;
      endpoints.push({
        verb,
        segments: pathSegments(fullPath),
        display: fullPath,
        required: required ?? urlGrant,
        accepted: expandAuthorities(required ?? urlGrant, urlGrant, input.authority.superAdminCarriesAdmin),
        file: jf.path,
      });
    }
  }

  // —— api 函数 → 写请求 ——
  const writeApiFunctions = new Set();
  const apiCalls = new Map();
  for (const af of input.apiFiles) {
    // 同一个字符串感知剥离器：TS 里 `"/v1/admin/x//y"` 这类路径字符串不能被当注释吃掉
    const src = stripJavaComments(af.src);
    const lines = src.split(/\r?\n/);
    let current = null;
    let buffer = [];
    const flush = () => {
      if (!current) return;
      const body = buffer.join("\n");
      if (WRITE_CALL.test(body)) {
        writeApiFunctions.add(current);
        const found = [];
        for (const c of body.matchAll(/\b(post|put|patch|del|get)\s*(?:<[^()]*>)?\s*\(\s*([`"'][^`"']*[`"'])/g)) {
          const raw = c[2].slice(1, -1);
          if (raw.startsWith("/")) found.push({ verb: VERB_BY_CALL[c[1]], path: raw });
        }
        if (found.length > 0) apiCalls.set(current, found);
      }
      current = null;
      buffer = [];
    };
    for (const line of lines) {
      const decl = line.match(/^export (?:async )?function (\w+)|^export const (\w+) *=/);
      if (decl) {
        flush();
        current = decl[1] || decl[2];
        buffer = [line];
        continue;
      }
      if (current) buffer.push(line);
    }
    flush();
  }

  // —— 每个写函数的档位（取最严）——
  const fnTier = new Map();
  for (const [fn, reqs] of apiCalls) {
    let worst = null;
    const matched = [];
    for (const req of reqs) {
      if (req.verb === "GET") continue;
      if (!req.path.startsWith("/v1/admin")) continue;
      const hits = resolveEndpoints(req, endpoints);
      if (hits.length === 0) {
        blindSpots.unmatchedAdminCalls.push(`${fn} → ${req.verb} ${req.path}`);
        continue;
      }
      for (const h of hits) matched.push(`${h.verb} ${h.display}`);
      const tiersOf = hits.map((h) => tierOfAccepted(h.accepted));
      for (const t of tiersOf) {
        if (t === "super-only") worst = "super-only";
        else if (t === "strict-admin" && worst !== "super-only") worst = "strict-admin";
        else if (!worst) worst = "any-write";
      }
    }
    if (worst) fnTier.set(fn, { tier: worst, matched });
  }

  // —— 视图判定 ——
  let writeViews = 0;
  const tierViolations = [];
  for (const vf of input.viewFiles) {
    const rel = vf.rel;
    const src = vf.src;
    const writes = [...importedApiSymbols(src)].filter((n) => writeApiFunctions.has(n));
    if (writes.length === 0) continue;
    writeViews += 1;
    if (VIEW_EXEMPTIONS.has(rel)) continue;

    // 存在性判据（旧版保留，按档位泛化）：视图必须同时藏控件 + 挡函数入口。
    // 档位轴（下面）负责「挂的是不是对的位」，这里只负责「有没有位」。位名取自 ADMIN_WRITE_BITS
    // 单一来源，别在此重复写死位名（档位增减时只改一处）。
    const ANY_BIT_TEMPLATE = new RegExp(`(?:v-if|v-show)="[^"]*sessionStore\\.(${WRITE_BITS_ALT})|:disabled="[^"]*sessionStore\\.(${WRITE_BITS_ALT})`);
    const ANY_BIT_HANDLER = new RegExp(`if\\s*\\(\\s*!sessionStore\\.(${WRITE_BITS_ALT})\\s*\\)\\s*return`);
    const templateGated = ANY_BIT_TEMPLATE.test(src);
    const handlerGated = ANY_BIT_HANDLER.test(src);
    if (!templateGated && !handlerGated) {
      problems.push(`${rel}：import 了 ${writes.length} 个写函数，但既没藏写入口也没挡写函数`);
    } else if (!templateGated) {
      problems.push(`${rel}：写了权限守卫但模板无 v-if/:disabled，AUDITOR 仍会看到可点的写按钮`);
    } else if (!handlerGated) {
      problems.push(`${rel}：只藏了按钮，写函数入口无权限守卫（只藏按钮、函数仍可被程序化调用）`);
    }

    const script = scriptBlock(src);
    if (!script) continue;
    const tpl = src.replace(/<script setup[^>]*>[\s\S]*?<\/script>/g, "");
    const bindings = controlBindings(tpl, tiers);
    // 洗掉脚本块里的 // 与 /* */ 注释（长度不变，偏移对齐）：这样写在 JSDoc 里提到的
    // 函数名（第五轮 Roles.vue:10 的 `assignRoleMenus(id, checkedIds)`）不会被 callRe 当成
    // 真实写调用而误归到 (顶层)；(顶层) 从此只反映真实落在脚本块顶层的写调用。
    const scriptBody = stripJavaComments(script.body);
    const funcs = topLevelFunctions(scriptBody);
    const funcNames = new Set(funcs.map((f) => f.name));

    // 顶层函数之间的调用图：控件常常绑在「打开弹窗」的函数上，真写调用在 handleSubmit 里，
    // 不做传递闭包就只能把整批控件记成盲区（第一版正是这样，68 处全盲）。
    const refGraph = new Map();
    for (const f of funcs) {
      const text = scriptBody.slice(f.start, f.end);
      const callees = new Set();
      for (const g of funcs) {
        if (g.name === f.name || g.name.length < 4) continue;
        if (new RegExp(`\\b${g.name.replace(/\W/g, "\\$&")}\\s*\\(`, "u").test(text)) callees.add(g.name);
      }
      refGraph.set(f.name, callees);
    }
    const writesByFunc = new Map();
    const callRe = new RegExp(`\\b(${writes.map((w) => w.replace(/\W/g, "\\$&")).join("|")})\\s*\\(`, "g");
    for (const c of scriptBody.matchAll(callRe)) {
      const fn = c[1];
      const meta = fnTier.get(fn);
      if (!meta) continue;
      const host = enclosingFunction(scriptBody, c.index);
      const key = host ? host.name : "(顶层)";
      if (!writesByFunc.has(key)) writesByFunc.set(key, []);
      writesByFunc.get(key).push({ host: key, fn, tier: meta.tier, matched: meta.matched });
    }
    const closure = (name, seen = new Set()) => {
      if (seen.has(name)) return [];
      seen.add(name);
      const out = [...(writesByFunc.get(name) || [])];
      for (const callee of refGraph.get(name) || []) out.push(...closure(callee, seen));
      return out;
    };

    /** 档位对应的后端可接受角色 + UI 兼容位。 */
    const acceptedOf = (tier) =>
      tier === "super-only" ? ["SUPER_ADMIN"] : tier === "strict-admin" ? ["ADMIN"] : URL_WRITE_GRANT;
    const compatibleOf = (accepted) =>
      ADMIN_WRITE_BITS.filter((bit) => tiers[bit].every((r) => accepted.includes(r)));

    // —— 守卫轴：写调用所在函数自己必须有档位兼容的守卫 ——
    const attached = new Set();
    for (const [hostName, calls] of writesByFunc) {
      // 第五轮结构缺口 (a) 收口：脚本块顶层直接出现的写调用【不再】享受「整文件守卫并集」
      // （过去 hostText=整个脚本、守卫取全文件并集，一个缺守卫的处理函数可被同文件另一个
      // 处理函数的守卫蒙混过去）。改为直接判红——写调用要么落在有守卫的顶层函数里，要么就是债。
      // 因脚本已做注释剥离，正常情况下 (顶层) 不再被 JSDoc 里的函数名误触发；一旦这里报红，
      // 就是真实的「模块作用域直接发写请求」，必须人工核实并包进带守卫的函数。
      if (hostName === "(顶层)") {
        for (const call of calls) {
          problems.push(
            `${rel}#(顶层)：写调用 ${call.fn} → ${call.matched.join(", ")} 直接落在脚本块顶层，`
            + "无法确定它受哪个档位守卫保护（第五轮起此形态即红，不收全文件守卫并集）",
          );
        }
        continue;
      }
      const f = funcs.find((x) => x.name === hostName);
      const hostText = f ? scriptBody.slice(f.start, f.end) : "";
      const guards = [...guardsIn(hostText)];
      if (guards.length === 0) {
        if (!selfService.has(`${rel}#${hostName}`)) {
          blindSpots.ungardedHandlers.push(`${rel}#${hostName}`);
        }
        continue; // 无守卫由 unguardedHandlers 上界（必须为 0）负责，不与档位违规重复计数
      }
      // 豁免只减不增：自助端点哪天真的加了守卫，就把白名单条目划掉。
      if (selfService.has(`${rel}#${hostName}`)) {
        problems.push(
          `${rel}#${hostName} 现在有守卫了（${[...guards].join("/")}）`
            + "，SELF_SERVICE_WRITE_HANDLERS 里的豁免必须划掉",
        );
      }
      // 多个守卫是串联早退 ⇒ 实际可点击角色 = 各守卫角色集合的交集
      let effective = [...tiers[guards[0]]];
      for (const g of guards.slice(1)) effective = effective.filter((r) => tiers[g].includes(r));
      for (const call of calls) {
        const accepted = acceptedOf(call.tier);
        const rejected = effective.filter((r) => !accepted.includes(r));
        if (rejected.length > 0) {
          tierViolations.push(
            `${rel}#${hostName}：调用 ${call.fn} → ${call.matched.join(", ")}`
            + `（后端只接受 ${accepted.join("/")}），守卫位 ${guards.join("/")} 仍放行 ${rejected.join("/")}，`
            + `应改为 ${compatibleOf(accepted).join(" 或 ")}`
          );
        }
      }
    }

    // —— 控件轴：模板标签（含传递可达）的可点击角色 vs 后端档位 ——
    for (const [handler, entries] of bindings) {
      if (!funcNames.has(handler)) continue;
      const reach = closure(handler);
      for (const call of reach) attached.add(`${call.host}::${call.fn}`);
      for (const entry of entries) {
        const roles = entry.roles;
        if (roles === null) continue; // 标签上没挂任何位/裸比较：交给存在性判据
        for (const call of reach) {
          const accepted = acceptedOf(call.tier);
          // (a) 前端比后端松：UI 放过了后端不接受的角色 → ADMIN/AUDITOR 白吃 403。
          const bad = roles.filter((r) => !accepted.includes(r));
          if (bad.length > 0) {
            tierViolations.push(
              `${rel}：<绑定 ${handler}() 的控件> 可点击角色含 ${bad.join("/")}，`
              + `但 ${call.fn} → ${call.matched.join(", ")} 后端只接受 ${accepted.join("/")}`
              + `（应挂 ${compatibleOf(accepted).join(" 或 ")}）`
            );
          }
          // (b) 前端比后端严（第五轮 B-FINDING 5）：仅当收窄来自【裸角色字面比较】时判红——
          //     后端写档放行的角色被裸比较藏了起来（例：change-password 后端=ADMIN/SUPER_ADMIN，
          //     UI 用 `currentAdminRole === 'SUPER_ADMIN'` 外壳把校区 ADMIN 挡在门外）。
          //     按位（sessionStore.<位>）造成的收窄不在这里判红，避免误伤合法的超管专属控件；
          //     那是另一条轴（守卫轴 + compatibleOf 建议）的职责。
          if (entry.bare) {
            const missing = accepted.filter((r) => ["ADMIN", "SUPER_ADMIN"].includes(r) && !entry.bare.includes(r));
            if (missing.length > 0) {
              tierViolations.push(
                `${rel}：<绑定 ${handler}() 的控件> 用裸角色比较 ${entry.bare.join("/")} 只放开这些角色，`
                + `但 ${call.fn} → ${call.matched.join(", ")} 后端还接受 ${missing.join("/")}（前端比后端严，功能倒退），`
                + `应改挂 ${compatibleOf(accepted).join(" 或 ")} 而不是写死角色比较`
              );
            }
          }
        }
      }
    }
    for (const [hostName, calls] of writesByFunc) {
      if (!calls.some((c) => attached.has(`${c.host}::${c.fn}`))) {
        blindSpots.unattachedControls.push(`${rel}#${hostName}`);
      }
    }
  }

  problems.push(...tierViolations);
  const tierReport = [];
  for (const [fn, meta] of fnTier) {
    if (meta.tier !== "any-write") tierReport.push(`${fn} [${meta.tier}] → ${meta.matched.join(", ")}`);
  }

  // —— 元判点（第五轮 B-FINDING 4）：SELF_SERVICE_WRITE_HANDLERS 的每条豁免方向必须自证 ——
  // 豁免的语义是「该端点连声称角色都能调、所以处理函数不该有写档守卫」。若某条豁免 reason 里
  // 引用的端点，在门【自己】的 expandAuthorities 结果里根本放行不了它声称的角色（就像旧那条
  // 「change-password 接受 AUDITOR」——URL 级写规则早把 AUDITOR 拦了），则这条豁免方向写反了，
  // 会掩盖真正的无守卫处理函数。此时门自身判红：豁免写错方向不再能蒙过本门。
  for (const [handlerKey, reason] of selfService) {
    const parsed = parseExemptionReason(reason);
    if (!parsed.verb || !parsed.path || !parsed.roles || parsed.roles.length === 0) {
      problems.push(`豁免 ${handlerKey} 的 reason 解析不出「动词 + 路径 + 接受角色」三要素：${reason}`);
      continue;
    }
    const probe = { verb: parsed.verb, path: parsed.path };
    const hits = resolveEndpoints(probe, endpoints);
    if (hits.length === 0) {
      problems.push(`豁免 ${handlerKey} 声称的端点 ${parsed.verb} ${parsed.path} 在 Java 端点表里找不到`);
      continue;
    }
    const acceptedUnion = [...new Set(hits.flatMap((h) => h.accepted))];
    const notAccepted = parsed.roles.filter((r) => !acceptedUnion.includes(r));
    if (notAccepted.length > 0) {
      problems.push(
        `豁免 ${handlerKey} 声称「${parsed.verb} ${parsed.path} 接受 ${parsed.roles.join("/")}」，`
        + `但 expandAuthorities 得出该端点实际只放行 ${acceptedUnion.join("/") || "(无人)"}，`
        + `${notAccepted.join("/")} 根本过不去 ⇒ 豁免方向写反，本门拒绝据此把无守卫处理函数抹掉`,
      );
    }
  }

  // —— 死位判点（第五轮 B-FINDING 12）：每个档位位必须有视图消费方，否则位↔消费方不一致即红 ——
  // 位声明在 write-policy.ts（本门按 ADMIN_WRITE_BITS 解析），但没有一个视图引用它，
  // 就是一条永不执行的空契约（canAdminOnlyWrite 正是如此被删）。新增位必须先接消费者。
  const bitConsumers = {};
  for (const bit of ADMIN_WRITE_BITS) bitConsumers[bit] = 0;
  for (const vf of input.viewFiles) {
    for (const bit of ADMIN_WRITE_BITS) {
      const n = (vf.src.match(new RegExp(`sessionStore\\.${bit}\\b`, "g")) || []).length;
      if (n > 0) bitConsumers[bit] += 1;
    }
  }
  for (const bit of ADMIN_WRITE_BITS) {
    if (bitConsumers[bit] === 0) {
      problems.push(`档位位 ${bit} 没有任何视图引用（sessionStore.${bit} 命中 0 个视图）= 死位，要么接消费方要么删位`);
    }
  }

  // —— B-FINDING 13：打印「Java 注解数」与「门归档 super-only 函数数」并断言单调关系 ——
  let superAdminAnnotations = 0;
  for (const jf of input.javaFiles) {
    const stripped = stripJavaComments(jf.src);
    for (const _ of stripped.matchAll(/@PreAuthorize\s*\(\s*["']hasRole\(\s*'SUPER_ADMIN'\s*\)["']/gu)) {
      superAdminAnnotations += 1;
    }
  }
  let superOnlyArchivedFunctions = 0;
  for (const [, meta] of fnTier) if (meta.tier === "super-only") superOnlyArchivedFunctions += 1;

  return {
    problems,
    tierReport,
    blindSpots,
    counts: {
      superAdminAnnotations,
      superOnlyArchivedFunctions,
      bitConsumers,
    },
    stats: {
      writeApiFunctions: writeApiFunctions.size,
      writeViews,
      endpoints: endpoints.length,
      tieredFunctions: fnTier.size,
    },
  };
}

/* ------------------------------------------------------------------ *
 * --self-test：每个判点方向都必须能红
 * ------------------------------------------------------------------ */

// 档位快照读【真实】write-policy.ts（第五轮 B-FINDING 12：旧自测把 canAdminOnlyWrite 写成
// ["ADMIN"]，与真实文件的 ["ADMIN","SUPER_ADMIN"] 不同 ⇒ 真实档位从未被用例走过）。
// 现在自测与真跑共用同一份档位源，档位一旦漂移自测立即失配。
const POLICY_SNIPPET = readFileSync(WRITE_POLICY_FILE, "utf8");
const SEC_CFG = `
                .requestMatchers(HttpMethod.POST, "/api/v1/admin/**")
                        .hasAnyRole("ADMIN", "SUPER_ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/admin/**")
                        .hasAnyRole("ADMIN", "SUPER_ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/**")
                        .hasAnyRole("ADMIN", "SUPER_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/**")
                        .hasAnyRole("ADMIN", "SUPER_ADMIN")
`;

function fixture({ superOnly, adminOnly, authority }) {
  const java = [];
  if (superOnly) {
    java.push({
      path: "FixSuper.java",
      src: `@RequestMapping("/api/v1/admin/fix")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
public class FixSuperController {
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public String create() { return "ok"; }
}`,
    });
  }
  if (adminOnly) {
    java.push({
      path: "FixAdmin.java",
      src: `@RequestMapping("/api/v1/admin/fix")
public class FixAdminController {
    @PutMapping("/{id}/reply")
    @PreAuthorize("hasRole('ADMIN')")
    public String reply() { return "ok"; }
}`,
    });
  }
  const api = [
    { name: "fix.ts", src: `export function createFix() {\n  return post("/v1/admin/fix", {});\n}\n\nexport function replyFix(id) {\n  return put(\`/v1/admin/fix/\${id}/reply\`, {});\n}\n` },
  ];
  // 两个写函数分别挂到两个位上：档位快照（真实文件）有 canWrite + canSuperAdminWrite 两把位，
  // 若某位没有任何视图引用会被死位判点判红；这里让正例引用两把位，避免自测被死位噪声干扰。
  const view = () => ({
    rel: "Fix.vue",
    src: `<script setup lang="ts">\nimport { createFix, replyFix } from "@/api/fix";\nfunction doCreate() {\n  if (!sessionStore.canWrite) return;\n  if (!sessionStore.canSuperAdminWrite) return;\n  createFix();\n}\nfunction doReply() {\n  if (!sessionStore.canWrite) return;\n  if (!sessionStore.canSuperAdminWrite) return;\n  replyFix(1);\n}\n</script>\n<template>\n  <button v-if="sessionStore.canSuperAdminWrite" @click="doCreate()">a</button>\n  <button v-if="sessionStore.canSuperAdminWrite" @click="doReply()">b</button>\n</template>\n`,
  });
  return {
    javaFiles: java,
    apiFiles: api,
    viewFiles: [view()],
    policySrc: POLICY_SNIPPET,
    securityConfigSrc: SEC_CFG,
    authority: { superAdminCarriesAdmin: authority },
  };
}

if (process.argv.includes("--self-test")) {
  // (a) 超管端点挂在只有 canWrite 的控件上 ⇒ 必须红（档位轴方向"前端比后端松"）
  const redA = analyze({
    ...fixture({ superOnly: true, adminOnly: false, authority: true }),
    viewFiles: [{
      rel: "Fix.vue",
      src: `<script setup lang="ts">\nimport { createFix, replyFix } from "@/api/fix";\nfunction doCreate() {\n  if (!sessionStore.canWrite) return;\n  createFix();\n}\nfunction doReply() {\n  if (!sessionStore.canWrite) return;\n  replyFix(1);\n}\n</script>\n<template>\n  <button v-if="sessionStore.canWrite" @click="doCreate()">a</button>\n  <button v-if="sessionStore.canWrite" @click="doReply()">b</button>\n</template>\n`,
    }],
  });
  assert.ok(
    redA.problems.some((p) => p.includes("Fix.vue#doCreate") && p.includes("canSuperAdminWrite")),
    `自测失败：方向 (a)（超管端点 + canWrite 控件）没有被判红，实际问题清单=${JSON.stringify(redA.problems)}`
  );
  // (b) 后端只认纯 ADMIN（认证图不再让 SUPER_ADMIN 持有 ROLE_ADMIN）而 UI 位放过 SUPER_ADMIN ⇒ 必须红
  const redB = analyze({
    ...fixture({ superOnly: false, adminOnly: true, authority: false }),
    viewFiles: [{
      rel: "Fix.vue",
      src: `<script setup lang="ts">\nimport { createFix, replyFix } from "@/api/fix";\nfunction doCreate() {\n  if (!sessionStore.canWrite) return;\n  createFix();\n}\nfunction doReply() {\n  if (!sessionStore.canWrite) return;\n  replyFix(1);\n}\n</script>\n<template>\n  <button v-if="sessionStore.canWrite" @click="doCreate()">a</button>\n  <button v-if="sessionStore.canWrite" @click="doReply()">b</button>\n</template>\n`,
    }],
  });
  assert.ok(
    redB.problems.some((p) => p.includes("Fix.vue#doReply") && p.includes("ADMIN")),
    `自测失败：方向 (b)（纯 ADMIN 端点 + 含 SUPER_ADMIN 的位）没有被判红，实际问题清单=${JSON.stringify(redB.problems)}`
  );
  // (c) 前端比后端严（第五轮 B-FINDING 5）：any-write 端点被裸角色比较 currentAdminRole==='SUPER_ADMIN'
  //     藏掉校区 ADMIN ⇒ 必须红。这是新增的"档位轴看得见裸比较"判点。
  const strictJava = [{
    path: "FixAny.java",
    src: `@RequestMapping("/api/v1/admin/fix")
public class FixAnyController {
    @PostMapping
    public String create() { return "ok"; }
}`,
  }];
  const redC = analyze({
    javaFiles: strictJava,
    apiFiles: [{ name: "fix.ts", src: `export function createFix() {\n  return post("/v1/admin/fix", {});\n}\n` }],
    viewFiles: [{
      rel: "Fix.vue",
      src: `<script setup lang="ts">\nimport { createFix } from "@/api/fix";\nfunction doCreate() {\n  if (!sessionStore.canWrite) return;\n  createFix();\n}\nfunction doReply() {\n  if (!sessionStore.canSuperAdminWrite) return;\n}\n</script>\n<template>\n  <button v-if="currentAdminRole === 'SUPER_ADMIN'" @click="doCreate()">a</button>\n  <button v-if="sessionStore.canSuperAdminWrite" @click="doReply()">b</button>\n</template>\n`,
    }],
    policySrc: POLICY_SNIPPET,
    securityConfigSrc: SEC_CFG,
    authority: { superAdminCarriesAdmin: true },
  });
  assert.ok(
    redC.problems.some((p) => p.includes("前端比后端严") && p.includes("doCreate")),
    `自测失败：方向 (c)（裸角色比较把后端放开的 ADMIN 藏起来）没有被判红，实际问题清单=${JSON.stringify(redC.problems)}`
  );
  // (d) 元判点（第五轮 B-FINDING 4）：豁免声称端点接受 AUDITOR，但 URL 写档只放 ADMIN/SUPER_ADMIN
  //     ⇒ 豁免方向写反 ⇒ 门自身判红。
  const metaJava = [{
    path: "FixSelf.java",
    src: `@RequestMapping("/api/v1/admin/account")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
public class FixSelfController {
    @PostMapping("/change-password")
    public String chg() { return "ok"; }
}`,
  }];
  const redD = analyze({
    javaFiles: metaJava,
    apiFiles: [{ name: "account.ts", src: `export function changePassword() {\n  return post("/v1/admin/account/change-password", {});\n}\n` }],
    viewFiles: [{
      rel: "content/Users.vue",
      src: `<script setup lang="ts">\nimport { changePassword } from "@/api/account";\nfunction handleChangePwd() {\n  changePassword();\n}\n</script>\n<template>\n  <button @click="handleChangePwd">x</button>\n</template>\n`,
    }],
    policySrc: POLICY_SNIPPET,
    securityConfigSrc: SEC_CFG,
    authority: { superAdminCarriesAdmin: true },
    selfServiceExemptions: new Map([
      ["content/Users.vue#handleChangePwd", "POST /v1/admin/account/change-password 接受 AUDITOR（类级 hasAnyRole）"],
    ]),
  });
  assert.ok(
    redD.problems.some((p) => p.includes("豁免方向写反") || p.includes("豁免方向写反，本门拒绝")),
    `自测失败：元判点 (d)（豁免声称放宽给 URL 层拦掉的角色）没有被判红，实际问题清单=${JSON.stringify(redD.problems)}`
  );
  // (e) 脚本块顶层直接写调用 ⇒ 判红（第五轮结构缺口 a）。
  const redE = analyze({
    javaFiles: [{
      path: "FixTop.java",
      src: `@RequestMapping("/api/v1/admin/fix")\npublic class FixTopController {\n    @PostMapping\n    public String create() { return "ok"; }\n}`,
    }],
    apiFiles: [{ name: "fix.ts", src: `export function createFix() {\n  return post("/v1/admin/fix", {});\n}\n` }],
    viewFiles: [{
      rel: "Top.vue",
      src: `<script setup lang="ts">\nimport { createFix } from "@/api/fix";\ncreateFix();\nfunction noop() {\n  if (!sessionStore.canWrite) return;\n}\nfunction noop2() {\n  if (!sessionStore.canSuperAdminWrite) return;\n}\n</script>\n<template>\n  <button v-if="sessionStore.canWrite" @click="noop()">a</button>\n  <button v-if="sessionStore.canSuperAdminWrite" @click="noop2()">b</button>\n</template>\n`,
    }],
    policySrc: POLICY_SNIPPET,
    securityConfigSrc: SEC_CFG,
    authority: { superAdminCarriesAdmin: true },
  });
  assert.ok(
    redE.problems.some((p) => p.includes("#(顶层)") && p.includes("脚本块顶层")),
    `自测失败：判点 (e)（脚本块顶层写调用不吃全文件守卫并集）没有被判红，实际问题清单=${JSON.stringify(redE.problems)}`
  );
  // (f) 死位判点（第五轮 B-FINDING 12）：视图一个位都不引用 ⇒ 位↔消费方不一致即红。
  const redF = analyze({
    javaFiles: [],
    apiFiles: [{ name: "fix.ts", src: `export function createFix() {\n  return post("/v1/admin/fix", {});\n}\n` }],
    viewFiles: [{
      rel: "Dead.vue",
      src: `<script setup lang="ts">\nimport { createFix } from "@/api/fix";\nfunction doCreate() {\n  createFix();\n}\n</script>\n<template>\n  <button @click="doCreate()">a</button>\n</template>\n`,
    }],
    policySrc: POLICY_SNIPPET,
    securityConfigSrc: SEC_CFG,
    authority: { superAdminCarriesAdmin: true },
  });
  assert.ok(
    redF.problems.some((p) => p.includes("死位")),
    `自测失败：判点 (f)（死位无消费方）没有被判红，实际问题清单=${JSON.stringify(redF.problems)}`
  );
  // 正控：档位对齐且两位都有消费方时必须绿，且扫描面确实识别到了端点（否则上面几条红是空转）
  const greenSuper = analyze({
    ...fixture({ superOnly: true, adminOnly: false, authority: true }),
    viewFiles: [{
      rel: "Fix.vue",
      src: `<script setup lang="ts">\nimport { createFix, replyFix } from "@/api/fix";\nfunction doCreate() {\n  if (!sessionStore.canWrite) return;\n  if (!sessionStore.canSuperAdminWrite) return;\n  createFix();\n}\nfunction doReply() {\n  if (!sessionStore.canWrite) return;\n  if (!sessionStore.canSuperAdminWrite) return;\n  replyFix(1);\n}\n</script>\n<template>\n  <button v-if="sessionStore.canWrite && sessionStore.canSuperAdminWrite" @click="doCreate()">a</button>\n  <button v-if="sessionStore.canWrite" @click="doReply()">b</button>\n</template>\n`,
    }],
  });
  assert.equal(
    greenSuper.problems.find((p) => p.includes("doCreate") || p.includes("死位") || p.includes("脚本块顶层")),
    undefined,
    `自测失败：档位对齐的正例被判红（误报）：${JSON.stringify(greenSuper.problems)}`
  );
  assert.ok(greenSuper.stats.endpoints >= 1, "自测失败：Java 端点表为空，判据是空门");
  assert.ok(greenSuper.stats.tieredFunctions >= 1, "自测失败：没有 api 函数被归到任何档位");
  console.log(
    `admin write-gate self-test ok（(a)超管档位 (b)纯 ADMIN 档位 (c)前端比后端严 (d)豁免方向写反 `
    + `(e)脚本块顶层写调用 (f)死位 六向判红，正控绿；端点 ${greenSuper.stats.endpoints} / 归档函数 ${greenSuper.stats.tieredFunctions}）`
  );
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * 真实扫描
 * ------------------------------------------------------------------ */

const writeApi = collectWriteApiFunctions();
if (writeApi.names.size < 20) {
  throw new Error(
    `写 API 函数只识别到 ${writeApi.names.size} 个，判据本身可疑（api 目录形态变了？），拒绝以门放行`
  );
}
assertSecurityConfigShape();
const authority = securityAuthorityFromJava();

const javaFiles = walkFiles(JAVA_ROOT, (p) => p.endsWith(".java"), [])
  .filter((p) => readFileSync(p, "utf8").includes("/api/v1/admin"));
const viewFiles = walkFiles(VIEWS_DIR, (p) => p.endsWith(".vue"), []).map((p) => ({
  rel: relativeViewPath(p),
  src: readFileSync(p, "utf8"),
}));

const result = analyze({
  javaFiles: javaFiles.map((p) => ({
    path: p.slice(ROOT.length + 1).split("\\").join("/"),
    src: readFileSync(p, "utf8"),
  })),
  apiFiles: readdirSync(API_DIR)
    .filter((f) => f.endsWith(".ts") && !API_FILE_IGNORE(f))
    .map((f) => ({ name: f, src: readFileSync(join(API_DIR, f), "utf8") })),
  viewFiles,
  policySrc: readFileSync(WRITE_POLICY_FILE, "utf8"),
  securityConfigSrc: readFileSync(SECURITY_CONFIG, "utf8"),
  authority,
});

// 下限闸必须在位：http.ts 少了本地写拦截，AUDITOR 就能真的把请求发出去。
const httpSrc = readFileSync(HTTP_FILE, "utf8");
for (const anchor of ["persistedSessionRole", "roleCanWrite"]) {
  if (!httpSrc.includes(anchor)) {
    result.problems.push(`api/http.ts 缺少 ${anchor}：只读角色的写请求不再被本地拦下`);
  }
}

if (writeApi.names.size < 20) {
  result.problems.push("写 API 函数识别数跌破 20，扫描面失效");
}
// 反向对照：本门自身的判据不能空转。
if (result.stats.writeViews === 0) {
  throw new Error("未识别到任何 import 写函数的视图，扫描面失效，本门拒绝报绿");
}
if (result.stats.endpoints < 30) {
  throw new Error(
    `只从 Java 源码识别到 ${result.stats.endpoints} 个带 @PreAuthorize 的 admin 端点（<30），`
    + "后端解析失效，本门拒绝以「档位全对」报绿"
  );
}

/**
 * 盲区上界（棘轮，第五轮 C-F6 改为「实测值 + 双向收缩」）：这三类是「本门判不到」的清单。
 *   - unattachedControls：过去写死 30 而实测 23，注释声称「只降不升」却没有任何收缩判点，
 *     等于给未来 7 个盲区留了静默扩张空间（与同族 tz/collation/openapi/parity/i18n 的双向纪律不一致）。
 *     现把基线钉成【实测值】，并补一条收缩红：实测 < 基线 即红（要求把基线同步下调），
 *     实测 > 基线 即红（新盲区）——两个方向都必须显式改这个数字并说明理由。
 *   - unmatchedAdminCalls / ungardedHandlers：基线 0，本就只允许为 0（>0 即红）；0 无法再收缩，
 *     不做收缩红。
 */
const BLIND_SPOT_CEILING = {
  unattachedControls: 22,
  unmatchedAdminCalls: 0,
  ungardedHandlers: 0,
};

const diagnostics = [];
if (process.env.ADMIN_WRITE_GATE_VERBOSE === "1") {
  for (const p of result.blindSpots.unattachedControls) diagnostics.push(`  ~ 控件归属盲区: ${p}`);
  for (const p of result.blindSpots.unmatchedAdminCalls) diagnostics.push(`  ~ 端点未匹配: ${p}`);
  for (const p of result.blindSpots.ungardedHandlers) diagnostics.push(`  ~ 无守卫处理函数: ${p}`);
  for (const line of result.tierReport) diagnostics.push(`  # ${line}`);
}
console.log(diagnostics.join("\n"));

// B-FINDING 13：打印两个口径读数（Java 注解 vs 门归档函数），并断言单调关系。
// 归档到 super-only 的 TS 写函数【不可能】多于后端 hasRole('SUPER_ADMIN') 注解数
// （门只归档落在 /api/v1/admin 且被 TS 命中的端点，是注解数的子集）。
// 一旦「归档函数数 > 注解数」，说明档位解析把非超管端点错归成 super-only（结构漂移），判红。
console.log(
  `SUPER_ADMIN 口径（B-FINDING 13）：Java 注解 hasRole('SUPER_ADMIN')=${result.counts.superAdminAnnotations} 处 / `
  + `门归档 super-only TS 写函数=${result.counts.superOnlyArchivedFunctions} 个（后者必须 ≤ 前者）`
);
const countViolations = [];
if (result.counts.superOnlyArchivedFunctions > result.counts.superAdminAnnotations) {
  countViolations.push(
    `归档 super-only 函数 ${result.counts.superOnlyArchivedFunctions} > Java hasRole('SUPER_ADMIN') 注解 ${result.counts.superAdminAnnotations}：档位解析越界，单调关系破了`
  );
}

const blindOverruns = [];
for (const [key, ceiling] of Object.entries(BLIND_SPOT_CEILING)) {
  if (result.blindSpots[key].length > ceiling) {
    // 报数不报名 = 让下一个人重新做一遍本门的分析；把肇事者一并打出来。
    const named = result.blindSpots[key].slice(0, 12).join("、");
    const more = result.blindSpots[key].length > 12 ? `…（共 ${result.blindSpots[key].length} 条）` : "";
    blindOverruns.push(`${key}: 实测 ${result.blindSpots[key].length} > 上界 ${ceiling} ⇒ ${named}${more}`);
  } else if (result.blindSpots[key].length < ceiling) {
    // 收缩红（C-F6）：盲区变少了却不下调基线 = 基线高于实测 = 给未来退化留余量，
    // 与同族 tz/collation/openapi/parity/i18n 的"缩了不降也红"一致。
    blindOverruns.push(`${key}: 实测 ${result.blindSpots[key].length} < 基线 ${ceiling} ⇒ 基线可以且必须降到 ${result.blindSpots[key].length}（只降不升，双向收缩）`);
  }
}

if (result.problems.length > 0 || blindOverruns.length > 0 || countViolations.length > 0) {
  console.error(
    `admin write-gate contract FAIL（写视图 ${result.stats.writeViews} 个，端点 ${result.stats.endpoints} 个，不中 ${result.problems.length} 条）`
  );
  for (const p of result.problems) console.error(`  - ${p}`);
  for (const p of blindOverruns) console.error(`  × 盲区扩张: ${p}`);
  for (const p of countViolations) console.error(`  × 档位计数越界: ${p}`);
  process.exit(1);
}

console.log(
  `admin write-gate contract ok（写 API 函数 ${result.stats.writeApiFunctions} 个 / 写视图 ${result.stats.writeViews} 个 / `
  + `Java 写端点 ${result.stats.endpoints} 个 / 已归档写函数 ${result.stats.tieredFunctions} 个 / 不中 0 条 / 豁免 ${VIEW_EXEMPTIONS.size} 条）`
);
console.log(
  `盲区（本门判不到、已在文件头逐条说明）：控件未能按处理函数归属 ${result.blindSpots.unattachedControls.length} 处（上界 ${BLIND_SPOT_CEILING.unattachedControls}）/ `
  + `TS 路径未匹配到 Java 端点 ${result.blindSpots.unmatchedAdminCalls.length} 处（上界 0）/ 无守卫处理函数 ${result.blindSpots.ungardedHandlers.length} 处（上界 0）`
);
