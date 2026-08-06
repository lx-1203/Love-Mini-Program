package com.campuslove.api.media;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

/**
 * LocalMediaStorageService 单元测试（Phase A - Task B4）。
 *
 * <p>覆盖场景：
 * <ul>
 *   <li>上传 jpg 返回成功，url 非空</li>
 *   <li>上传 50MB+ 文件抛出 MediaSizeLimitExceededException（413 等价）</li>
 *   <li>上传 .exe 文件抛出 IllegalArgumentException（400 等价）</li>
 *   <li>上传图片宽高正确读取</li>
 *   <li>上传视频（mp4）成功，durationMs 由前端透传（不在此校验）</li>
 *   <li>上传空文件抛出 IllegalArgumentException</li>
 *   <li>上传不支持的视频格式（如 .avi）抛出 IllegalArgumentException</li>
 * </ul>
 * </p>
 *
 * <p>测试策略：
 * <ul>
 *   <li>使用临时目录作为 storageRoot，避免污染工作目录</li>
 *   <li>真实 jpg 图片通过 ImageIO 写入 8x8 BufferedImage 生成</li>
 *   <li>大文件场景通过 Mockito mock MultipartFile.getSize() 返回 60MB，
 *       避免实际分配 60MB 字节数组</li>
 * </ul>
 * </p>
 */
class LocalMediaStorageServiceTest {

    /** 测试用图片宽度 */
    private static final int TEST_IMG_W = 8;
    /** 测试用图片高度 */
    private static final int TEST_IMG_H = 8;

    private Path tempRoot;
    private LocalMediaStorageService service;

    @BeforeEach
    void setUp() throws IOException {
        tempRoot = Files.createTempDirectory("media-storage-test");
        service = new LocalMediaStorageService(tempRoot.toString());
    }

