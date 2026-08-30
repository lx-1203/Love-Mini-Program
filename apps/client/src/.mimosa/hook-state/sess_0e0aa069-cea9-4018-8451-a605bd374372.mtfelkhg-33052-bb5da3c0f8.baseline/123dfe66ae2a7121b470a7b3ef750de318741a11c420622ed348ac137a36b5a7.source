/**
 * 社交升温进度 Store
 *
 * 管理用户的社交漏斗进度状态，展示从"发现心动"到"线下见面"的6层升温路径。
 * 支持 Mock 模式（本地硬编码数据）和 Real 模式（调用后端 API）。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { clientApi } from '../services/api'
import { useMock } from './helpers/use-mock'
import { IMAGE_PATHS } from '../config/images'
// 2026-08-10 切换提速：社交进度 60s TTL 缓存
import { isCacheFresh, setCachedValue } from '../utils/cache-ttl'

/** 社交升温进度新鲜度窗口 */
const PROGRESS_TTL_MS = 60_000

/** 6 层升温路径图标（统一从 config/images.ts 引入，避免硬编码路径） */
const TIER_ICONS = {
  L1_EXPOSURE: IMAGE_PATHS.ICONS_SOCIAL.VISITOR,
  L2_ATTENTION: IMAGE_PATHS.ICONS_SOCIAL.LIKE,
  L3_MATCH: IMAGE_PATHS.ICONS_SOCIAL.MATCH,
  L4_COMMUNICATION: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
  L5_CIRCLE: IMAGE_PATHS.ICONS_SOCIAL.SUPER_LIKE,
  L6_SCENE: IMAGE_PATHS.ICONS_SOCIAL.FOLLOW,
} as const

// ==================== 类型定义 ====================

/** 社交升温进度数据 */
export interface SocialProgressData {
  /** 当前所处层级标识 */
  currentTier: string
  /** 当前层级名称 */
  tierLabel: string
  /** 曝光次数（浏览推荐卡片数） */
  exposureCount: number
  /** 喜欢次数 */
  likeCount: number
  /** 匹配次数 */
  matchCount: number
  /** 聊天次数 */
  chatCount: number
  /** 参与圈子次数 */
  circleCount: number
  /** 参与活动次数 */
  activityCount: number
  /** 下一步行动建议 */
  nextAction: string
  /** 进度百分比 (0-100) */
  progressPercentage: number
}

/** 层级描述信息 */
export interface TierInfo {
  label: string
  icon: string
  desc: string
  /** R4-batch2: 层级 label 的 i18n key（socialProgress.tierL{1..6}Label，zh/en 同步） */
  labelKey: string
  /** R4-batch2: 层级 desc 的 i18n key（socialProgress.tierL{1..6}Desc，zh/en 同步） */
  descKey: string
}

// ==================== 层级数据常量 ====================

/**
 * 6层升温路径的静态描述数据。
 *
 * R4-batch2：label/desc 的中文值保留为数据兜底（兼容既有测试与纯数据消费），
 * 展示层统一经 labelKey/descKey 走 t() 渲染（socialProgress.* 键集，zh/en 同步）。
 */
export const TIER_META: Record<string, TierInfo> = {
  L1_EXPOSURE: { label: '发现心动', icon: TIER_ICONS.L1_EXPOSURE, desc: '浏览推荐卡片', labelKey: 'socialProgress.tierL1Label', descKey: 'socialProgress.tierL1Desc' },
  L2_ATTENTION: { label: '表达喜欢', icon: TIER_ICONS.L2_ATTENTION, desc: '向心仪的人表达喜欢', labelKey: 'socialProgress.tierL2Label', descKey: 'socialProgress.tierL2Desc' },
  L3_MATCH: { label: '双向匹配', icon: TIER_ICONS.L3_MATCH, desc: '等待双向确认', labelKey: 'socialProgress.tierL3Label', descKey: 'socialProgress.tierL3Desc' },
  L4_COMMUNICATION: { label: '开启对话', icon: TIER_ICONS.L4_COMMUNICATION, desc: '发起私信聊天', labelKey: 'socialProgress.tierL4Label', descKey: 'socialProgress.tierL4Desc' },
  L5_CIRCLE: { label: '参与社区', icon: TIER_ICONS.L5_CIRCLE, desc: '加入兴趣圈和话题', labelKey: 'socialProgress.tierL5Label', descKey: 'socialProgress.tierL5Desc' },
  L6_SCENE: { label: '线下见面', icon: TIER_ICONS.L6_SCENE, desc: '参与线下活动', labelKey: 'socialProgress.tierL6Label', descKey: 'socialProgress.tierL6Desc' },
}

