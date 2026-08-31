package com.campuslove.api.auth;

import java.util.List;

/**
 * 体验账号演示人格池（2026-08-31 推荐去重根因修复）。
 *
 * <p>此前所有体验账号硬编码昵称「星野」+ 同一套头像/兴趣/学校，导致
 * 推荐流、相似作者、附近的人等列表出现「上下同一个人」的观感
 * （不同 userId、完全相同的视觉形象）。现在按 {@code userId % 6}
 * 稳定分配 6 套人格，同一账号永远取同一人格，不同账号视觉可区分。</p>
 *
 * <p>头像对应 src/static/assets/images/people/person-0N.png（已同步后端
 * app-assets 托管）。</p>
 */
public enum GuestPersona {
    XINGYE(0, "星野", "female", 2003, "北京大学", "设计学院",
            "person-01", "喜欢慢跑和散步，期待遇见有趣的人",
            List.of("旅行", "摄影", "音乐", "电影")),
    XIAYAN(1, "夏言", "female", 2004, "北京大学", "新闻传播学院",
            "person-03", "喜欢用镜头记录生活的美好瞬间，期待与你一起探索这个世界～",
            List.of("摄影", "阅读", "音乐", "旅行")),
    ACHEN(2, "阿辰", "male", 2003, "清华大学", "计算机系",
            "person-04", "写代码也写诗，偶尔投个三分球",
            List.of("篮球", "编程", "电影", "科技")),
    CAOMEI(3, "草莓奶昔", "female", 2004, "中国人民大学", "新闻学院",
            "person-05", "新发现一家超好吃的日料店！食材新鲜，味道绝了～",
            List.of("美食", "追剧", "旅行", "摄影")),
    XINGCHEN(4, "星辰", "male", 2003, "北京航空航天大学", "电子信息学院",
            "person-07", "电子信息，动手能力强的极客，爱折腾",
            List.of("摄影", "健身", "科技", "电影")),
    ZHOUYU(5, "周雨", "male", 2004, "上海交通大学", "船舶海洋学院",
            "person-08", "周末常去逛书店和看展，偶尔夜骑",
            List.of("音乐", "游戏", "骑行", "阅读"));

    private final int slot;
    private final String nickname;
    private final String gender;
    private final int birthYear;
    private final String campusName;
    private final String departmentName;
    private final String avatarAsset;
    private final String bio;
    private final List<String> interestTags;

    GuestPersona(int slot, String nickname, String gender, int birthYear,
                 String campusName, String departmentName, String avatarAsset,
                 String bio, List<String> interestTags) {
        this.slot = slot;
        this.nickname = nickname;
        this.gender = gender;
        this.birthYear = birthYear;
        this.campusName = campusName;
        this.departmentName = departmentName;
        this.avatarAsset = avatarAsset;
        this.bio = bio;
        this.interestTags = interestTags;
    }

    /** 按 userId 稳定取人格（同一账号永远同一人格）。 */
    public static GuestPersona forId(Long userId) {
        if (userId == null || userId <= 0) {
            return XINGYE;
        }
        for (GuestPersona p : values()) {
            if (p.slot == (int) Math.floorMod(userId, values().length)) {
                return p;
            }
        }
        return XINGYE;
    }

    /** 头像静态路径（real 模式由 resolveMediaUrl 改写为后端 app-assets URL）。 */
    public String avatarPath() {
        return "/static/assets/images/people/" + avatarAsset + ".png";
    }

    public String interestTagsJson() {
        return "[\"" + String.join("\",\"", interestTags) + "\"]";
    }

    public String nickname() {
        return nickname;
    }

    public String gender() {
        return gender;
    }

    public int birthYear() {
        return birthYear;
    }

    public String campusName() {
        return campusName;
    }

    public String departmentName() {
        return departmentName;
    }

    public String bio() {
        return bio;
    }

    int slot() {
        return slot;
    }
}
