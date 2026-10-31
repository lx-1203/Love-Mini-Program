/**
 * 法律文本取数模块（SubTask 3.3.5 → S2-6 去内嵌副本，2026-10-31）
 *
 * 设计目标：
 *   1. 法律文本（用户协议 / 隐私政策）**只有一个运行时来源**：后端 CMS
 *      GET /api/v1/config/legal（ConfigController → LegalDocumentService → legal_document 表）；
 *   2. 无网络 / 后台不可达时，本页仍要渲染得出——由本文件的**离线兜底摘要**承担；
 *   3. 5 分钟内存缓存，按「当前登录账号」分区，避免把上一个账号会话取回的文本
 *      当成当前账号的正式文本继续展示。
 *
 * ─── 真相源（S2-6，2026-10-31 收口）───
 *   后端 MySQL 表 legal_document（V2026.10.28.0001__create_legal_document.sql）
 *   是法律文本的唯一正式真源：
 *     - 读取链：GET /api/v1/config/legal → ConfigController.getLegalText
 *       → LegalDocumentService.list/getPublished → legal_document
 *       （DB 优先，按 status='published' + effective_at 取最新）；
 *     - 注册同意留痕的版本号同样取自该表
 *       （AgreementConsentService → LegalDocumentService.currentVersion）；
 *     - 后台法务经 AdminLegalController 改文并发布新版本；
 *     - LegalTextProvider（Java 字面量）只是 legal_document 空表时的种子/兜底，
 *       由 LegalDocumentService 反向注入，不是第二真相源。
 *
 *   本次改动删掉了客户端里的**第二份正文副本**：原先 i18n 语言包
 *   （i18n/locales/zh-CN.ts 的 legal.userAgreement.content / legal.privacyPolicy.content，
 *   各约 1.5KB 全文）既进 real 包体积、又会与表内容漂移，而它恰恰是「后端不可达」时
 *   上屏的那一份——用户看到的"协议"可能早已不是法务发布的版本。
 *   现在语言包只保留标题/按钮等 UI 字串（legal.*.title / accept / lastUpdated / consent.*），
 *   **不再保留任何法律正文**；兜底正文是本文件里那段明确标注「离线兜底摘要 · 非正式文本」的
 *   短摘要，配合 LegalTextPage 的披露药丸（version === "local-fallback" 时上屏
 *   「本地兜底文本 · 非正式版本」、且不印日期）一起构成"这不是可签署的正式文本"的可见事实。
 *   兜底版本号固定为 "local-fallback"，updatedAt 留空——合规文本的时间戳不许由前端自造
 *   （R11-L13-D16 的裁定），正式口径只认后端 CMS 的 updatedAt 单点供给。
 *
 * 与 services/http.ts 的关系：
 *   - 通过 services/http.ts 的 request<T>() 发起 GET 请求
 *   - 复用统一的鉴权、超时、重试、错误处理拦截器
 *   - /api/v1/config/legal 在 SecurityConfig 里是 permitAll（注册前即需展示），
 *     ConfigController 直接返回 LegalTextListResponse 记录（裸 { items: [...] }，无 ApiResponse 信封）
 *
 * 与 mp-weixin 构建的关系：
 *   - scripts/strip-mock-for-mp.mjs 只桩化 services/mocks/fixtures.ts 与各 store 的 mock-data.ts，
 *     **不桩化 i18n/locales/zh-CN.ts，也不桩化本文件** ⇒ 删掉的 legal.*.content 键
 *     不会与桩化脚本相互影响；本文件离线兜底常量在 real 包中原样保留（刻意如此：
 *     无网络时它是唯一可读内容）。
 *
 * 使用示例：
 *   import { getLegalText, LegalTextType } from "@/config/legal-texts";
 *   const agreement = await getLegalText(LegalTextType.USER_AGREEMENT);
 *   uni.showModal({ title: agreement.title, content: agreement.content });
 */

import { request } from "../services/http";
import { isMockMode } from "./env";
import { t } from "../i18n";
import { STORAGE_KEYS } from "../constants/storage-keys";

