/**
 * 音频录制工具（mp-weixin / H5 兼容）
 *
 * 封装 uni.getRecorderManager，提供统一的录音开始/停止/取消与事件订阅能力。
 *
 * 设计目的：
 * 1. 屏蔽 mp-weixin 与 H5 平台差异，页面层无需关心平台判断
 * 2. 集中处理录音权限申请与错误提示，避免每个页面重复实现
 * 3. 提供事件订阅 API（onStart/onStop/onError/onCancel），便于 UI 组件解耦
 *
 * mp-weixin 兼容：
 * - 使用 uni.getRecorderManager() 获取录音管理器
 * - 录音格式 mp3，最长 60 秒（与后端 VoiceMessageService 限制一致）
 * - 通过 uni.authorize 申请 scope.record 权限
 * - 不使用 import.meta，所有状态保存在闭包中
 *
 * 错误处理：
 * - 权限被拒绝：触发 onError 回调，提示用户开启麦克风权限
 * - 录音失败：触发 onError 回调，提示用户重试
 * - 录音过短（<1 秒）：触发 onCancel 回调，提示用户说话时间太短
 */

// 统一常量：录音默认配置与最短时长阈值
import {
  RECORDER_DEFAULT_FORMAT,
  RECORDER_MAX_DURATION_MS,
  RECORDER_SAMPLE_RATE,
  RECORDER_ENCODE_BIT_RATE,
  RECORDER_MIN_DURATION_SECONDS,
} from "../constants/ui";

/** 录音配置选项 */
export interface RecorderOptions {
  /** 录音格式：mp3 / aac / wav（mp-weixin 默认 mp3） */
  format?: "mp3" | "aac" | "wav";
  /** 录音最长时长（毫秒），默认 60000（60 秒） */
  duration?: number;
  /** 采样率（Hz），默认 8000 */
  sampleRate?: number;
  /** 编码码率（kbps），默认 64 */
  encodeBitRate?: number;
}

/** 录音停止回调返回的文件信息 */
export interface RecorderStopResult {
  /** 录音文件临时路径（mp-weixin 为 wxfile:// 协议） */
  tempFilePath: string;
  /** 录音时长（秒），由工具内部计时计算 */
  durationSeconds: number;
  /** 文件大小（字节），可能为 0（部分平台不返回） */
  fileSize: number;
}

/** 录音状态枚举 */
export type RecorderState = "idle" | "recording" | "stopping" | "error";

/** 录音事件回调类型 */
export type RecorderStartCallback = () => void;
export type RecorderStopCallback = (result: RecorderStopResult) => void;
export type RecorderErrorCallback = (error: Error) => void;
export type RecorderCancelCallback = () => void;

/** 默认录音配置：mp3 / 60 秒 / 8kHz / 64kbps（值由 constants/ui 统一提供） */
const DEFAULT_OPTIONS: Required<RecorderOptions> = {
  format: RECORDER_DEFAULT_FORMAT,
  duration: RECORDER_MAX_DURATION_MS,
  sampleRate: RECORDER_SAMPLE_RATE,
  encodeBitRate: RECORDER_ENCODE_BIT_RATE,
};

/** 最小有效录音时长（秒）：低于此值视为取消（复用 constants/ui 常量） */
const MIN_DURATION_SECONDS = RECORDER_MIN_DURATION_SECONDS;

/**
 * 录音停止回调返回的文件信息（uni-app 回调实际形态的最小契约）
 *
 * uni-app 官方类型 RecorderManager.onStop 签名为 `(result: any) => void`，
 * 此处仅声明实际消费的字段，便于类型安全与静态检查。
 */
interface RecorderStopCallbackResult {
  tempFilePath?: string;
  fileSize?: number;
}

/**
 * 录音错误回调参数（兼容字符串与对象两种形态）
 *
 * uni-app 错误回调可能返回字符串或 { errMsg / message } 形式的对象。
 */
type RecorderErrorCallbackResult =
  | string
  | { errMsg?: string; message?: string }
  | undefined;

