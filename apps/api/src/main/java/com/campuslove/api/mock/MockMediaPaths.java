package com.campuslove.api.mock;

/**
 * mock 种子媒体路径常量（R4-01794~01802 收敛）。
 *
 * <p>mock 演示种子数据中的占位图片/视频路径原先散落硬编码在多个 mock 服务
 * （MockVillageService / MockCampusService / MockCampusCertificationService /
 * MockNotificationService / MockRuntimeState），统一收敛到本类：
 * <ul>
 *   <li>替换本地演示素材时只需改一处（如整体改为 /static/mock/ 或本地图床地址）</li>
 *   <li>这些路径仅为 mock（本地演示）使用，mock 包已从生产 jar 排除（R4-00367）</li>
 *   <li>客户端 SafeImage 对加载失败的图片自动回退首字占位，不会展示破图</li>
 * </ul>
 */
public final class MockMediaPaths {

    /** mock 媒体占位路径前缀 */
    public static final String PREFIX = "/uploads/mock/";

    // ---- 头像 ----
    public static final String AVATAR_LINAN = PREFIX + "avatar-linan.jpg";
    public static final String AVATAR_ZHOU_MU = PREFIX + "avatar-zhoumu.jpg";
    public static final String AVATAR_XUNUO = PREFIX + "avatar-xunuo.jpg";
    public static final String AVATAR_SULI = PREFIX + "avatar-suli.jpg";
    public static final String AVATAR_XIAYE = PREFIX + "avatar-xiaye.jpg";
    public static final String AVATAR_XINGYE = PREFIX + "avatar-xingye.jpg";

    // ---- 帖子/话题图 ----
    public static final String POST_SUNRISE_1 = PREFIX + "post-sunrise-1.jpg";
    public static final String POST_SUNRISE_2 = PREFIX + "post-sunrise-2.jpg";
    public static final String POST_COFFEE_1 = PREFIX + "post-coffee-1.jpg";
    public static final String POST_MOVIE_1 = PREFIX + "post-movie-1.jpg";
    public static final String TOPIC_PHOTO_1 = PREFIX + "topic-photo-1.jpg";
    public static final String TOPIC_FOOD_1 = PREFIX + "topic-food-1.jpg";
    public static final String TOPIC_FOOD_2 = PREFIX + "topic-food-2.jpg";

    // ---- 个人资料/认证 ----
    public static final String PHOTO_1 = PREFIX + "photo-1.jpg";
    public static final String HALF = PREFIX + "half.jpg";
    public static final String INTRO_MP4 = PREFIX + "intro.mp4";
    public static final String BG = PREFIX + "bg.jpg";
    public static final String STUDENT_CARD_1 = PREFIX + "student-card-1.jpg";

    private MockMediaPaths() {
        // 禁止实例化
    }
}
