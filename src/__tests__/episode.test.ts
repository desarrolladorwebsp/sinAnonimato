import { describe, expect, it, vi } from "vitest";
import { recommendedEpisodes, durationMinutes, selectCatalogEpisodes, selectCatalogShorts, type Episode, type ScheduledEpisode } from "@/lib/episode";
import { verifyScheduledAvailability } from "@/lib/youtube-availability";
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

  it("keeps a scheduled video out of the site until the exact instant, even if already discovered on YouTube", () => {
    const publishAt = "2026-11-25T22:00:00.000Z";
    const existing = [episode("scheduled", 100, "2026-11-20")];
    const schedule: ScheduledEpisode[] = [{ youtubeId: "scheduled", title: "Capítulo programado", publishAt, format: "chapter", available: true }];
    const publication = Date.parse(publishAt);
    expect(selectCatalogEpisodes(existing, schedule, publication - 1).map(item => item.id)).not.toContain("scheduled");
    const visible = selectCatalogEpisodes(existing, schedule, publication);
    expect(visible[0]).toMatchObject({ id: "scheduled", title: "Capítulo programado", publishedAt: publishAt, viewCount: 100 });
    expect(visible.filter(item => item.id === "scheduled")).toHaveLength(1);
  });

  it("publishes Shorts only in their vertical section and keeps unknown short uploads out of chapters", () => {
    const publishAt = "2026-11-25T22:00:00.000Z";
    const instant = Date.parse(publishAt);
    const uploads = [
      { ...episode("scheduled-short"), duration: "PT45S" },
      { ...episode("ambiguous"), duration: "PT3M" },
      { ...episode("full-length"), duration: "PT3M1S" },
      { ...episode("nkqIhbNKGX8"), duration: "PT10M" },
    ];
    const scheduled: ScheduledEpisode = { youtubeId: "scheduled-short", title: "Short programado", publishAt, format: "short", available: true };
    const chapterIds = selectCatalogEpisodes(uploads, [scheduled], instant).map(item => item.id);
    expect(chapterIds).toContain("full-length");
    expect(chapterIds).not.toContain("ambiguous");
    expect(chapterIds).not.toContain("scheduled-short");
    expect(chapterIds).not.toContain("nkqIhbNKGX8");
    expect(selectCatalogShorts(uploads, [scheduled], instant - 1).map(item => item.id)).not.toContain("scheduled-short");
    expect(selectCatalogShorts(uploads, [scheduled], instant)[0]).toMatchObject({ id: "scheduled-short", title: "Short programado" });
  });

  it("keeps unavailable and withdrawn entries out of both sections or automatic discovery", async () => {
    const publishAt = "2026-11-25T22:00:00.000Z";
    const entries: ScheduledEpisode[] = [
      { youtubeId: "demo-video1", title: "Disponible", publishAt, format: "chapter" },
      { youtubeId: "demo-video2", title: "Privado", publishAt, format: "chapter" },
      { youtubeId: "demo-video3", title: "Estreno futuro", publishAt, format: "short" },
      { youtubeId: "demo-video4", title: "Retirado", publishAt, format: "chapter", removedAt: publishAt },
      { youtubeId: "demo-video5", title: "Sin inserción", publishAt, format: "short" },
    ];
    const response = (id: string, privacyStatus: string, embeddable: boolean, liveBroadcastContent = "none") =>
      ({ id, status: { privacyStatus, embeddable }, snippet: { liveBroadcastContent } });
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [
      response("demo-video1", "unlisted", true), response("demo-video2", "private", true),
      response("demo-video3", "public", true, "upcoming"), response("demo-video5", "public", false),
    ] }));
    vi.stubEnv("YOUTUBE_API_KEY", "ficticio");
    vi.stubGlobal("fetch", fetchMock);
    try {
      const at = Date.parse(publishAt);
      expect((await verifyScheduledAvailability(entries, at - 1)).every(item => !item.available)).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      const checked = await verifyScheduledAvailability(entries, at);
      expect(checked.filter(item => item.available).map(item => item.youtubeId)).toEqual(["demo-video1"]);
      const uploads = entries.map(item => ({ ...episode(item.youtubeId), duration: "PT40M" }));
      expect(selectCatalogEpisodes(uploads, checked, at).map(item => item.id)).toEqual(["demo-video1", "-q6uhzBdQJc", "xNfdDPhmEMU"]);
      expect(selectCatalogShorts(uploads, checked, at).map(item => item.id)).not.toContain("demo-video3");
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });
});
