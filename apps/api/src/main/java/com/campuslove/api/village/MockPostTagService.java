package com.campuslove.api.village;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 帖子话题标签服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟数据。
 */
@Profile("mock")
@Service
public class MockPostTagService implements PostTagService {

    /**
     * 预置话题标签列表。
     */
    private static final List<String> PRESET_TAGS = List.of(
            "校园日常", "兴趣分享", "找搭子", "求助",
            "表白墙", "校友动态", "生活记录", "技术交流"
    );

    private final AtomicLong postIdGen = new AtomicLong(2000);

    private final List<MockTaggedPost> taggedPosts = new ArrayList<>();

    public MockPostTagService() {
        initMockTaggedPosts();
    }

    @Override
    public List<String> getTags() {
        return PRESET_TAGS;
    }

    @Override
    public List<PostSummaryView> getPostsByTag(String tagName, int page, int size) {
        if (tagName == null || tagName.isBlank()) {
            return List.of();
        }

        List<MockTaggedPost> filtered = taggedPosts.stream()
                .filter(p -> p.tags != null && p.tags.stream()
                        .anyMatch(t -> t.contains(tagName)))
                .toList();

        int from = page * size;
        int to = Math.min(from + size, filtered.size());
        List<MockTaggedPost> pageItems = from < filtered.size()
                ? filtered.subList(from, to) : List.of();

        return pageItems.stream()
                .map(p -> new PostSummaryView(
                        p.id,
                        null,
                        truncate(p.content, 120),
                        new PostAuthorView(p.authorId, p.authorName, null, p.authorCampus),
                        p.category,
                        p.tags == null ? List.of() : p.tags,
                        p.likesCount,
                        p.commentsCount,
                        p.shareCount,
                        p.createdAt.toString(),
                        p.likesCount >= 50,
                        false
                ))
                .toList();
    }

    private void initMockTaggedPosts() {
        taggedPosts.add(new MockTaggedPost(
                2001L, "今天在图书馆遇到一个认真学习的女生，感觉好有气质！",
                List.of("校园日常", "表白墙"), "sincere",
                32, 8, 3, 1002L, "林安", "南校区",
                LocalDateTime.now().minusHours(1)
        ));
        taggedPosts.add(new MockTaggedPost(
                2002L, "有没有一起打羽毛球的？周末约起来！求搭子！",
                List.of("找搭子", "兴趣分享"), "interest",
                18, 12, 4, 1003L, "周沐", "北校区",
                LocalDateTime.now().minusHours(3)
        ));
        taggedPosts.add(new MockTaggedPost(
                2003L, "急！计算机组成原理期末怎么复习？求大佬带带",
                List.of("求助", "技术交流"), "help",
                45, 23, 6, 1004L, "许诺", "东校区",
                LocalDateTime.now().minusHours(5)
        ));
        taggedPosts.add(new MockTaggedPost(
                2004L, "毕业5年了，想问问学弟学妹们学校现在变化大吗？",
                List.of("校友动态", "生活记录"), "sincere",
                67, 19, 10, 1005L, "北岛", "南校区",
                LocalDateTime.now().minusDays(1)
        ));
        taggedPosts.add(new MockTaggedPost(
                2005L, "记录一下今天在食堂吃到的好吃的！麻辣香锅绝了",
                List.of("生活记录", "校园日常"), "life",
                23, 5, 2, 1006L, "南风", "北校区",
                LocalDateTime.now().minusDays(1).minusHours(3)
        ));
        taggedPosts.add(new MockTaggedPost(
                2006L, "想找个一起刷 LeetCode 的队友，每天互相监督",
                List.of("技术交流", "找搭子"), "interest",
                15, 7, 3, 1007L, "橙子", "东校区",
                LocalDateTime.now().minusDays(2)
        ));
    }

    private static String truncate(String text, int maxLen) {
        if (text == null) return null;
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }

    static class MockTaggedPost {
        Long id;
        String content;
        List<String> tags;
        String category;
        int likesCount;
        int commentsCount;
        int shareCount;
        Long authorId;
        String authorName;
        String authorCampus;
        LocalDateTime createdAt;

        MockTaggedPost(Long id, String content, List<String> tags, String category,
                       int likesCount, int commentsCount, int shareCount,
                       Long authorId, String authorName, String authorCampus,
                       LocalDateTime createdAt) {
            this.id = id;
            this.content = content;
            this.tags = tags;
            this.category = category;
            this.likesCount = likesCount;
            this.commentsCount = commentsCount;
            this.shareCount = shareCount;
            this.authorId = authorId;
            this.authorName = authorName;
            this.authorCampus = authorCampus;
            this.createdAt = createdAt;
        }
    }
}