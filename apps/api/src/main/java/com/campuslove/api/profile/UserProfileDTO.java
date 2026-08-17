package com.campuslove.api.profile;

import java.util.List;

/**
 * 个人主页统一契约。新个人主页只消费本 DTO，避免继续扩散 recommended/profile/stats 散字段。
 */
public record UserProfileDTO(
        Long id,
        Basic basic,
        Identity identity,
        Intro intro,
        Relationship relationship,
        Media media,
        ProfileSocialProofView socialProof,
        Relation relation,
        List<Post> posts,
        List<Story> stories,
        List<String> circles,
        String state
) {
    public record Basic(String name, String avatar, Integer age, String location, String gender) {}
    public record Identity(boolean verified, boolean student, String mbti, List<String> personality) {}
    public record Intro(String bio, List<String> tags) {}
    public record Relationship(String goal, List<String> expectation) {}
    public record Media(String cover, List<String> photos, List<String> videos, String voiceIntro) {}
    public record Relation(
            boolean liked,
            boolean matched,
            boolean chatted,
            boolean blocked,
            int matchScore,
            List<String> matchReasons,
            List<String> commonInterests) {}
    public record Post(String id, String content, List<String> images, long likes, long comments, String createdAt) {}
    public record Story(String id, String cover, String title, String location, String dateText) {}
}
