package com.campuslove.api.campus;

import com.campuslove.api.discover.ActivityView;
import com.campuslove.api.village.PostAuthorView;
import com.campuslove.api.village.PostSummaryView;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 校园社交服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 */
@Profile("mock")
@Service
public class MockCampusService implements CampusService {

    private final AtomicLong topicIdGen = new AtomicLong(2000);
    private final AtomicLong replyIdGen = new AtomicLong(3000);

    private final List<MockTopicData> topics = new ArrayList<>();
    private final Map<Long, List<MockReplyData>> repliesByTopic = new LinkedHashMap<>();

    public MockCampusService() {
        initMockData();
    }

    // ---- 校园话题 ----

    @Override
    public CampusTopicView getCampusTopic(Long topicId) {
        MockTopicData topic = findTopic(topicId);
        topic.viewCount++;
        return toTopicView(topic);
    }

    @Override
    public List<CampusTopicView> getCampusTopics(Long schoolId, String category) {
        return topics.stream()
                .filter(t -> t.schoolId.equals(schoolId))
                .filter(t -> category == null || t.category.equals(category))
                .map(this::toTopicView)
                .toList();
    }

    @Override
    public CampusTopicView createCampusTopic(Long userId, Long schoolId, String category, String title, String content) {
        long id = topicIdGen.incrementAndGet();
        MockTopicData topic = new MockTopicData(
                id, schoolId, category, title, content, null, userId,
                "Mock校友", null, 0, 0, false,
                LocalDateTime.now(), LocalDateTime.now()
        );
        topics.add(0, topic);
        return toTopicView(topic);
    }

    // ---- 校园话题回复 ----

    @Override
    public CampusTopicReplyView replyCampusTopic(Long topicId, Long userId, String content) {
        findTopic(topicId); // 确保话题存在
        long id = replyIdGen.incrementAndGet();
        MockReplyData reply = new MockReplyData(
                id, topicId, userId, "Mock校友", null, content, false, LocalDateTime.now()
        );
        repliesByTopic.computeIfAbsent(topicId, k -> new ArrayList<>()).add(reply);
        return toReplyView(reply);
    }

    @Override
    public List<CampusTopicReplyView> getCampusTopicReplies(Long topicId) {
        findTopic(topicId); // 确保话题存在
        List<MockReplyData> replies = repliesByTopic.getOrDefault(topicId, List.of());
        return replies.stream()
                .map(this::toReplyView)
                .toList();
    }

    // ---- 同校帖子流 ----

    @Override
    public List<PostSummaryView> getCampusPosts(Long schoolId, int page) {
        if (page > 0) {
            return List.of();
        }
        return List.of(
                new PostSummaryView(
                        101L, null, "今天在图书馆遇到一个特别的人，想在校园墙上分享一下...",
                        new PostAuthorView(1001L, "星野", null, "南校区"),
                        "life", List.of("校园生活"), 128, 45, 12,
                        LocalDateTime.now().minusHours(2).toString(), true, true
                ),
                new PostSummaryView(
                        102L, null, "高数考试自救小组招人啦！大二以上，认真不摸鱼。",
                        new PostAuthorView(1002L, "林安", null, "南校区"),
                        "study", List.of("学习", "高数"), 67, 23, 5,
                        LocalDateTime.now().minusHours(5).toString(), false, true
                ),
                new PostSummaryView(
                        103L, null, "周末一起去后山看日出吧！记得带外套~",
                        new PostAuthorView(1003L, "周沐", null, "北校区"),
                        "activity", List.of("活动", "后山"), 89, 31, 8,
                        LocalDateTime.now().minusDays(1).toString(), false, false
                )
        );
    }

    // ---- 同校活动 ----

    @Override
    public List<ActivityView> getCampusActivities(Long schoolId, int page) {
        if (page > 0) {
            return List.of();
        }
        return List.of(
                new ActivityView(
                        201L, "图书馆南门咖啡散步", "南门咖啡馆", "周四 19:00-20:00",
                        "在安静的咖啡馆里，和志同道合的朋友一起聊天放松",
                        12, List.of(), "upcoming", LocalDate.now().plusDays(2)
                ),
                new ActivityView(
                        202L, "电影社轻松线下碰面", "影像楼 B 厅", "周六 15:00-17:00",
                        "一起看电影，认识新朋友",
                        8, List.of(), "upcoming", LocalDate.now().plusDays(4)
                ),
                new ActivityView(
                        203L, "周末篮球友谊赛", "体育馆", "周日 10:00-12:00",
                        "篮球爱好者集合，友谊第一比赛第二",
                        20, List.of(), "ongoing", LocalDate.now().plusDays(5)
                )
        );
    }

    // ---- 私有辅助方法 ----

