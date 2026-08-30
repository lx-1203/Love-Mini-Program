/**
 * useImageFallback — 列表页图片 @error 占位图通用方案
 *
 * <p>SubTask 5.5.2：列表页大量使用原生 {@code <image>} 标签展示用户头像/封面图，
 * 当图片 URL 失效或网络异常时，原生 {@code <image>} 会保留空白或显示 broken icon，
 * 影响视觉与用户体验。</p>
 *
 * <p>本 composable 提供统一的失败 key 集合与判断函数：</p>
 * <ul>
 *   <li>{@code failedImageKeys}：响应式 Set，记录已触发 @error 的图片唯一 key</li>
 *   <li>{@code onImageError(key)}：@error 回调，将 key 加入集合（仅记录一次）</li>
 *   <li>{@code isImageFailed(key)}：判断 key 是否已失败，模板通过 v-if 切换占位元素</li>
 * </ul>
 *
 * <p>使用示例（list 页面）：</p>
 * <pre>
 * const { failedImageKeys, onImageError, isImageFailed } = useImageFallback();
 *
 * // 模板：
 * // <image
 * //   v-if="item.avatar && !isImageFailed(`avatar-${item.id}`)"
 * //   :src="resolveMediaUrl(item.avatar)"
 * //   @error="onImageError(`avatar-${item.id}`)"
 * // />
 * // <text v-else class="avatar-placeholder">{{ item.name[0] }}</text>
 * </pre>
 *
 * <p>mp-weixin 兼容性：</p>
 * <ul>
 *   <li>不使用 import.meta.env</li>
 *   <li>不使用 optional catch binding</li>
 *   <li>纯 ref/Set 状态，无 DOM API 依赖</li>
 * </ul>
 */
import { ref } from "vue";

/**
 * 图片 @error 失败 key 集合类型（响应式 Set）。
 *
 * <p>使用 ref 包裹 Set 而非 reactive(Set)，避免 Pinia/Vue 对 Set 的代理兼容性问题；
 * 通过重新赋值新 Set 触发模板重渲染。</p>
 */
export type FailedImageKeySet = ReturnType<typeof ref<Set<string>>>;

/**
 * 提供列表页图片 @error 占位切换能力。
 *
 * @returns {FailedImageKeySet} failedImageKeys - 失败 key 集合（响应式）
 * @returns {(key: string) => void} onImageError - @error 回调
 * @returns {(key: string) => boolean} isImageFailed - 失败判断函数
 */
export function useImageFallback(): {
  failedImageKeys: FailedImageKeySet;
  onImageError: (key: string) => void;
  isImageFailed: (key: string) => boolean;
} {
  /** 已触发 @error 的图片 key 集合 */
  const failedImageKeys = ref<Set<string>>(new Set());

  /**
   * @error 回调：将失败图片的 key 加入集合，触发模板 v-if 切换为占位元素。
   *
   * <p>同一 key 仅记录一次，避免重复触发造成不必要的重渲染。</p>
   *
   * @param key 图片唯一标识（建议命名：{用途}-{id}，如 avatar-123）
   */
  function onImageError(key: string): void {
    if (!key) return;
    if (failedImageKeys.value.has(key)) return;
    // 通过创建新 Set 触发响应式更新（直接 add 不一定触发模板重渲染）
    failedImageKeys.value = new Set(failedImageKeys.value).add(key);
  }

  /**
   * 判断指定 key 的图片是否已失败，用于模板 v-if 切换占位元素。
   *
   * @param key 图片唯一标识
   * @returns true 表示已失败，模板应渲染占位元素
   */
  function isImageFailed(key: string): boolean {
    return failedImageKeys.value.has(key);
  }

  return { failedImageKeys, onImageError, isImageFailed };
}
