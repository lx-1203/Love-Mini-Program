package com.campuslove.api.testdata;

import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.AuditStatus;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 帖子测试数据工厂（P7 - Task 7.1.5）。
 *
 * <p>构造 {@link Post} 测试实例，覆盖：</p>
 * <ul>
 *   <li>defaultPost：有效已审核帖子（active + approved）</li>
 *   <li>pendingPost：待审核帖子</li>
 *   <li>rejectedPost：被拒帖子（管理员拒绝）</li>
 *   <li>anonymousPost：匿名分类帖子</li>
 *   <li>popularPost：高点赞数帖子（用于热门排序测试）</li>
 * </ul>
 */
public final class PostFactory {

    private static final AtomicLong SEQ = new AtomicLong(8000L);

    private PostFactory() {
        // 工具类禁止实例化
    }

    /** 创建默认有效帖子（active + approved + 默认分类）。 */
    public static Post defaultPost(Long authorId) {
        Post post = new Post();
        post.setId(SEQ.incrementAndGet());
        post.setAuthorId(authorId);
        post.setContent("这是一条测试帖子内容 #" + SEQ.get());
        post.setImages("[]");
        post.setTags("[]");
        post.setCategory(PostCategory.all);
        post.setLikesCount(0);
        post.setCommentsCount(0);
        post.setShareCount(0);
        post.setStatus(PostStatus.active);
        post.setAuditStatus(AuditStatus.approved);
        post.setCreatedAt(LocalDateTime.now().minusHours(2));
        post.setUpdatedAt(LocalDateTime.now());
        post.setVersion(0L);
        return post;
    }

    /** 创建待审核帖子。 */
    public static Post pendingPost(Long authorId) {
        Post post = defaultPost(authorId);
        post.setAuditStatus(AuditStatus.pending);
        return post;
    }

    /** 创建已拒绝帖子（含拒绝理由）。 */
    public static Post rejectedPost(Long authorId) {
        Post post = defaultPost(authorId);
        post.setAuditStatus(AuditStatus.rejected);
        post.setAuditRemark("内容不符合社区规范");
        post.setAuditorId(999L);
        post.setAuditedAt(LocalDateTime.now());
        return post;
    }

    /** 创建匿名帖子。 */
    public static Post anonymousPost(Long authorId) {
        Post post = defaultPost(authorId);
        post.setCategory(PostCategory.anonymous);
        return post;
    }

    /** 创建热门帖子（高点赞数）。 */
    public static Post popularPost(Long authorId) {
        Post post = defaultPost(authorId);
        post.setLikesCount(999);
        post.setCommentsCount(120);
        post.setShareCount(50);
        return post;
    }

    /** 创建带指定 ID 的帖子（用于显式测试场景）。 */
    public static Post withId(Long id, Long authorId) {
        Post post = defaultPost(authorId);
        post.setId(id);
        return post;
    }
}
