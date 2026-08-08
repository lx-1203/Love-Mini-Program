import { defineStore } from "pinia";
import { ref } from "vue";
import { request } from "../services/http";
import { useSessionStore } from "./session";
import { useMock } from "./helpers/use-mock";

/**
 * R4-00992: mock 视频通话记录时长常量（9 分钟示例通话）——
 * duration 字段单位秒，endTime 偏移计算用毫秒，双单位由常量注释明确。
 */
const MOCK_CALL_DURATION_SECONDS = 540;
const MOCK_CALL_DURATION_MS = MOCK_CALL_DURATION_SECONDS * 1000;
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

/**
 * 视频通话 Store
 *
 * 提供视频通话的状态管理与 API 调用封装：
 * - startCall：发起视频通话，创建房间号
 * - endCall：结束通话，记录通话时长与结束原因
 * - syncFromRoute：从页面参数同步房间状态（用于被叫方进入）
 *
 * 错误处理：所有 API 调用失败时抛出 EnhancedApiError，
 * 由调用方（页面层）通过 try/catch 捕获并 toast 提示。
 *
 * mp-weixin 兼容：使用 uni.request 封装，不依赖 import.meta。
 */

/** 通话状态：RINGING 振铃 / ONGOING 通话中 / ENDED 已结束 / MISSED 未接 / REJECTED 已拒绝 */
export type VideoCallStatus =
  | "RINGING"
  | "ONGOING"
  | "ENDED"
  | "MISSED"
  | "REJECTED";

/** 结束原因：HANGUP 主动挂断 / REJECTED 拒绝 / TIMEOUT 超时 / ERROR 异常 */
export type VideoCallEndReason = "HANGUP" | "REJECTED" | "TIMEOUT" | "ERROR";

/** 视频通话视图（后端 VideoCallView 对应） */
export interface VideoCallView {
  id: number;
  roomId: string;
  callerId: number;
  calleeId: number;
  status: VideoCallStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSec?: number | null;
  endReason?: VideoCallEndReason | null;
}

/**
 * 视频通话历史记录状态：
 * - INITIATING 发起中
 * - CONNECTED 已接通
 * - MISSED 未接听
 * - REJECTED 已拒绝
 * - FAILED 网络异常
 */
export type VideoCallRecordStatus =
  | "INITIATING"
  | "CONNECTED"
  | "MISSED"
  | "REJECTED"
  | "FAILED";

/**
 * 视频通话历史记录视图（后端 VideoCallRecordView 对应）
 *
 * 与 VideoCallView 的区别：
 * - VideoCallView 用于实时通话状态展示（RINGING/ONGOING/ENDED）
 * - VideoCallRecordView 用于通话历史列表展示（INITIATING/CONNECTED/MISSED/REJECTED/FAILED）
 */
export interface VideoCallRecordView {
  id: number;
  roomId: string;
  callerId: number;
  receiverId: number;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  status: VideoCallRecordStatus;
  createdAt?: string | null;
}

/** 发起通话请求体 */
export interface StartCallPayload {
  /** 被叫用户 ID */
  calleeId: number;
}

/** 发起通话响应（含房间号与房间临时 token） */
export interface StartCallResult {
  call: VideoCallView;
  /** 房间临时 token，用于客户端加入音视频房间 */
  roomToken: string;
  /** 信令服务器地址（如 wss://...） */
  signalingUrl?: string;
}

/** 结束通话请求体 */
export interface EndCallPayload {
  /** 通话房间 ID（后端 EndCallRequest.roomId） */
  roomId: string;
  /** 结束原因（客户端语义：HANGUP / REJECTED / TIMEOUT / ERROR） */
  endReason: VideoCallEndReason;
  /** 实际通话时长（秒，仅在 ONGOING -> ENDED 时填充） */
  durationSec?: number;
}

/**
 * 将客户端结束原因映射为后端 EndCallRequest.endReason 枚举值。
 *
 * 修复（P0-09）：后端仅接受 CALLER_HANGUP / CALLEE_HANGUP / TIMEOUT / NETWORK_ERROR，
 * 客户端原 HANGUP / REJECTED / ERROR 枚举不在白名单内（400）。
 * - HANGUP：发起方挂断 → CALLER_HANGUP；被叫方挂断 → CALLEE_HANGUP
 * - REJECTED：被叫方拒接 → CALLEE_HANGUP
 * - TIMEOUT：超时未接听，保持 TIMEOUT
 * - ERROR：网络/异常中断 → NETWORK_ERROR
 *
 * @param reason 客户端结束原因
 * @param isCaller 当前用户是否为发起方（HANGUP 分支区分 CALLER/CALLEE 用）
 */
