package com.campuslove.api.feedback;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record FeedbackSubmissionRequest(
    @NotBlank @Size(max = 100) String title,
    @NotBlank @Size(max = 5000) String content,
    @Size(max = 64) String contactWechat,
    List<String> attachments,
    @Size(max = 32) String expectedCity,
    @Size(max = 64) String expectedCampus
) {
}