/**
 * 创建一个录音器实例（每次调用返回独立实例，互不干扰）
 *
 * 使用闭包保存状态，避免全局变量污染。
 *
 * @returns 录音器实例，包含 start / stop / cancel / onStart / onStop / onError / onCancel 方法
 */
export function createRecorder() {
  /** 当前录音状态 */
  let state: RecorderState = "idle";

  /** 录音开始时间戳（ms），用于计算录音时长 */
  let startTimestamp = 0;

  /** mp-weixin 录音管理器（仅 mp-weixin 平台可用） */
  let recorderManager: ReturnType<typeof uni.getRecorderManager> | null = null;

  /** 事件回调集合 */
  const callbacks: {
    start: RecorderStartCallback[];
    stop: RecorderStopCallback[];
    error: RecorderErrorCallback[];
    cancel: RecorderCancelCallback[];
  } = {
    start: [],
    stop: [],
    error: [],
    cancel: [],
  };

  /** 监听器是否已注册（避免重复注册） */
  let listenersRegistered = false;

  /**
   * 取消中标志（修复 P1 BUG：cancel 双回调）。
   * cancel() 内部调用 recorderManager.stop() 会触发系统 onStop 事件，
   * 导致 onStop 回调与 onCancel 回调都被触发。置位后 onStop 处理器
   * 直接消费该标志并返回，不再触发任何回调（cancel 回调已由 cancel() 触发）。
   */
  let cancelling = false;

  /**
   * 注册 mp-weixin 录音管理器事件监听器（仅注册一次）
   */
  function registerListeners(): void {
    if (listenersRegistered || !recorderManager) return;
    listenersRegistered = true;

    // 录音开始事件
    recorderManager.onStart(() => {
      startTimestamp = Date.now();
      state = "recording";
      callbacks.start.forEach((cb) => {
        try {
          cb();
        } catch (_e) {
          // 静默处理回调异常，避免影响其他回调
        }
      });
    });

    // 录音停止事件
    recorderManager.onStop((res: RecorderStopCallbackResult) => {
      // 修复（P1 BUG）：cancel() 触发的 stop 事件不再重复触发回调——
      // cancel() 已置位 cancelling 并直接触发 cancel 回调，此处消费标志后返回
      if (cancelling) {
        cancelling = false;
        state = "idle";
        return;
      }
      const durationSeconds = Math.max(
        0,
        Math.round((Date.now() - startTimestamp) / 1000)
      );
      state = "idle";

      // 录音时长过短：触发取消回调
      if (durationSeconds < MIN_DURATION_SECONDS) {
        callbacks.cancel.forEach((cb) => {
          try {
            cb();
          } catch (_e) {
            // 静默处理
          }
        });
        return;
      }

      const result: RecorderStopResult = {
        tempFilePath: res?.tempFilePath ?? "",
        durationSeconds,
        fileSize: res?.fileSize ?? 0,
      };
      callbacks.stop.forEach((cb) => {
        try {
          cb(result);
        } catch (_e) {
          // 静默处理
        }
      });
    });

    // 录音错误事件
    recorderManager.onError((err: RecorderErrorCallbackResult) => {
      state = "error";
      const error = new Error(
        typeof err === "string"
          ? err
          : (err && (err.errMsg || err.message)) || "录音失败，请重试"
      );
      callbacks.error.forEach((cb) => {
        try {
          cb(error);
        } catch (_e) {
          // 静默处理
        }
      });
      // 错误后重置状态
      state = "idle";
    });
  }

  /**
   * 申请 mp-weixin 录音权限
   *
   * mp-weixin 在用户首次调用录音时会弹出授权框，本方法用于主动触发授权流程，
   * 避免在录音开始时才发现权限缺失。
   *
   * @returns Promise<boolean> 是否已授权
   */
  function ensurePermission(): Promise<boolean> {
    return new Promise((resolve) => {
      // #ifdef MP-WEIXIN
      try {
        uni.getSetting({
          success(res: UniApp.GetSettingSuccessResult) {
            const hasPermission = res?.authSetting?.["scope.record"];
            if (hasPermission) {
              resolve(true);
              return;
            }
            // 未授权时主动申请
            uni.authorize({
              scope: "scope.record",
              success() {
                resolve(true);
              },
              fail() {
                resolve(false);
              },
            });
          },
          fail() {
            resolve(false);
          },
        });
      } catch (_e) {
        // uni.getSetting 调用失败时降级为直接尝试录音
        resolve(true);
      }
      // #endif
      // #ifndef MP-WEIXIN
      // 非 mp-weixin 平台默认有权限（H5 通过 getUserMedia 申请）
      resolve(true);
      // #endif
    });
  }

  /**
   * 开始录音
   *
   * 流程：
   * 1. 校验当前状态（idle 才能开始）
   * 2. 申请录音权限（mp-weixin）
   * 3. 调用 recorderManager.start
   * 4. 触发 onStart 回调（mp-weixin 由系统触发，H5 由本方法直接触发）
   *
   * @param options 录音配置（可选，使用默认值）
   * @returns Promise<boolean> 是否成功开始
   */
  async function start(options?: RecorderOptions): Promise<boolean> {
    if (state !== "idle") {
      // 已在录音中，拒绝重复开始
      return false;
    }
    // 清除可能残留的取消标志（防御性处理，正常路径下 cancel 后应为 false）
    cancelling = false;

    const mergedOptions: Required<RecorderOptions> = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // 申请权限
    const hasPermission = await ensurePermission();
    if (!hasPermission) {
      const error = new Error("麦克风权限被拒绝，请在设置中开启");
      callbacks.error.forEach((cb) => {
        try {
          cb(error);
        } catch (_e) {
          // 静默处理
        }
      });
      return false;
    }

    // #ifdef MP-WEIXIN
    try {
      if (!recorderManager) {
        recorderManager = uni.getRecorderManager();
        registerListeners();
      }
      recorderManager.start({
        format: mergedOptions.format,
        duration: mergedOptions.duration,
        sampleRate: mergedOptions.sampleRate,
        encodeBitRate: mergedOptions.encodeBitRate,
      });
      return true;
    } catch (e) {
      const error = new Error(
        e instanceof Error ? e.message : "录音启动失败"
      );
      callbacks.error.forEach((cb) => {
        try {
          cb(error);
        } catch (_e) {
          // 静默处理
        }
      });
      return false;
    }
    // #endif

    // #ifndef MP-WEIXIN
    // H5 / 其他平台：模拟录音流程
    startTimestamp = Date.now();
    state = "recording";
    callbacks.start.forEach((cb) => {
      try {
        cb();
      } catch (_e) {
        // 静默处理
      }
    });
    return true;
    // #endif
  }

  /**
   * 停止录音并触发 onStop 回调
   *
   * mp-weixin 由系统触发 onStop；H5 由本方法直接触发。
   */
  function stop(): void {
    if (state !== "recording") return;
    state = "stopping";

    // #ifdef MP-WEIXIN
    try {
      recorderManager?.stop();
    } catch (e) {
      state = "idle";
      const error = new Error(
        e instanceof Error ? e.message : "停止录音失败"
      );
      callbacks.error.forEach((cb) => {
        try {
          cb(error);
        } catch (_e) {
          // 静默处理
        }
      });
    }
    // #endif

    // #ifndef MP-WEIXIN
    // H5：模拟停止
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - startTimestamp) / 1000)
    );
    state = "idle";

    if (durationSeconds < MIN_DURATION_SECONDS) {
      callbacks.cancel.forEach((cb) => {
        try {
          cb();
        } catch (_e) {
          // 静默处理
        }
      });
      return;
    }

    const result: RecorderStopResult = {
      tempFilePath: "",
      durationSeconds,
      fileSize: 0,
    };
    callbacks.stop.forEach((cb) => {
      try {
        cb(result);
      } catch (_e) {
        // 静默处理
      }
    });
    // #endif
  }

  /**
   * 取消录音（不触发 onStop，仅触发 onCancel）
   *
   * 用于用户在录音过程中主动放弃（如上滑取消）。
   *
   * 修复（P1 BUG）：mp-weixin 下 recorderManager.stop() 会触发系统 onStop
   * 事件，原实现导致 onStop 与 onCancel 回调都被触发（双回调）。
   * 现先置位 cancelling 标志，onStop 处理器消费该标志后不再触发任何回调。
   */
  function cancel(): void {
    if (state === "idle") return;
    state = "idle";
    // 置位取消标志：系统 onStop 事件到达时被消费，避免重复触发回调
    cancelling = true;

    // #ifdef MP-WEIXIN
    try {
      recorderManager?.stop();
    } catch (_e) {
      // 静默处理
    }
    // #endif

    callbacks.cancel.forEach((cb) => {
      try {
        cb();
      } catch (_e) {
        // 静默处理
      }
    });
  }

  /**
   * 注册录音开始回调
   * @returns 取消订阅函数
   */
  function onStart(cb: RecorderStartCallback): () => void {
    callbacks.start.push(cb);
    return () => {
      const idx = callbacks.start.indexOf(cb);
      if (idx >= 0) callbacks.start.splice(idx, 1);
    };
  }

  /**
   * 注册录音停止回调
   * @returns 取消订阅函数
   */
  function onStop(cb: RecorderStopCallback): () => void {
    callbacks.stop.push(cb);
    return () => {
      const idx = callbacks.stop.indexOf(cb);
      if (idx >= 0) callbacks.stop.splice(idx, 1);
    };
  }

  /**
   * 注册录音错误回调
   * @returns 取消订阅函数
   */
  function onError(cb: RecorderErrorCallback): () => void {
    callbacks.error.push(cb);
    return () => {
      const idx = callbacks.error.indexOf(cb);
      if (idx >= 0) callbacks.error.splice(idx, 1);
    };
  }

  /**
   * 注册录音取消回调
   * @returns 取消订阅函数
   */
  function onCancel(cb: RecorderCancelCallback): () => void {
    callbacks.cancel.push(cb);
    return () => {
      const idx = callbacks.cancel.indexOf(cb);
      if (idx >= 0) callbacks.cancel.splice(idx, 1);
    };
  }

  /**
   * 销毁录音器，释放资源
   */
  function destroy(): void {
    callbacks.start.length = 0;
    callbacks.stop.length = 0;
    callbacks.error.length = 0;
    callbacks.cancel.length = 0;
    state = "idle";
    // 重置取消标志，避免销毁后残留影响下一次实例使用
    cancelling = false;
    recorderManager = null;
    listenersRegistered = false;
  }

  /** 获取当前录音状态 */
  function getState(): RecorderState {
    return state;
  }

  return {
    start,
    stop,
    cancel,
    destroy,
    getState,
    onStart,
    onStop,
    onError,
    onCancel,
  };
}

