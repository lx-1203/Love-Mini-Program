import { describe, expect, it } from "vitest";
import { resolveNotificationTarget } from "../../utils/notification-target";
import { ROUTES } from "../../constants/routes";

describe("notification target", () => {
  it("routes topic notifications to topic detail", () => {
    expect(resolveNotificationTarget({ type: "topic_like", referenceType: "topic", referenceId: "49" }))
      .toBe(`${ROUTES.CIRCLES.TOPIC_DETAIL}?topicId=49`);
  });

  it("accepts SystemNotification.resourceId (backend referenceId mapping)", () => {
    expect(resolveNotificationTarget({ type: "topic_like", referenceType: "topic", resourceId: "49" }))
      .toBe(`${ROUTES.CIRCLES.TOPIC_DETAIL}?topicId=49`);
  });

  it("routes reply mentions (referenceType=comment) to topic detail", () => {
    expect(resolveNotificationTarget({ type: "mention", referenceType: "comment", referenceId: "49" }))
      .toBe(`${ROUTES.CIRCLES.TOPIC_DETAIL}?topicId=49`);
  });

  it("routes post notifications to village detail", () => {
    expect(resolveNotificationTarget({ type: "like", referenceType: "post", referenceId: "428" }))
      .toBe(`${ROUTES.VILLAGE.DETAIL}?id=428`);
  });

  it("routes likes/visitors without reference to likes-visitors page", () => {
    expect(resolveNotificationTarget({ type: "visitor", referenceType: null, referenceId: null }))
      .toBe(ROUTES.LIKES.VISITORS_LIKES);
  });

  it("returns null for notifications without a safe target", () => {
    expect(resolveNotificationTarget({ type: "mention", referenceType: "user", referenceId: "1" }))
      .toBeNull();
  });
});
