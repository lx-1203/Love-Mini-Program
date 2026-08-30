/**
 * 法律文本配置（SubTask 3.3.5）
 *
 * 设计目标：
 *   1. 法律文本（用户协议 / 隐私政策）支持从后端 CMS 拉取，运营可在线更新
 *   2. 当后端不可达或处于 mock 模式时，回退到本地 JSON 文本，保证 UI 始终可展示
 *   3. 提供 5 分钟内存缓存 + 强制刷新接口，平衡流量与时效性
 *
 * 与 i18n 的关系：
 *   - 本地 fallback 文本使用 i18n key（legal.userAgreement / legal.privacyPolicy），
 *     支持 zh-CN / en-US 双语
 *   - 后端 CMS 返回的文本优先级高于 i18n fallback，便于法务在 CMS 中维护正式条款
 *
 * 与 services/http.ts 的关系：
 *   - 通过 services/http.ts 的 request<T>() 发起 GET 请求
 *   - 复用统一的鉴权、超时、重试、错误处理拦截器
 *
 * 使用示例：
 *   import { getLegalText, LegalTextType } from "@/config/legal-texts";
 *   const agreement = await getLegalText(LegalTextType.USER_AGREEMENT);
 *   uni.showModal({ title: agreement.title, content: agreement.content });
 */

import { request } from "../services/http";
import { isMockMode } from "./env";
import { t } from "../i18n";

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
 * 与后端 LegalTextView DTO 对齐：
 *   - title: 文本标题（如"用户协议"）
 *   - content: 正文（纯文本或 markdown，由调用方决定渲染方式）
 *   - version: 版本号（如"v1.2.3"，便于法务追溯）
 *   - updatedAt: 最后更新时间（ISO 8601 字符串）
 */
export interface LegalTextView {
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
 * 与 GET /api/v1/config/legal 响应体一致，包含 items 数组与可选的 nextCursor。
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
 * 法律文本本地 fallback 文案 key 映射。
 *
 * 当后端不可达 / mock 模式 / 后端返回空时，
 * 从 i18n locale 文件读取 fallback 文本，保证 UI 始终可展示。
 */
const LEGAL_TEXT_FALLBACK_KEYS: Record<LegalTextType, { title: string; content: string }> = {
  [LegalTextType.USER_AGREEMENT]: {
    title: "legal.userAgreement.title",
    content: "legal.userAgreement.content",
  },
  [LegalTextType.PRIVACY_POLICY]: {
    title: "legal.privacyPolicy.title",
    content: "legal.privacyPolicy.content",
  },
};

/**
 * 法律文本 API 端点（相对 apiBaseUrl）。
 *
 * 与后端 LegalConfigController 对齐：GET /api/v1/config/legal?type=xxx
 */
const LEGAL_TEXT_ENDPOINT = "/v1/config/legal";

/**
 * 内存缓存：避免短时间内重复请求后端。
 *
 * 缓存策略：
 *   - 首次请求：发起 HTTP 调用，结果写入 cache
 *   - 5 分钟内再次请求：直接返回 cache
 *   - 5 分钟后：强制重新拉取
 *
 * 缓存 key 为 LegalTextType 字符串，value 为 { data, expiredAt }。
 */
interface CacheEntry {
  /** 法律文本数据 */
  data: LegalTextView;
  /** 过期时间戳（毫秒） */
  expiredAt: number;
}

const legalTextCache: Map<LegalTextType, CacheEntry> = new Map();

/** 缓存有效期（5 分钟，毫秒） */
const LEGAL_TEXT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 从 i18n locale 文件读取本地 fallback 法律文本。
 *
 * 当后端不可达 / mock 模式 / 后端返回空时调用，
 * 保证 UI 始终可展示（即使是占位文案）。
 *
 * @param type - 法律文本类型
 * @returns 本地 fallback 文本（永不抛错）
 */
function readLocalFallbackText(type: LegalTextType): LegalTextView {
  const keys = LEGAL_TEXT_FALLBACK_KEYS[type];
  return {
    title: t(keys.title),
    content: t(keys.content),
    version: "local-fallback",
    updatedAt: new Date().toISOString(),
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
      // 法律文本不携带鉴权头（公开接口），由后端 LegalConfigController 标记为 permitAll
      noRetry: false,
      timeout: 8000,
    });

    if (!response || !Array.isArray(response.items) || response.items.length === 0) {
      return null;
    }

    // 按 type 字段过滤匹配的文本（后端可能返回多个类型的文本）
    const matched = response.items.find((item) => item.type === type);
    if (!matched) {
      return null;
    }

    return {
      title: matched.title,
      content: matched.content,
      version: matched.version,
      updatedAt: matched.updatedAt,
    };
  } catch (_error) {
    // 后端不可达 / 4xx / 5xx：返回 null，由调用方回退到本地文本
    // 不向上抛错，避免阻塞 UI 弹窗展示
    return null;
  }
}

/**
 * 获取法律文本（带 5 分钟内存缓存 + 本地 fallback）。
 *
 * 调用顺序：
 *   1. 检查内存缓存，命中且未过期 → 直接返回缓存
 *   2. mock 模式 → 跳过后端，使用本地 fallback（避免 mock 模式下无意义请求）
 *   3. 调用后端 CMS：成功 → 写入缓存并返回；失败 → 回退到本地 fallback
 *   4. 本地 fallback 文本不写入缓存，下次请求仍尝试拉取后端
 *
 * @param type - 法律文本类型
 * @param forceRefresh - 是否强制刷新（跳过缓存，默认 false）
 * @returns 法律文本视图（永不抛错，最坏情况返回本地 fallback）
 */
export async function getLegalText(
  type: LegalTextType,
  forceRefresh: boolean = false,
): Promise<LegalTextView> {
  // 1. 检查内存缓存
  if (!forceRefresh) {
    const cached = legalTextCache.get(type);
    if (cached && Date.now() < cached.expiredAt) {
      return cached.data;
    }
  }

  // 2. mock 模式：直接使用本地 fallback，避免无意义请求
  if (isMockMode()) {
    return readLocalFallbackText(type);
  }

  // 3. 调用后端 CMS
  const backendText = await fetchLegalTextFromBackend(type);
  if (backendText) {
    // 写入缓存
    legalTextCache.set(type, {
      data: backendText,
      expiredAt: Date.now() + LEGAL_TEXT_CACHE_TTL_MS,
    });
    return backendText;
  }

  // 4. 后端不可达：回退到本地文本（不写入缓存，下次仍尝试拉取）
  return readLocalFallbackText(type);
}

/**
 * 同步获取法律文本（仅返回本地 fallback，不发起后端请求）。
 *
 * 使用场景：
 *   - 需要同步展示法律文本标题（如设置页菜单项标题）
 *   - 不阻塞 UI 的初始化场景
 *
 * 如需展示完整法律文本正文，请使用异步的 getLegalText()。
 *
 * @param type - 法律文本类型
 * @returns 本地 fallback 文本（仅标题与正文，version 为 local-fallback）
 */
export function getLegalTextSync(type: LegalTextType): LegalTextView {
  return readLocalFallbackText(type);
}

/**
 * 清除法律文本内存缓存。
 *
 * 使用场景：
 *   - 用户切换语言后，强制下次拉取对应语言的法律文本
 *   - 法务在 CMS 更新条款后，运营手动触发刷新
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
