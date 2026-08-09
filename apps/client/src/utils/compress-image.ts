/**
 * 图片压缩共享工具（2026-08-09 抽出）。
 *
 * 原实现内联于 pages/village/post.vue（批量压缩发帖配图），
 * 现抽为公共工具供照片墙批量上传等场景复用：
 * - 统一质量 80，压缩失败回退原图，不阻塞后续流程。
 */

/** 图片压缩质量（0-100），与 constants/limits.ts IMAGE_COMPRESS_QUALITY 对齐 */
const DEFAULT_COMPRESS_QUALITY = 80;

/**
 * 批量压缩图片（默认质量 80）。
 *
 * 单张压缩失败时回退使用原图路径，不影响整体结果。
 *
 * @param paths - 本地临时图片路径数组（uni.chooseImage 返回的 tempFilePaths）
 * @returns 压缩后的路径数组（长度与输入一致）
 */
export function compressImages(paths: string[], quality = DEFAULT_COMPRESS_QUALITY): Promise<string[]> {
  return Promise.all(paths.map((path) => compressSingleImage(path, quality)));
}

/**
 * 压缩单张图片（默认质量 80）。
 * 失败时回退使用原图路径，避免阻塞后续上传流程。
 *
 * @param path - 本地临时图片路径
 * @returns 压缩后的路径；压缩失败返回原路径
 */
export function compressSingleImage(path: string, quality = DEFAULT_COMPRESS_QUALITY): Promise<string> {
  return new Promise((resolve) => {
    uni.compressImage({
      src: path,
      quality,
      success: (compressRes) => {
        resolve(compressRes.tempFilePath || path);
      },
      fail: () => {
        // 压缩失败回退原图
        resolve(path);
      },
    });
  });
}