    private MockTopicData findTopic(Long id) {
        return topics.stream()
                .filter(t -> t.id.equals(id))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("话题不存在: " + id));
    }

    private CampusTopicView toTopicView(MockTopicData t) {
        return new CampusTopicView(
                t.id, t.schoolId, t.category, t.title, t.content, t.images,
                t.isAnonymous ? null : t.authorId,
                t.isAnonymous ? "匿名校友" : t.authorName,
                t.isAnonymous ? null : t.authorAvatar,
                t.replyCount, t.viewCount, t.isAnonymous,
                t.createdAt.toString()
        );
    }

    private CampusTopicReplyView toReplyView(MockReplyData r) {
        return new CampusTopicReplyView(
                r.id, r.topicId,
                r.isAnonymous ? null : r.authorId,
                r.isAnonymous ? "匿名校友" : r.authorName,
                r.isAnonymous ? null : r.authorAvatar,
                r.content, r.isAnonymous,
                r.createdAt.toString()
        );
    }

    // ---- Mock 数据初始化 ----

    private void initMockData() {
        topics.add(new MockTopicData(
                2001L, 1L, "course", "高数A期末考试复习资料共享",
                "整理了近三年的高数A期末考试真题和答案，需要的同学留言邮箱，我统一发送。也欢迎大家补充自己的复习笔记~",
                null, 1001L, "星野", null, 15, 256, false,
                LocalDateTime.now().minusDays(1), LocalDateTime.now().minusHours(1)
        ));
        topics.add(new MockTopicData(
                2002L, 1L, "club", "摄影社新学期招新啦！",
                "无论你是摄影老手还是刚入门的新人，都欢迎加入我们！每周组织一次外拍活动，器材可以共享。报名截止下周五。",
                "[\"https://picsum.photos/400/300?photo1\"]", 1002L, "林安", null, 32, 480, false,
                LocalDateTime.now().minusDays(2), LocalDateTime.now().minusHours(2)
        ));
        topics.add(new MockTopicData(
                2003L, 1L, "activity", "本周末校园音乐节志愿者招募",
                "校园音乐节需要招募20名志愿者，负责场地布置、引导和后勤。提供志愿者证书和午餐。",
                null, 1003L, "周沐", null, 8, 180, false,
                LocalDateTime.now().minusDays(3), LocalDateTime.now().minusDays(1)
        ));
        topics.add(new MockTopicData(
                2004L, 1L, "study", "有没有一起备考四六级的小伙伴？",
                "想找几个英语搭子，每天早上7点在图书馆门口晨读30分钟，然后互相抽查单词。目前已有3人~",
                null, 1004L, "许诺", null, 22, 320, false,
                LocalDateTime.now().minusDays(4), LocalDateTime.now().minusDays(2)
        ));
        topics.add(new MockTopicData(
                2005L, 1L, "life", "学校周边美食探店合集（持续更新）",
                "作为一个资深吃货，分享学校周边值得一试的美食！从南门小吃街到北门商业区，价格亲民~",
                "[\"https://picsum.photos/400/300?food1\",\"https://picsum.photos/400/300?food2\"]",
                1001L, null, null, 45, 520, true,
                LocalDateTime.now().minusDays(5), LocalDateTime.now().minusDays(3)
        ));

        // 模拟回复
        repliesByTopic.put(2001L, new ArrayList<>(List.of(
                new MockReplyData(3001L, 2001L, 1002L, "林安", null,
                        "太感谢了！我的邮箱是 xxx@campus.edu，麻烦发一下~", false,
                        LocalDateTime.now().minusHours(22)),
                new MockReplyData(3002L, 2001L, 1003L, "周沐", null,
                        "已收到，整理得很棒！我也补充了一些概率论的资料，要不要合并？", false,
                        LocalDateTime.now().minusHours(20)),
                new MockReplyData(3003L, 2001L, 1004L, null, null,
                        "求一份，谢谢学长！", true,
                        LocalDateTime.now().minusHours(18))
        )));

        repliesByTopic.put(2002L, new ArrayList<>(List.of(
                new MockReplyData(3004L, 2002L, 1004L, "许诺", null,
                        "请问器材共享是免费的吗？", false,
                        LocalDateTime.now().minusDays(1).minusHours(2)),
                new MockReplyData(3005L, 2002L, 1001L, "星野", null,
                        "免费的！社内器材大家轮流使用，需要提前预约就行~", false,
                        LocalDateTime.now().minusDays(1).minusHours(1))
        )));
    }

    // ---- 内部数据类 ----

    static class MockTopicData {
        Long id;
        Long schoolId;
        String category;
        String title;
        String content;
        String images;
        Long authorId;
        String authorName;
        String authorAvatar;
        int replyCount;
        int viewCount;
        boolean isAnonymous;
        LocalDateTime createdAt;
        LocalDateTime updatedAt;

        MockTopicData(Long id, Long schoolId, String category, String title, String content,
                      String images, Long authorId, String authorName, String authorAvatar,
                      int replyCount, int viewCount, boolean isAnonymous,
                      LocalDateTime createdAt, LocalDateTime updatedAt) {
            this.id = id;
            this.schoolId = schoolId;
            this.category = category;
            this.title = title;
            this.content = content;
            this.images = images;
            this.authorId = authorId;
            this.authorName = authorName;
            this.authorAvatar = authorAvatar;
            this.replyCount = replyCount;
            this.viewCount = viewCount;
            this.isAnonymous = isAnonymous;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }
    }

    record MockReplyData(Long id, Long topicId, Long authorId, String authorName,
                         String authorAvatar, String content, boolean isAnonymous,
                         LocalDateTime createdAt) {}
}