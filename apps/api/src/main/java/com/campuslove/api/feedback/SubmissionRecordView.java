package com.campuslove.api.feedback;

public record SubmissionRecordView(
    long id,
    FeedbackTicketType type,
    String title,
    SubmissionStatus status,
    String latestReplySummary,
    String submittedAt,
    Long convertedActivityId
) {
}
