import { describe, expect, it } from "vitest";
import { recommendedEpisodes, durationMinutes, type Episode } from "@/lib/episode";
const episode = (id: string, viewCount?: number, publishedAt = "2026-11-01"): Episode => ({ id, title: id, description: "", duration: "", publishedAt, embeddable: true, viewCount });
describe("episode recommendations", () => {
  it("recommends verified views first, excludes the current video and preserves input", () => {
    const input = [episode("new"), episode("most", 100), episode("current", 500), episode("zero", 0)];
    expect(recommendedEpisodes(input, "current").map(item => item.id)).toEqual(["most", "zero", "new"]);
    expect(input[0].id).toBe("new");
  });
  it("orders equal or missing statistics by publication date", () => {
    expect(recommendedEpisodes([episode("old", undefined, "2026-10-01"), episode("new")])[0].id).toBe("new");
  });
  it("formats hour-long podcast durations without truncating hours", () => {
    expect(durationMinutes("PT1H42M30S")).toBe(102);
    expect(durationMinutes("")).toBe(0);
  });
});