    @AfterEach
    void tearDown() throws IOException {
        // 清理临时目录及其内容
        if (Files.exists(tempRoot)) {
            Files.walk(tempRoot)
                    .sorted((a, b) -> b.compareTo(a))
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException ignored) {
                            // 测试清理时忽略删除失败
                        }
                    });
        }
    }

    /**
     * 场景 1：上传 jpg 图片 → 成功，url 非空，宽高正确读取。
     */
    @Test
    void uploadJpg_shouldReturnSuccessAndNonEmptyUrl() throws Exception {
        byte[] jpgBytes = generateJpegBytes(TEST_IMG_W, TEST_IMG_H);
        MockMultipartFile file = new MockMultipartFile(
                "file", "test-photo.jpg", "image/jpeg", jpgBytes);

        MediaStorageService.UploadResult result = service.store(100L, file, "image");

        assertNotNull(result.getUrl(), "上传成功后 URL 不能为空");
        assertTrue(result.getUrl().startsWith("/api/v1/media/100/"),
                "URL 应以 /api/v1/media/{userId}/ 开头: " + result.getUrl());
        assertTrue(result.getUrl().endsWith(".jpg"),
                "URL 应保留 jpg 扩展名: " + result.getUrl());
        assertEquals(TEST_IMG_W, result.getWidth(), "图片宽度应为 8");
        assertEquals(TEST_IMG_H, result.getHeight(), "图片高度应为 8");
        assertEquals("image/jpeg", result.getMime(), "MIME 应为 image/jpeg");
        assertEquals((long) jpgBytes.length, result.getSize(), "size 应与上传字节数一致");
    }

    /**
     * 场景 2：上传 60MB 视频文件 → 抛出 MediaSizeLimitExceededException（>50MB 限制，413 等价）。
     *
     * <p>使用 Mockito mock MultipartFile，避免实际分配 60MB 内存。</p>
     */
    @Test
    void uploadOversizedVideo_shouldThrowMediaSizeLimitExceeded() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("big-video.mp4");
        when(file.getContentType()).thenReturn("video/mp4");
        // 模拟 60MB 文件大小
        when(file.getSize()).thenReturn(60L * 1024 * 1024);

        MediaSizeLimitExceededException ex = assertThrows(
                MediaSizeLimitExceededException.class,
                () -> service.store(1L, file, "video"));
        assertTrue(ex.getMessage().contains("超过限制"),
                "异常信息应说明大小超限: " + ex.getMessage());
    }

    /**
     * 场景 2.1：上传 60MB 图片 → 抛出 MediaSizeLimitExceededException（>10MB 限制，413 等价）。
     */
    @Test
    void uploadOversizedImage_shouldThrowMediaSizeLimitExceeded() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("big-photo.jpg");
        when(file.getContentType()).thenReturn("image/jpeg");
        // 模拟 15MB 图片，超过 10MB 限制
        when(file.getSize()).thenReturn(15L * 1024 * 1024);

        MediaSizeLimitExceededException ex = assertThrows(
                MediaSizeLimitExceededException.class,
                () -> service.store(1L, file, "image"));
        assertTrue(ex.getMessage().contains("超过限制"),
                "异常信息应说明大小超限: " + ex.getMessage());
    }

    /**
     * 场景 3：上传 .exe 文件 → 抛出 IllegalArgumentException（不支持的格式）。
     */
    @Test
    void uploadExe_shouldThrowIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "malicious.exe", "application/octet-stream",
                new byte[]{0x4D, 0x5A, 0x00, 0x00});

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.store(1L, file, "image"));
        assertTrue(ex.getMessage().contains("不支持的图片格式"),
                "异常信息应说明格式不支持: " + ex.getMessage());
    }

    /**
     * 场景 3.1：上传 .avi 视频 → 抛出 IllegalArgumentException（仅支持 mp4/mov）。
     */
    @Test
    void uploadAviVideo_shouldThrowIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "old.avi", "video/x-msvideo", new byte[]{0x00, 0x00, 0x01, 0x00});

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.store(1L, file, "video"));
        assertTrue(ex.getMessage().contains("不支持的视频格式"),
                "异常信息应说明视频格式不支持: " + ex.getMessage());
    }

    /**
     * 场景 4：上传 PNG 图片，宽高正确读取（与 jpg 路径区分）。
     */
    @Test
    void uploadPng_shouldReadDimensions() throws Exception {
        byte[] pngBytes = generatePngBytes(TEST_IMG_W, TEST_IMG_H);
        MockMultipartFile file = new MockMultipartFile(
                "file", "avatar.png", "image/png", pngBytes);

        MediaStorageService.UploadResult result = service.store(200L, file, "image");

        assertEquals(TEST_IMG_W, result.getWidth(), "PNG 宽度应为 8");
        assertEquals(TEST_IMG_H, result.getHeight(), "PNG 高度应为 8");
        assertTrue(result.getUrl().endsWith(".png"), "URL 应保留 png 扩展名");
    }

    /**
     * 场景 5：上传 background 类型 → 按图片规则校验，URL 包含 /api/v1/media/。
     */
    @Test
    void uploadBackground_shouldUseImageRules() throws Exception {
        byte[] jpgBytes = generateJpegBytes(4, 4);
        MockMultipartFile file = new MockMultipartFile(
                "file", "bg.jpg", "image/jpeg", jpgBytes);

        MediaStorageService.UploadResult result = service.store(300L, file, "background");

        assertNotNull(result.getUrl());
        assertTrue(result.getUrl().startsWith("/api/v1/media/300/"));
        assertEquals(4, result.getWidth());
        assertEquals(4, result.getHeight());
    }

    /**
     * 场景 6：上传空文件 → 抛出 IllegalArgumentException。
     */
    @Test
    void uploadEmptyFile_shouldThrowIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.store(1L, file, "image"));
        assertTrue(ex.getMessage().contains("不能为空"),
                "异常信息应说明文件为空: " + ex.getMessage());
    }

    /**
     * 场景 7：userId 为 null → 抛出 IllegalArgumentException。
     */
    @Test
    void storeWithNullUserId_shouldThrowIllegalArgument() throws Exception {
        byte[] jpgBytes = generateJpegBytes(2, 2);
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", jpgBytes);

        assertThrows(IllegalArgumentException.class,
                () -> service.store(null, file, "image"));
    }

    /**
     * 场景 8：上传 mp4 视频 → 成功，durationMs 为 null（由前端透传）。
     */
    @Test
    void uploadMp4_shouldReturnSuccessUrl() {
        // 使用一个小型 mp4 头部字节（不需要真实可播放文件，仅校验路径与扩展名）
        byte[] mp4Bytes = new byte[]{0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
                0x6D, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00};
        MockMultipartFile file = new MockMultipartFile(
                "file", "intro.mp4", "video/mp4", mp4Bytes);

        MediaStorageService.UploadResult result = service.store(400L, file, "video");

        assertNotNull(result.getUrl(), "视频上传成功后 URL 不能为空");
        assertTrue(result.getUrl().endsWith(".mp4"), "URL 应保留 mp4 扩展名");
        // 服务层不解析视频元信息，width/height/durationMs 应为 null
        assertEquals(null, result.getWidth(), "视频 width 应为 null");
        assertEquals(null, result.getHeight(), "视频 height 应为 null");
        assertEquals(null, result.getDurationMs(), "视频 durationMs 应为 null（前端透传）");
    }

    /**
     * 场景 9：不支持的视频格式 .mov 但扩展名错误 → 抛出。
     * 反向测试：mov 应被支持，不应抛异常。
     */
    @Test
    void uploadMov_shouldBeSupported() {
        // MOV 文件也使用 ISO BMFF 容器格式，文件头为 "ftyp" box（与 mp4 共用 magic bytes）
        byte[] movBytes = new byte[]{0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70,
                0x71, 0x74, 0x20, 0x20, 0x00, 0x00, 0x00, 0x00};
        MockMultipartFile file = new MockMultipartFile(
                "file", "clip.mov", "video/quicktime", movBytes);

        MediaStorageService.UploadResult result = service.store(500L, file, "video");

        assertNotNull(result.getUrl(), "mov 上传应成功");
        assertTrue(result.getUrl().endsWith(".mov"));
    }

    /**
     * P2.6 场景：上传 aac 音频（60s 语音状态，微信 RecorderManager 输出）
     * → 成功，width/height 为 null（音频无宽高）。
     */
    @Test
    void uploadAacAudio_shouldReturnSuccessUrl() {
        // ADTS 帧同步字 FF F1（微信 aac 输出文件头）
        byte[] aacBytes = new byte[]{
                (byte) 0xFF, (byte) 0xF1, 0x50, (byte) 0x80, 0x01, 0x40, 0x40
        };
        MockMultipartFile file = new MockMultipartFile(
                "file", "voice-status.aac", "audio/aac", aacBytes);

        MediaStorageService.UploadResult result = service.store(600L, file, "audio");

        assertNotNull(result.getUrl(), "音频上传成功后 URL 不能为空");
        assertTrue(result.getUrl().startsWith("/api/v1/media/600/"),
                "URL 应以 /api/v1/media/{userId}/ 开头: " + result.getUrl());
        assertTrue(result.getUrl().endsWith(".aac"), "URL 应保留 aac 扩展名");
        assertEquals(null, result.getWidth(), "音频 width 应为 null");
        assertEquals(null, result.getHeight(), "音频 height 应为 null");
    }

    /**
     * P2.6 场景：上传 mp3 音频（带 ID3v2 标签头）→ 成功。
     */
    @Test
    void uploadMp3Audio_shouldBeSupported() {
        // ID3v2 标签头 "ID3" + 版本字节
        byte[] mp3Bytes = new byte[]{0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00};
        MockMultipartFile file = new MockMultipartFile(
                "file", "voice-status.mp3", "audio/mpeg", mp3Bytes);

        MediaStorageService.UploadResult result = service.store(600L, file, "audio");

        assertNotNull(result.getUrl(), "mp3 上传应成功");
        assertTrue(result.getUrl().endsWith(".mp3"));
    }

    /**
     * P2.6 场景：上传 9MB 音频 → 抛出 MediaSizeLimitExceededException（>8MB 限制，413 等价）。
     */
    @Test
    void uploadOversizedAudio_shouldThrowMediaSizeLimitExceeded() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("long-voice.aac");
        when(file.getContentType()).thenReturn("audio/aac");
        // 模拟 9MB 文件，超过 8MB 限制
        when(file.getSize()).thenReturn(9L * 1024 * 1024);

        MediaSizeLimitExceededException ex = assertThrows(
                MediaSizeLimitExceededException.class,
                () -> service.store(1L, file, "audio"));
        assertTrue(ex.getMessage().contains("超过限制"),
                "异常信息应说明大小超限: " + ex.getMessage());
    }

    /**
     * P2.6 场景：音频内容与扩展名声明不一致（.aac 实为图片）→ 抛出 IllegalArgumentException。
     */
    @Test
    void uploadAudioWithWrongMagicBytes_shouldThrowIllegalArgument() {
        // JPEG 文件头伪装成 .aac
        byte[] jpegHeader = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake-voice.aac", "audio/aac", jpegHeader);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.store(1L, file, "audio"));
        assertTrue(ex.getMessage().contains("magic bytes"),
                "异常信息应说明 magic bytes 校验失败: " + ex.getMessage());
    }

    /**
     * P2.6 场景：不支持的音频格式（.ogg）→ 抛出 IllegalArgumentException。
     */
    @Test
    void uploadOggAudio_shouldThrowIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "voice.ogg", "audio/ogg", new byte[]{0x4F, 0x67, 0x67, 0x53});

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.store(1L, file, "audio"));
        assertTrue(ex.getMessage().contains("不支持的音频格式"),
                "异常信息应说明格式不支持: " + ex.getMessage());
    }

    /**
     * 场景 10：未识别的 type 参数 → 抛出 IllegalArgumentException。
     * （注：audio 已是受支持类型，改用 document 作为未知类型样例）
     */
    @Test
    void storeWithUnknownType_shouldThrowIllegalArgument() throws Exception {
        byte[] jpgBytes = generateJpegBytes(2, 2);
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", jpgBytes);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.store(1L, file, "document"));
        assertTrue(ex.getMessage().contains("不支持的媒体类型"),
                "异常信息应说明类型不支持: " + ex.getMessage());
    }

    /**
     * 场景 11：多次上传同一文件 → 生成不同 URL（UUID 防重名）。
     */
    @Test
    void uploadSameFileTwice_shouldGenerateDifferentUrls() throws Exception {
        byte[] jpgBytes = generateJpegBytes(2, 2);
        MockMultipartFile file1 = new MockMultipartFile(
                "file", "dup.jpg", "image/jpeg", jpgBytes);
        MockMultipartFile file2 = new MockMultipartFile(
                "file", "dup.jpg", "image/jpeg", jpgBytes);

        MediaStorageService.UploadResult r1 = service.store(600L, file1, "image");
        MediaStorageService.UploadResult r2 = service.store(600L, file2, "image");

        assertTrue(!r1.getUrl().equals(r2.getUrl()),
                "两次上传的 URL 应不同（UUID 命名）");
    }

    /**
     * 场景 12：文件无扩展名 → 抛出 IllegalArgumentException。
     */
    @Test
    void uploadFileWithoutExtension_shouldThrowIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "noextension", "image/jpeg", new byte[]{0x01, 0x02});

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.store(1L, file, "image"));
        assertTrue(ex.getMessage().contains("缺少扩展名"),
                "异常信息应说明缺少扩展名: " + ex.getMessage());
    }

    /**
     * 场景 13：webp 图片扩展名应被支持。
     */
    @Test
    void uploadWebp_shouldBeSupported() {
        // WebP 文件头：RIFF (4字节) + size (4字节) + WEBP (4字节)
        MockMultipartFile file = new MockMultipartFile(
                "file", "anim.webp", "image/webp",
                new byte[]{0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
                        0x57, 0x45, 0x42, 0x50});

        // webp 在 JDK 默认 ImageIO 可能未注册 reader，store 会调用 readImageDimensions
        // 但 validate 阶段已通过，store 应返回 url（width/height 可能因无 reader 为 null）
        // 这里只断言不抛 IllegalArgumentException（格式校验已通过）
        // 如果 ImageIO 抛 IOException，service 会捕获并设 width/height=null
        MediaStorageService.UploadResult result = service.store(700L, file, "image");
        assertNotNull(result.getUrl(), "webp 上传应返回 URL");
        assertTrue(result.getUrl().endsWith(".webp"));
    }

    /**
     * 场景 14：size 为 0 的图片文件（MockMultipartFile 默认 isEmpty()=true）→ 抛出。
     */
    @Test
    void uploadZeroSizeImage_shouldThrowIllegalArgument() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "zero.jpg", "image/jpeg", new byte[0]);

        assertThrows(IllegalArgumentException.class,
                () -> service.store(1L, file, "image"));
    }

    // ---------- 工具方法 ----------

    /**
     * 生成指定宽高的 JPEG 字节数组。
     *
     * @param w 宽度
     * @param h 高度
     * @return JPEG 字节数组
     * @throws IOException ImageIO 写入失败
     */
    private byte[] generateJpegBytes(int w, int h) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        // 填充颜色避免空图被某些 JPEG 解码器拒绝
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                img.setRGB(x, y, 0xFF888888);
            }
        }
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        if (!ImageIO.write(img, "jpg", bos)) {
            throw new IOException("ImageIO 无可用 JPEG writer");
        }
        return bos.toByteArray();
    }

    /**
     * 生成指定宽高的 PNG 字节数组。
     *
     * @param w 宽度
     * @param h 高度
     * @return PNG 字节数组
     * @throws IOException ImageIO 写入失败
     */
    private byte[] generatePngBytes(int w, int h) throws IOException {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                img.setRGB(x, y, 0x888888FF);
            }
        }
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        if (!ImageIO.write(img, "png", bos)) {
            throw new IOException("ImageIO 无可用 PNG writer");
        }
        return bos.toByteArray();
    }
}
