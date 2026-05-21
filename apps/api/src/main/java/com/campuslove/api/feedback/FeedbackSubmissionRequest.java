package com.campuslove.api.feedback;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record FeedbackSubmissionRequest(
    @NotBlank String title,
    @NotBlank String content,
    String contactWechat,
    List<String> attachments,
    String expectedCity,
    String expectedCampus
) {
}
