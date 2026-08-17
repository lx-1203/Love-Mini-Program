package com.campuslove.api.chat;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * 关系建议动作生成服务。
 */
@Service
public class SuggestedActionService {

    public SuggestedActionView build(Long peerUserId, LocalDateTime lastInteractionTime,
                                     List<String> commonInterests, int commonActivities,
                                     int profileViewCount) {
        LocalDateTime now = LocalDateTime.now();
        if (lastInteractionTime == null || lastInteractionTime.isBefore(now.minusHours(48))) {
            return new SuggestedActionView("reply", "发一句问候", null,
                    "lastInteractionStale");
        }
        if (!commonInterests.isEmpty() && commonActivities == 0) {
            return new SuggestedActionView("invite", "邀请参加一场共同兴趣活动",
                    "/subpackages/discover/activities/index", "commonInterestWithoutActivity");
        }
        if (profileViewCount == 0) {
            return new SuggestedActionView("view_profile", "看看 TA 最新动态",
                    "/pages/profile/other?userId=" + peerUserId, "noProfileView");
        }
        String replyText = commonInterests.isEmpty()
                ? "继续聊天"
                : "一起聊聊" + commonInterests.get(0) + "？";
        return new SuggestedActionView("reply", replyText, null, "keepChatting");
    }
}
