import { describe, expect, it } from "vitest";
import { matchFormSchema, quickMatchEntry } from "../config/match-form";

describe("match form schema", () => {
  it("defines topic-first filters with concrete option lists", () => {
    expect(matchFormSchema.sections[0]?.id).toBe("intent");
    expect(matchFormSchema.sections[0]?.fields[0]?.id).toBe("matchIntent");
    expect(matchFormSchema.sections[1]?.fields.some((field) => field.id === "topicIds")).toBe(true);
  });

  it("provides a quick match action beside the regular form", () => {
    expect(quickMatchEntry.id).toBe("quick-match");
    expect(quickMatchEntry.defaultDurationMinutes).toBeGreaterThan(0);
  });
});
