package com.campuslove.api.village;

import com.campuslove.api.content.ContentMentionService;
import com.campuslove.api.entity.ContentMention;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 发帖 @提及：2026-10-28 起复用统一表 content_mentions（旧表 post_mentions 仅保留回填）。
 */
@Profile("real")
@Service
public class PostMentionService {

    private final ContentMentionService contentMentionService;

    public PostMentionService(ContentMentionService contentMentionService) {
        this.contentMentionService = contentMentionService;
    }

    @Transactional
    public void saveMentions(Long postId, Long authorId, List<Long> mentionedUserIds) {
        contentMentionService.saveMentions(
                ContentMention.TARGET_POST, postId, authorId, null, mentionedUserIds);
    }

    /** 帖子审核通过后调用；已通知过的不重复发。 */
    @Transactional
    public void notifyMentions(Long postId, Long authorId) {
        contentMentionService.notifyMentions(
                ContentMention.TARGET_POST, postId, authorId, "post", postId);
    }
}