/**
 * 法律文本类型枚举。
 *
 * 与后端 API 契约保持一致（GET /api/v1/config/legal?type=user_agreement|privacy_policy）。
 */
export enum LegalTextType {
  /** 用户协议 */
  USER_AGREEMENT = "user_agreement",
  /** 隐私政策 */
  PRIVACY_POLICY = "privacy_policy",
}

/**
 * 法律文本视图结构。
 *
 * 与后端 LegalTextView record 逐字段对齐（type/title/content/version/updatedAt）：
 *   - type: 文本类型（user_agreement / privacy_policy）
 *   - title: 文本标题（如"用户协议"）
 *   - content: 正文（纯文本，由调用方决定渲染方式）
 *   - version: 版本号（正式版本形如 v1.0.0；兜底固定 local-fallback）
 *   - updatedAt: 最后更新时间（ISO 8601 字符串；兜底为空串，不由前端自造）
 */
export interface LegalTextView {
  /** 文本类型（user_agreement / privacy_policy） */
  type?: string;
  /** 文本标题 */
  title: string;
  /** 正文内容 */
  content: string;
  /** 版本号 */
  version?: string;
  /** 最后更新时间（ISO 8601） */
  updatedAt?: string;
}

/**
 * 后端 CMS 法律文本响应结构。
 *
 * 与 GET /api/v1/config/legal 响应体一致（LegalTextListResponse = { items: [...] }）。
 */
interface LegalTextsResponse {
  /** 法律文本列表 */
  items: Array<{
    /** 文本类型（与 LegalTextType 对齐） */
    type: string;
    /** 标题 */
    title: string;
    /** 正文 */
    content: string;
    /** 版本号 */
    version?: string;
    /** 最后更新时间 */
    updatedAt?: string;
  }>;
}

/**
 * 兜底版本号（S2-6）。
 *
 * 这个值不只是内部标记：LegalTextPage.vue 的 isLocalFallback 靠它把
 * 「本地兜底文本 · 非正式版本」披露药丸上屏，并据此抹掉版本号与日期。
 * 改名必须与消费点同步。
 */
const LOCAL_FALLBACK_VERSION = "local-fallback";

/**
 * UI 字串的 i18n 键（标题，不是正文）。
 *
 * 正文一律不走 i18n：正式正文来自后端 CMS，兜底正文是下方 OFFLINE_FALLBACK_SUMMARY 常量。
 */
const LEGAL_TITLE_KEYS: Record<LegalTextType, string> = {
  [LegalTextType.USER_AGREEMENT]: "legal.userAgreement.title",
  [LegalTextType.PRIVACY_POLICY]: "legal.privacyPolicy.title",
};

/**
 * 离线兜底摘要（S2-6：客户端不再内嵌法律全文）。
 *
 * 定位：无网络 / 后端不可达 / mock 档构建时，让法律页仍能渲染并仍能返回，
 * 但**不承担正式条款文本**的职责——首行即自我声明「非正式文本、不构成协议内容」，
 * 页面另有披露药丸与"不印日期"兜底态（见 LegalTextPage.vue）。
 * 全文只在后端 legal_document 表里，由 /v1/config/legal 下发。
 * 因此：改条款请改 CMS（后台法务页），不要在这里补全文——那会把刚删掉的第二真相源搬回来。
 */
