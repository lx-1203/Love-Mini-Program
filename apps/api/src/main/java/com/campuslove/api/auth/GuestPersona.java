package com.campuslove.api.auth;

import java.util.List;

/**
 * 体验账号演示人格池（2026-08-31 推荐去重根因修复；同日扩充至 9 套；
 * 2026-09-12 扩充至 21 套，头像 person-10 ~ 21 为同风格锚点链新增素材）。
 *
 * <p>此前所有体验账号硬编码昵称「星野」+ 同一套头像/兴趣/学校，导致
 * 推荐流、相似作者、附近的人等列表出现「上下同一个人」的观感
 * （不同 userId、完全相同的视觉形象）。现在按 {@code userId % 21}
 * 稳定分配 21 套人格，同一账号永远取同一人格，不同账号视觉可区分。</p>
 *
 * <p>头像对应 src/static/assets/images/people/person-0N.png（real 模式经
 * resolveMediaUrl 由后端 app-assets 托管；10 ~ 21 需 media_asset 注册，
 * 见 V2026.09.12.0001 迁移）。</p>
 */
public enum GuestPersona {
    XINGYE(0, "星野", "female", 2003, "北京大学", "设计学院",
            "person-01", "喜欢慢跑和散步，期待遇见有趣的人",
            List.of("旅行", "摄影", "音乐", "电影")),
    XIAYAN(1, "夏言", "female", 2004, "北京大学", "新闻传播学院",
            "person-08", "喜欢用镜头记录生活的美好瞬间，期待与你一起探索这个世界～",
            List.of("摄影", "阅读", "音乐", "旅行")),
    ACHEN(2, "阿辰", "male", 2003, "清华大学", "计算机系",
            "person-05", "写代码也写诗，偶尔投个三分球",
            List.of("篮球", "编程", "电影", "科技")),
    CAOMEI(3, "草莓奶昔", "female", 2004, "中国人民大学", "新闻学院",
            "person-04", "新发现一家超好吃的日料店！食材新鲜，味道绝了～",
            List.of("美食", "追剧", "旅行", "摄影")),
    XINGCHEN(4, "星辰", "male", 2003, "北京航空航天大学", "电子信息学院",
            "person-07", "电子信息，动手能力强的极客，爱折腾",
            List.of("摄影", "健身", "科技", "电影")),
    ZHOUYU(5, "周雨", "male", 2004, "上海交通大学", "船舶海洋学院",
            "person-09", "周末常去逛书店和看展，偶尔夜骑",
            List.of("音乐", "游戏", "骑行", "阅读")),
    XIAOMAN(6, "小满", "female", 2005, "复旦大学", "中文系",
            "person-02", "在图书馆修中文，也在操场修心情",
            List.of("读书", "跑步", "美食", "音乐")),
    MURAN(7, "暮然", "male", 2002, "北京理工大学", "机械工程",
            "person-03", "机车与吉他各占一半生活，剩下的一半在打球",
            List.of("机车", "吉他", "篮球", "旅行")),
    QIUWEI(8, "秋薇", "female", 2003, "北京师范大学", "心理学部",
            "person-06", "爱观察生活的细节，也爱记录四季的光",
            List.of("插画", "心理学", "旅行", "摄影")),
    /* ---- 2026-09-12 扩容：slot 9 ~ 20（person-10 ~ 21） ---- */
    NANQIAO(9, "南乔", "female", 2004, "南京大学", "文学院",
            "person-10", "在图书馆把喜欢的书读了两遍，第二遍是为了记住句子",
            List.of("读书", "写作", "咖啡", "电影")),
    LUYE(10, "陆野", "male", 2003, "北京体育大学", "运动训练",
            "person-11", "球场上的三分，比论文好写一点",
            List.of("篮球", "健身", "电竞", "潮流")),
    SUWAN(11, "苏晚", "female", 2004, "复旦大学", "广告学",
            "person-12", "拿铁续命，文案续梦，周末在街角探店",
            List.of("咖啡", "写作", "摄影", "旅行")),
    JIANGXU(12, "江叙", "male", 2002, "同济大学", "建筑系",
            "person-13", "喜欢在天台看城市亮灯的那一刻",
            List.of("建筑", "摄影", "电影", "骑行")),
    ATANG(13, "阿棠", "female", 2004, "中国美术学院", "插画系",
            "person-14", "手上总有洗不掉的颜料，心里有画不完的画",
            List.of("插画", "看展", "宠物", "音乐")),
    SHENYAN(14, "沈砚", "male", 2003, "南京大学", "哲学系",
            "person-15", "在书店打工，顺便把哲学读成了生活",
            List.of("阅读", "电影", "咖啡", "摇滚")),
    TAOTAO(15, "桃桃", "female", 2005, "浙江大学", "生命科学",
            "person-16", "春天拍照，夏天喝汽水，秋天收集落叶",
            List.of("摄影", "旅行", "美食", "手账")),
    CHENGYI(16, "程一", "male", 2003, "华中科技大学", "软件工程",
            "person-17", "白天写代码，晚上写小说",
            List.of("编程", "科幻", "游戏", "桌游")),
    XIAZHI(17, "夏至", "female", 2004, "武汉大学", "新闻传播学院",
            "person-18", "早八人，也是操场五公里选手",
            List.of("跑步", "旅行", "美食", "音乐")),
    GUBEI(18, "顾北", "male", 2002, "北京交通大学", "交通运输",
            "person-19", "通勤路上听完了三十张专辑",
            List.of("音乐", "摄影", "电影", "地铁漫游")),
    LINZHIXIA(19, "林知夏", "female", 2004, "中国农业大学", "园艺",
            "person-20", "养了二十七盆多肉，全部活着",
            List.of("植物", "美食", "宠物", "手作")),
    BAISHU(20, "白树", "male", 2003, "四川音乐学院", "音乐表演",
            "person-21", "会弹吉他，也想听你唱一首",
            List.of("吉他", "音乐", "演出", "咖啡"));

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
        GuestPersona[] all = values();
        int slot = (int) Math.floorMod(userId, all.length);
        for (GuestPersona p : all) {
            if (p.slot == slot) {
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