function mapEndReason(reason: VideoCallEndReason, isCaller: boolean): string {
  switch (reason) {
    case "HANGUP":
      return isCaller ? "CALLER_HANGUP" : "CALLEE_HANGUP";
    case "REJECTED":
      return "CALLEE_HANGUP";
    case "TIMEOUT":
      return "TIMEOUT";
    case "ERROR":
      return "NETWORK_ERROR";
  }
}

/**
 * 生成 mock 房间号（8 位字母数字）
 * infra R2-00098: 仅 mock 分支使用，real 信令房间号由后端/信令服务下发，
 * 联调时以真实信令 URL 与房间号为准（见 MEDIUM 128 审计项）
 */
function generateMockRoomId(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export const useVideoCallStore = defineStore("video-call", () => {
  /** 当前进行中的通话 */
  const currentCall = ref<VideoCallView | null>(null);

  /** 房间临时 token */
  const roomToken = ref<string>("");

  /** 信令服务器地址 */
  const signalingUrl = ref<string>("");

  /** 发起中标志（防重复提交） */
  const starting = ref(false);

  /** 结束中标志 */
  const ending = ref(false);

  /** 本地记录的通话开始时间戳（ms），用于前端实时计算时长 */
  const localStartedAt = ref<number | null>(null);

  /** 通话历史记录列表（按开始时间倒序） */
  const records = ref<VideoCallRecordView[]>([]);

  /** 通话记录加载中标志 */
  const loadingRecords = ref(false);

  /**
   * 发起视频通话
   *
   * @param payload 请求体
   * @returns 发起结果（含房间号与 token）
   *
   * R4-00142：移除魔法数字 callerId=1 默认参数——mock 分支发起方身份改从
   * session store 实时解析，与真实 userId 体系一致（页面调用无需传参）。
   */
  async function startCall(payload: StartCallPayload): Promise<StartCallResult> {
    if (!payload.calleeId || payload.calleeId <= 0) {
      throw new Error(t("storeErrors.videoCall.calleeIdInvalid"));
    }
    if (starting.value) {
      throw new Error(t("storeErrors.videoCall.callingInProgress"));
    }

    if (useMock()) {
      // mock 模式：生成虚拟房间号与 token
      // R4-00142：发起方 ID 从 session 解析（真实 userId），不再默认 1
      const sessionStore = useSessionStore();
      const currentUserId = sessionStore.userSession?.userId ?? "";
      const mockCallerId = Number(currentUserId) || 0;
      const mockCall: VideoCallView = {
        id: Math.floor(Math.random() * 100000) + 1,
        roomId: generateMockRoomId(),
        callerId: mockCallerId,
        calleeId: payload.calleeId,
        status: "RINGING",
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationSec: null,
        endReason: null,
      };
      const mockResult: StartCallResult = {
        call: mockCall,
        roomToken: `mock_token_${mockCall.roomId}_${Date.now()}`,
        // R4-00143：mock 不建立真实信令连接，置空信令地址（原 "wss://mock.example.com/signaling"
        // 指向不存在的域名，易误导联调）；真实模式由后端 /chat/video-call/start 返回
        signalingUrl: "",
      };
      currentCall.value = mockCall;
      roomToken.value = mockResult.roomToken;
      signalingUrl.value = mockResult.signalingUrl ?? "";
      localStartedAt.value = Date.now();
      starting.value = false;
      return mockResult;
    }

    starting.value = true;
    try {
      const result = await request<StartCallResult, StartCallPayload>({
        url: "/chat/video-call/start",
        method: "POST",
        data: payload,
      });
      currentCall.value = result.call;
      roomToken.value = result.roomToken;
      signalingUrl.value = result.signalingUrl ?? "";
      localStartedAt.value = Date.now();
      return result;
    } finally {
      starting.value = false;
    }
  }

  /**
   * 结束视频通话
   *
   * @param payload 请求体
   * @returns 更新后的通话视图
   */
  async function endCall(payload: EndCallPayload): Promise<VideoCallView> {
    if (!payload.roomId || payload.roomId.trim().length === 0) {
      throw new Error(t("storeErrors.videoCall.callIdInvalid"));
    }
    if (ending.value) {
      throw new Error(t("storeErrors.videoCall.endingInProgress"));
    }

    if (useMock()) {
      const mockCall: VideoCallView = {
        ...(currentCall.value as VideoCallView),
        status: "ENDED",
        endedAt: new Date().toISOString(),
        durationSec: payload.durationSec ?? 0,
        endReason: payload.endReason,
      };
      currentCall.value = mockCall;
      ending.value = false;
      return mockCall;
    }

    ending.value = true;
    try {
      // 修复（P0-09）：请求体对齐后端 EndCallRequest{ roomId, endReason }，
      // 不再发送 callId/durationSec；endReason 映射为后端枚举
      const sessionStore = useSessionStore();
      const currentUserId = sessionStore.userSession?.userId ?? "";
      const isCaller =
        currentCall.value?.callerId != null &&
        String(currentCall.value.callerId) === currentUserId;
      const result = await request<VideoCallView, { roomId: string; endReason: string }>({
        url: "/chat/video-call/end",
        method: "POST",
        data: {
          roomId: payload.roomId,
          endReason: mapEndReason(payload.endReason, isCaller),
        },
      });
      currentCall.value = result;
      return result;
    } finally {
      ending.value = false;
    }
  }

  /**
   * 从页面参数同步房间状态（被叫方进入页面时使用）
   *
   * @param roomId 房间号
   * @param callerId 发起方用户 ID
   * @param calleeId 被叫用户 ID
   */
  function syncFromRoute(roomId: string, callerId: number, calleeId: number) {
    if (!roomId) return;
    currentCall.value = {
      id: 0,
      roomId,
      callerId,
      calleeId,
      status: "RINGING",
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationSec: null,
      endReason: null,
    };
    localStartedAt.value = Date.now();
  }

  /**
   * 查询当前用户的通话历史记录
   *
   * 调用 GET /api/chat/video-call/records 获取当前用户作为发起方或接收方
   * 参与的所有通话记录，按开始时间倒序排列，用于前端"通话记录"列表展示。
   *
   * 错误处理：API 调用失败时抛出 EnhancedApiError，
   * 由调用方（页面层）通过 try/catch 捕获并 toast 提示。
   *
   * @returns 通话记录列表（按开始时间倒序）
   */
  async function getRecords(): Promise<VideoCallRecordView[]> {
    if (loadingRecords.value) {
      // 防止重复加载
      return records.value;
    }

    if (useMock()) {
      // mock 模式：生成 3 条假数据，覆盖不同状态
      const now = Date.now();
      const mockRecords: VideoCallRecordView[] = [
        {
          id: 1,
          roomId: generateMockRoomId(),
          callerId: 1,
          receiverId: 2,
          startTime: new Date(now - 60 * 60 * 1000).toISOString(),
          endTime: new Date(now - 60 * 60 * 1000 + MOCK_CALL_DURATION_MS).toISOString(),
          duration: MOCK_CALL_DURATION_SECONDS,
          status: "CONNECTED",
          createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          roomId: generateMockRoomId(),
          callerId: 3,
          receiverId: 1,
          startTime: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(now - 3 * 60 * 60 * 1000 + 30 * 1000).toISOString(),
          duration: 0,
          status: "MISSED",
          createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          roomId: generateMockRoomId(),
          callerId: 1,
          receiverId: 4,
          startTime: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(now - 24 * 60 * 60 * 1000 + 12 * 1000).toISOString(),
          duration: 0,
          status: "REJECTED",
          createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      records.value = mockRecords;
      loadingRecords.value = false;
      return mockRecords;
    }

    loadingRecords.value = true;
    try {
      const result = await request<VideoCallRecordView[], unknown>({
        url: "/chat/video-call/records",
        method: "GET",
      });
      records.value = result;
      return result;
    } finally {
      loadingRecords.value = false;
    }
  }

  /** 重置状态 */
  function reset() {
    currentCall.value = null;
    roomToken.value = "";
    signalingUrl.value = "";
    starting.value = false;
    ending.value = false;
    localStartedAt.value = null;
    records.value = [];
    loadingRecords.value = false;
  }

  return {
    currentCall,
    roomToken,
    signalingUrl,
    starting,
    ending,
    localStartedAt,
    records,
    loadingRecords,
    startCall,
    endCall,
    getRecords,
    syncFromRoute,
    reset,
  };
});