/**
 * H5 模拟播放时长（毫秒）。
 *
 * infra R2-00133: 原 play 内魔法数字 3000 无注释（H5/非 mp-weixin 平台无真实
 * 音频上下文，以定时器模拟播放结束回调），抽为具名常量提升可读性。
 */
const SIMULATED_PLAY_DURATION_MS = 3000;

/**
 * 创建音频播放器（用于播放语音消息）
 *
 * 封装 uni.createInnerAudioContext，提供统一的播放/暂停/停止能力。
 * 同一时刻只允许一个播放器播放，避免音频叠加。
 *
 * @returns 播放器实例
 */
export function createAudioPlayer() {
  /** 当前音频上下文（mp-weixin 平台为 InnerAudioContext，其他平台为 null） */
  let audioCtx: ReturnType<typeof uni.createInnerAudioContext> | null = null;

  /** 当前正在播放的 URL（避免同一 URL 重复播放） */
  let currentSrc: string = "";

  /** 是否正在播放 */
  let playing = false;

  // 修复（严格模式 noUnusedLocals）：staticPlayingUrl 仅被赋值从未被读取
  // （互斥控制实际通过 playing + currentSrc 实现），属于遗留死状态，已移除。

  /**
   * H5 模拟播放结束定时器引用。
   *
   * 修复（Task 18.5）：原 play 内 setTimeout 未保存 timer 引用，
   * 在用户停止播放或销毁播放器时无法 clearTimeout，导致：
   * 1. 已停止的播放器在 3 秒后仍可能触发 onPlayStateChange(false) 回调
   * 2. 销毁后回调触发访问已释放资源，存在内存泄漏与潜在异常
   * 现保存到闭包变量，在 stopInternal / destroy 时清理。
   */
  let playbackEndTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 播放语音
   *
   * @param url 语音文件 URL
   * @param onPlayStateChange 播放状态变化回调（true=开始播放，false=停止）
   */
  async function play(
    url: string,
    onPlayStateChange?: (playing: boolean) => void
  ): Promise<void> {
    if (!url) {
      onPlayStateChange?.(false);
      return;
    }

    // 如果当前正在播放同一个 URL，则停止
    if (playing && currentSrc === url) {
      stopInternal(onPlayStateChange);
      return;
    }

    // 如果正在播放其他 URL，先停止
    if (playing) {
      stopInternal(undefined);
    }

    // #ifdef MP-WEIXIN
    try {
      if (!audioCtx) {
        audioCtx = uni.createInnerAudioContext();
        audioCtx.onEnded(() => {
          playing = false;
          onPlayStateChange?.(false);
        });
        audioCtx.onError(() => {
          playing = false;
          onPlayStateChange?.(false);
        });
      }
      audioCtx.src = url;
      audioCtx.play();
      currentSrc = url;
      playing = true;
      onPlayStateChange?.(true);
    } catch (_e) {
      playing = false;
      onPlayStateChange?.(false);
    }
    // #endif

    // #ifndef MP-WEIXIN
    // H5 / 其他平台：模拟播放
    currentSrc = url;
    playing = true;
    onPlayStateChange?.(true);
    // 修复（Task 18.5）：保存 timer 引用到闭包变量，
    // 在 stopInternal / destroy 时 clearTimeout，避免回调在停止后仍触发
    // 清理上一次可能残留的 timer（防御性处理）
    if (playbackEndTimer !== null) {
      clearTimeout(playbackEndTimer);
    }
    playbackEndTimer = setTimeout(() => {
      playbackEndTimer = null;
      if (playing && currentSrc === url) {
        playing = false;
        onPlayStateChange?.(false);
      }
    }, SIMULATED_PLAY_DURATION_MS); // infra R2-00133: 魔法数字具名化
    // #endif
  }

  /**
   * 停止播放
   */
  function stopInternal(onPlayStateChange?: (playing: boolean) => void): void {
    // #ifdef MP-WEIXIN
    try {
      audioCtx?.stop();
    } catch (_e) {
      // 静默处理
    }
    // #endif
    // 修复（Task 18.5）：停止播放时清理 H5 模拟播放定时器，
    // 避免定时器在停止后仍触发 onPlayStateChange(false) 回调
    if (playbackEndTimer !== null) {
      clearTimeout(playbackEndTimer);
      playbackEndTimer = null;
    }
    playing = false;
    onPlayStateChange?.(false);
  }

  /**
   * 主动停止播放
   */
  function stop(): void {
    stopInternal(undefined);
  }

  /**
   * 销毁播放器，释放资源
   */
  function destroy(): void {
    // #ifdef MP-WEIXIN
    try {
      audioCtx?.destroy();
    } catch (_e) {
      // 静默处理
    }
    // #endif
    // 修复（Task 18.5）：销毁时清理 H5 模拟播放定时器，避免回调访问已释放资源
    if (playbackEndTimer !== null) {
      clearTimeout(playbackEndTimer);
      playbackEndTimer = null;
    }
    audioCtx = null;
    playing = false;
    currentSrc = "";
  }

  /**
   * 检查指定 URL 是否正在播放
   */
  function isPlaying(url: string): boolean {
    return playing && currentSrc === url;
  }

  return {
    play,
    stop,
    destroy,
    isPlaying,
  };
}