const OFFLINE_FALLBACK_SUMMARY: Record<LegalTextType, string> = {
  [LegalTextType.USER_AGREEMENT]:
    "【离线兜底摘要 · 非正式文本】\n\n" +
    "当前设备连不到服务端，这里只给出用户协议的要点摘要；它不是已发布的正式条款全文，" +
    "不构成协议内容，也不能作为你的同意依据。正式文本的唯一来源是后台法务发布的版本" +
    "（legal_document 表，经服务端下发）。\n\n" +
    "要点摘要：\n" +
    "1. 资格：须年满 18 周岁，为在校大学生或毕业 3 年内学生，用真实身份注册，" +
    "一个手机号或微信账号只注册一个账号。\n" +
    "2. 行为红线：不得发布违法违规、侵权、淫秽色情、侮辱诽谤、广告营销或含恶意代码的内容；" +
    "不得冒用他人身份、欺诈、骚扰威胁他人、刷量或攻击平台设施。\n" +
    "3. 内容授权：你应对所发布内容拥有权利，并授予平台在本服务内展示、传播的许可。\n" +
    "4. 服务与条款变更：平台可能因业务调整或法规变化变更服务与条款，重大变更会提前公告并再次征得同意。\n" +
    "5. 违约处置：警告、限制功能、暂停服务、永久封禁，直至移交有权机关；你可申诉。\n" +
    "6. 适用法律与争议：适用中国大陆地区法律，协商不成提交有管辖权的人民法院。\n" +
    "7. 联系方式：通过小程序内「反馈中心」提交，客服接待时间每日 09:00-22:00。",
  [LegalTextType.PRIVACY_POLICY]:
    "【离线兜底摘要 · 非正式文本】\n\n" +
    "当前设备连不到服务端，这里只给出隐私政策的要点摘要；它不是已发布的正式政策全文，" +
    "不构成对你权利的最终说明。正式文本的唯一来源是后台法务发布的版本" +
    "（legal_document 表，经服务端下发）。\n\n" +
    "要点摘要：\n" +
    "1. 收集范围：（a）你主动提供的手机号、微信 OpenID、昵称头像、性别年龄、学历、感情状态、" +
    "籍贯、未来城市、简介与兴趣标签、校园认证材料、互动与反馈内容；" +
    "（b）自动收集的设备型号、系统、分辨率、设备标识、网络类型、访问 IP、页面停留与点击行为、崩溃日志；" +
    "（c）第三方返回的 OpenID/UnionID 与地点坐标。\n" +
    "2. 用途：提供并改进服务、安全保障（反作弊、内容审核）、履行法定义务。\n" +
    "3. 共享：不出售你的个人信息，仅在你授权、法律要求、业务转让或第三方 SDK 调用场景下共享。\n" +
    "4. 存储与保护：数据存于中国境内服务器，传输用 HTTPS/TLS 1.2+，敏感字段库内加密，" +
    "RBAC 最小权限；账号存续期间保留，注销后 30 天内清理。\n" +
    "5. 你的权利：访问、复制、更正、删除、撤回授权、注销账号；通过「反馈中心」行使，" +
    "我们将在 15 个工作日内回复。\n" +
    "6. 第三方 SDK：微信开放平台（登录/支付）、高德地图（位置）、Sentry（错误监控，如启用）。\n" +
    "7. 未成年人：本服务面向 18 周岁以上用户，未满 18 周岁无法注册。\n" +
    "8. 政策更新：可能因业务调整或法规变化更新，重大变更将再次征得你的同意。",
};

/**
 * 法律文本 API 端点（相对 apiBaseUrl）。
 *
 * 与 ConfigController 对齐：GET /api/v1/config/legal?type=xxx（permitAll）。
 */
const LEGAL_TEXT_ENDPOINT = "/v1/config/legal";

/**
 * 内存缓存：避免短时间内重复请求后端。
 *
 * 缓存策略：
 *   - 首次请求：发起 HTTP 调用，结果按「当前账号分区」写入 cache
 *   - 5 分钟内、同一账号再次请求：直接返回 cache
 *   - 5 分钟后 / 账号已切换：强制重新拉取
 *
 * 为什么必须按账号分区（S2-6）：本模块是 SPA 级单例，缓存在同一个 JS 上下文里
 * 跨登录态存活。H5/APP 上「A 退出 → B 登录」不重载页面时，若缓存不分分区，
 * B 进入协议页会读到 A 那次取回的正文（可能是已被法务下架的旧版本），
 * 而页面看起来仍是后端正式文本（有版本号、有日期）——即"把上一账号的陈旧文本
 * 当成本账号的正式文本"。分区后账号一变即缓存失效，落到带披露的离线兜底，
 * 绝不静默复用。
 *
 * 缓存 key 为 LegalTextType 字符串，value 为 { data, expiredAt, scope }。
 */
