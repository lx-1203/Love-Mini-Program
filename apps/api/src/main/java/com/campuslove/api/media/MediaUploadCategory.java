package com.campuslove.api.media;

/**
 * 媒体上传业务分类（上传契约新增可选参数 {@code category}）。
 *
 * <p>背景（安全修复：身份证照片越权面收敛）：实名/认证照片此前仅靠
 * URL 路径关键词（id-card/verification/certification）识别，而上传落盘路径为
 * {@code {userId}/{yyyyMM}/{uuid}.jpg}，不含任何关键词，被降级判为 IMAGE
 * （登录用户公开可读）→ 越权面。现要求客户端上传时显式携带分类，
 * 分类落库（media_asset.category），媒体访问侧优先按 DB 分类授权，
 * 路径关键词仅作存量数据兜底。</p>
 *
 * <ul>
 *   <li>{@link #GENERAL} —— 普通图片（缺省值，聊天图片/反馈附件等）</li>
 *   <li>{@link #AVATAR} —— 头像</li>
 *   <li>{@link #POST} —— 帖子/动态图片</li>
 *   <li>{@link #VOICE} —— 语音</li>
 *   <li>{@link #VIDEO} —— 视频</li>
 *   <li>{@link #ID_CARD} —— 身份证/学生证等实名认证资料（极高敏感：
 *       仅本人与 ADMIN 可读，上传即登记 media_asset.category=ID_CARD）</li>
 * </ul>
 */
public enum MediaUploadCategory {

    /** 普通图片（缺省） */
    GENERAL,
    /** 头像 */
    AVATAR,
    /** 帖子/动态图片 */
    POST,
    /** 语音 */
    VOICE,
    /** 视频 */
    VIDEO,
    /** 身份证/学生证等实名认证资料（极高敏感，仅本人/ADMIN 可读） */
    ID_CARD;

    /**
     * 解析分类字符串（大小写不敏感）。
     *
     * @param raw 客户端传入的 category 参数（可为 null/空 → GENERAL）
     * @return 对应枚举
     * @throws IllegalArgumentException 非法取值（HTTP 400 语义）
     */
    public static MediaUploadCategory parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return GENERAL;
        }
        try {
            return valueOf(raw.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "非法的媒体分类 category: " + raw + "，允许取值 " + String.join("/",
                            java.util.Arrays.stream(values()).map(Enum::name).toList()));
        }
    }
}