/** 层级有序列表（用于步骤指示器渲染） */
export const TIER_ORDER: string[] = [
  'L1_EXPOSURE',
  'L2_ATTENTION',
  'L3_MATCH',
  'L4_COMMUNICATION',
  'L5_CIRCLE',
  'L6_SCENE',
]

// ==================== Mock 数据 ====================

/** Mock 社交升温进度数据 */
const MOCK_PROGRESS: SocialProgressData = {
  currentTier: 'L1_EXPOSURE',
  tierLabel: '发现心动',
  exposureCount: 0,
  likeCount: 0,
  matchCount: 0,
  chatCount: 0,
  circleCount: 0,
  activityCount: 0,
  nextAction: '去寻觅，发现心动的人',
  progressPercentage: 0,
}

// ==================== 工具函数 ====================

/** 深拷贝函数 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ==================== Store ====================

/**
 * 社交升温进度 Store
 *
 * 使用 Composition API 风格，管理用户的社交漏斗进度数据。
 * 提供 fetchProgress 方法获取最新进度，支持 Mock/Real 双模式。
 */
export const useSocialProgressStore = defineStore('socialProgress', () => {
  // ---- 状态 ----
  const progress = ref<SocialProgressData | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  // 6层升温路径的静态描述数据（reactive 以便模板响应式访问）
  const tierNames = TIER_META

  // ---- 计算属性 ----

  /** 当前层级在有序列表中的索引 */
  const currentTierIndex = computed(() => {
    if (!progress.value) return -1
    return TIER_ORDER.indexOf(progress.value.currentTier)
  })

  /** 当前进度百分比 */
  const progressPercentage = computed(() => {
    return progress.value?.progressPercentage ?? 0
  })

  /** 下一步行动建议 */
  const nextAction = computed(() => {
    return progress.value?.nextAction ?? ''
  })

  /** 是否已到达最高层级 */
  const isMaxLevel = computed(() => {
    return currentTierIndex.value === TIER_ORDER.length - 1
  })

  // ---- 操作方法 ----

  /**
   * 获取社交升温进度数据。
   * Mock 模式下返回本地硬编码数据，Real 模式下调用后端 API。
   */
  async function fetchProgress() {
    // 2026-08-10 切换提速：60s 内已加载且有数据时直接跳过
    if (!useMock() && progress.value && isCacheFresh('social-progress:load', PROGRESS_TTL_MS)) {
      return
    }
    loading.value = true
    errorMessage.value = null

    try {
      if (useMock()) {
        progress.value = clone(MOCK_PROGRESS)
        return
      }

      const result = await clientApi.getSocialProgress()
      // 2026-08-10 切换提速：拉取成功后刷新缓存时间戳
      setCachedValue('social-progress:load', true)
      // 如果后端返回了数据，进行类型安全的赋值。
      // 后端返回的内联类型与 SocialProgressData 结构等价，
      // 此前使用 `as unknown as SocialProgressData` 双重断言过度宽松，
      // 现在直接赋值依赖 TS 结构兼容校验，确保类型一致。
      if (result) {
        progress.value = result
      }
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '加载社交升温进度失败'
      // 保持现有数据不丢失
      progress.value = progress.value ?? null
    } finally {
      loading.value = false
    }
  }

  // ---- 导出 ----
  return {
    // 状态
    progress,
    loading,
    errorMessage,
    // 静态配置
    tierNames,
    // 计算属性
    currentTierIndex,
    progressPercentage,
    nextAction,
    isMaxLevel,
    // 操作
    fetchProgress,
  }
})