interface CacheEntry {
  /** 法律文本数据 */
  data: LegalTextView;
  /** 过期时间戳（毫秒） */
  expiredAt: number;
  /** 写入时的账号分区标识（见 currentAccountScope） */
  scope: string;
}

const legalTextCache: Map<LegalTextType, CacheEntry> = new Map();

/** 缓存有效期（5 分钟，毫秒） */
const LEGAL_TEXT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * FNV-1a 32 位散列（十六进制字符串）。
 *
 * 只用于把登录态压成一个不透明的分区标识：**不落盘、不外传、不保留原文**，
 * 因此不需要可逆，也不该用 token 原文当 Map key（避免原始凭证在内存里被长期持有）。
 */
function fnv1aHex(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

/**
 * 当前账号的缓存分区标识。
 *
 * 取登录 token 的散列（无 token → "anonymous"，读存储异常 → "unknown"）。
 * 三种取值都是**互不相同**的分区：登出后（token 清空）与换账号（token 变化）
 * 都读不到上一分区写入的文本，宁可多发一次请求也不复用他人会话取回的内容。
 */
function currentAccountScope(): string {
  try {
    const token = uni.getStorageSync(STORAGE_KEYS.AUTH_TOKEN);
    if (typeof token !== "string" || token.length === 0) {
      return "anonymous";
    }
    return `t:${fnv1aHex(token)}`;
  } catch (_error) {
    // 读不到存储（平台差异 / 配额异常）：按独立分区处理，fail-closed 不复用缓存
    return "unknown";
  }
}

/**
 * 丢弃不属于当前账号 / 已过期的缓存条目。
 *
 * 拉取失败时调用：此刻留在 Map 里的只可能是「别的账号写的」或「已过 TTL 的」，
 * 两者都不该在失败分支被当成本账号的正式文本上屏。
 */
function dropStaleEntries(scope: string): void {
  const now = Date.now();
  for (const [type, entry] of legalTextCache.entries()) {
    if (entry.scope !== scope || now >= entry.expiredAt) {
      legalTextCache.delete(type);
    }
  }
}

/**
 * 生成离线兜底文本（明确标注、永不抛错）。
 *
 * @param type - 法律文本类型
 * @returns 兜底视图：version 固定 local-fallback，updatedAt 留空（前端不自造时间戳）
 */
function readOfflineFallbackText(type: LegalTextType): LegalTextView {
  return {
    type,
    title: t(LEGAL_TITLE_KEYS[type]),
    content: OFFLINE_FALLBACK_SUMMARY[type],
    version: LOCAL_FALLBACK_VERSION,
    updatedAt: "",
  };
}

/**
 * 从后端 CMS 拉取法律文本。
 *
 * 请求路径：GET /api/v1/config/legal?type={type}
 * 响应结构：{ items: Array<{ type, title, content, version?, updatedAt? }> }
 *
 * @param type - 法律文本类型
 * @returns 后端返回的法律文本；若后端返回空或不可达，返回 null 由调用方回退
 */
async function fetchLegalTextFromBackend(type: LegalTextType): Promise<LegalTextView | null> {
  try {
    const response = await request<LegalTextsResponse>({
      url: `${LEGAL_TEXT_ENDPOINT}?type=${encodeURIComponent(type)}`,
      method: "GET",
      // 法律文本不携带鉴权头（后端 permitAll），失败也不重试以外的特殊处理沿用默认策略
      noRetry: false,
      timeout: 8000,
    });

    if (!response || !Array.isArray(response.items) || response.items.length === 0) {
      return null;
    }

    // 按 type 字段过滤匹配的文本（不带 type 请求时后端会返回全部已发布文本）
    const matched = response.items.find((item) => item.type === type);
    if (!matched) {
      return null;
    }
    // 正文为空的"成功响应"等同失败：不能把空壳当正式文本缓存并上屏
    if (!matched.content || matched.content.trim().length === 0) {
      return null;
    }

    return {
      type: matched.type ?? type,
      title: matched.title,
      content: matched.content,
      version: matched.version,
      updatedAt: matched.updatedAt,
    };
  } catch (_error) {
    // 后端不可达 / 4xx / 5xx：返回 null，由调用方回退到离线兜底摘要
    // 不向上抛错，避免阻塞 UI 弹窗展示
    return null;
  }
}

/**
 * 获取法律文本（带 5 分钟内存缓存 + 离线兜底摘要）。
 *
 * 调用顺序：
 *   1. 检查内存缓存：命中、未过期、且属于当前账号分区 → 直接返回缓存
 *   2. mock 模式 → 跳过后端，返回离线兜底（避免 mock 模式下无意义请求）
 *   3. 调用后端 CMS：成功 → 按当前账号分区写缓存并返回
 *   4. 失败 → 清理陈旧/跨账号条目，返回带披露标记的离线兜底（不写缓存，下次仍尝试拉取）
 *
 * @param type - 法律文本类型
 * @param forceRefresh - 是否强制刷新（跳过缓存，默认 false）
 * @returns 法律文本视图（永不抛错，最坏情况返回离线兜底摘要）
 */
export async function getLegalText(
  type: LegalTextType,
  forceRefresh: boolean = false,
): Promise<LegalTextView> {
  const scope = currentAccountScope();

  // 1. 检查内存缓存（同账号分区 + 未过期才算命中）
  if (!forceRefresh) {
    const cached = legalTextCache.get(type);
    if (cached && cached.scope === scope && Date.now() < cached.expiredAt) {
      return cached.data;
    }
  }

  // 2. mock 模式：没有后端可问，直接返回带披露的离线兜底
  if (isMockMode()) {
    dropStaleEntries(scope);
    return readOfflineFallbackText(type);
  }

  // 3. 调用后端 CMS
  const backendText = await fetchLegalTextFromBackend(type);
  if (backendText) {
    legalTextCache.set(type, {
      data: backendText,
      expiredAt: Date.now() + LEGAL_TEXT_CACHE_TTL_MS,
      scope,
    });
    return backendText;
  }

  // 4. 后端不可达：只给离线兜底，并顺手清掉跨账号/过期条目（绝不静默复用旧副本）
  dropStaleEntries(scope);
  return readOfflineFallbackText(type);
}

/**
 * 同步获取法律文本（仅返回离线兜底摘要，不发起后端请求）。
 *
 * 使用场景：
 *   - 需要同步展示法律文本标题（如设置页菜单项标题）
 *   - 不阻塞 UI 的初始化场景
 *
 * 如需展示完整法律文本正文，请使用异步的 getLegalText()（本函数返回的是兜底摘要，
 * 带 local-fallback 版本标记，调用方不得把它当正式条款呈现）。
 *
 * @param type - 法律文本类型
 * @returns 离线兜底文本（标题与摘要正文，version 为 local-fallback）
 */
export function getLegalTextSync(type: LegalTextType): LegalTextView {
  return readOfflineFallbackText(type);
}

/**
 * 清除法律文本内存缓存。
 *
 * 使用场景：
 *   - 用户切换语言后，强制下次拉取对应语言的法律文本
 *   - 法务在 CMS 更新条款后，运营手动触发刷新
 *   - 账号切换 / 登出时调用方主动清理（getLegalText 已按账号分区，
 *     漏调用也不会把上一账号的文本当正式文本上屏，这里只是省一次请求）
 */
export function clearLegalTextCache(): void {
  legalTextCache.clear();
}

/**
 * 预加载法律文本（应用启动时调用，提前填充缓存）。
 *
 * 在用户进入设置页 / 注册页之前预拉取，避免首次展示时白屏等待。
 *
 * @param types - 需要预加载的文本类型列表（默认全部）
 */
export async function preloadLegalTexts(
  types: LegalTextType[] = [LegalTextType.USER_AGREEMENT, LegalTextType.PRIVACY_POLICY],
): Promise<void> {
  // 并行拉取，不阻塞主流程
  await Promise.all(types.map((type) => getLegalText(type, true).catch(() => null)));
}
