package com.campuslove.api.config;

/**
 * 内容业务阈值常量（R4-01826/01827/01828 收敛）。
 *
 * <p>热门判定等业务阈值原先散落在多个 Service 中（real 与 mock 各定义一份，
 * 数值漂移风险高），统一收敛到此处供各处共享，调整时只需改一处。</p>
 */
public final class ContentThresholds {

    /** 帖子热门判定阈值（R4-01826/01827/01828）：likesCount >= 50 视为热门帖子 */
    public static final int HOT_POST_LIKES_THRESHOLD = 50;

    private ContentThresholds() {
        // 禁止实例化
    }
}
