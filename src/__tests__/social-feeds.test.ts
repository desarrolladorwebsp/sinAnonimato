import { afterEach, describe, expect, it, vi } from "vitest";

import { featuredInstagramPosts } from "@/content/instagram-reels";
import { selectCatalogShorts, type ScheduledEpisode } from "@/lib/episode";
import { fetchInstagramReels, fetchYoutubeShorts, getLatestInstagramReels, getLatestYoutubeShorts } from "@/lib/social-feeds";

vi.mock("next/cache", () => ({ unstable_cache: (callback: () => unknown) => callback }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const youtubeChannelId = "UCzUz2nb8y5Qsysm2qMEDs_A";
const credentials = { clientId: "test-client", clientSecret: "test-secret", refreshToken: "test-refresh" };
const youtubeVideo = (id: string, day: number) => ({
  id,
  snippet: { channelId: youtubeChannelId, title: id, publishedAt: `2026-11-${day}T20:00:00Z`, liveBroadcastContent: "none" },
  status: { privacyStatus: "public", embeddable: true },
  contentDetails: { duration: "PT3M" },
  fileDetails: { videoStreams: [{ widthPixels: 1080, heightPixels: 1920, rotation: "none", aspectRatio: 0.5625 }] },
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("YouTube Shorts automáticos", () => {
  it("solo toma videos públicos cortos cuadrados o verticales del canal y aplica el calendario", async () => {
    const horizontal = youtubeVideo("horizontal1", 26);
    const square = youtubeVideo("square00001", 25);
    const rotated = youtubeVideo("rotated0001", 24);
    const withheld = youtubeVideo("withheld001", 26);
    const scheduled = youtubeVideo("schedule001", 21);
    const privateVideo = youtubeVideo("private0001", 26);
    const long = youtubeVideo("long0000001", 26);
    const upcoming = youtubeVideo("upcoming001", 26);
    const noDetails = youtubeVideo("nodetails01", 26);
    horizontal.fileDetails.videoStreams[0] = { widthPixels: 1920, heightPixels: 1080, rotation: "none", aspectRatio: 16 / 9 };
    square.fileDetails.videoStreams[0] = { widthPixels: 1080, heightPixels: 1080, rotation: "none", aspectRatio: 1 };
    rotated.fileDetails.videoStreams[0] = { widthPixels: 1920, heightPixels: 1080, rotation: "clockwise", aspectRatio: 16 / 9 };
    privateVideo.status.privacyStatus = "private";
    long.contentDetails.duration = "PT3M1S";
    upcoming.snippet.liveBroadcastContent = "upcoming";
    noDetails.fileDetails.videoStreams = [];
    const videos = [horizontal, rotated, withheld, privateVideo, long, upcoming, noDetails, scheduled, square, youtubeVideo("vertical001", 23)];
    const fetchMock = vi.fn<(input: string | URL, init: RequestInit) => Promise<Response>>(async input => {
      const url = new URL(input);
      if (url.hostname === "oauth2.googleapis.com") return Response.json({ access_token: "test-access" });
      if (url.pathname.endsWith("/channels")) return Response.json({ items: [{ id: youtubeChannelId, contentDetails: { relatedPlaylists: { uploads: "official-uploads" } } }] });
      if (url.pathname.endsWith("/playlistItems")) return Response.json({ items: videos.map(({ id }) => ({ contentDetails: { videoId: id } })) });
      return Response.json({ items: videos });
    });
    vi.stubGlobal("fetch", fetchMock);
    const selection = await fetchYoutubeShorts(credentials);
    expect(selection.map(({ id }) => id)).toEqual(["withheld001", "square00001", "rotated0001", "vertical001", "schedule001"]);
    const [, tokenRequest] = fetchMock.mock.calls[0];
    expect(tokenRequest.method).toBe("POST");
    expect((tokenRequest.body as URLSearchParams).get("grant_type")).toBe("refresh_token");
    expect(fetchMock.mock.calls.slice(1).map(([input, init]) => [
      new URL(input).hostname, new Headers(init.headers).get("Authorization"),
    ])).toEqual(Array(3).fill(["www.googleapis.com", "Bearer test-access"]));
    const schedule: ScheduledEpisode[] = [
      { youtubeId: "withheld001", title: "Futuro", publishAt: "2026-11-27T20:00:00Z", format: "short", available: true },
      { youtubeId: "schedule001", title: "Estreno", publishAt: "2026-11-26T10:00:00Z", format: "short", available: true },
    ];
    expect(selectCatalogShorts([], schedule, Date.parse("2026-11-26T22:00:00Z"), selection).map(({ id }) => id))
      .toEqual(["schedule001", "square00001", "rotated0001"]);
  });

  it("rechaza credenciales asociadas a otro canal", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: "test-access" }))
      .mockResolvedValueOnce(Response.json({ items: [{ id: "another-channel" }] })));
    await expect(fetchYoutubeShorts(credentials)).rejects.toThrow("no corresponde al canal");
  });
});

describe("Instagram Reels automáticos", () => {
  it("recorre las páginas hasta encontrar tres Reels válidos y los ordena por fecha", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ username: "sinanonimato.cl" }))
      .mockResolvedValueOnce(Response.json({ data: [
        { media_product_type: "FEED", permalink: "https://www.instagram.com/p/Photo/", timestamp: "2026-11-26T20:00:00Z" },
        { media_product_type: "REELS", permalink: "https://www.instagram.com/reel/First/", timestamp: "2026-11-25T20:00:00Z" },
      ], paging: { next: "https://untrusted.test/never-request", cursors: { after: "next-page" } } }))
      .mockResolvedValueOnce(Response.json({ data: [
        { media_product_type: "REELS", permalink: "https://www.instagram.com/reel/Third/", timestamp: "2026-11-19T20:00:00Z" },
        { media_product_type: "REELS", permalink: "https://www.instagram.com/sinanonimato.cl/reel/Second/?igsh=example", timestamp: "2026-11-25T01:00:00Z" },
        { media_product_type: "REELS", permalink: "https://untrusted.test/reel/Unknown/", timestamp: "2026-11-26T20:00:00Z" },
      ] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchInstagramReels("12345", "test-access")).resolves.toEqual([
      { url: "https://www.instagram.com/reel/First/", title: "Reel del 25 de noviembre" },
      { url: "https://www.instagram.com/reel/Second/", title: "Reel del 24 de noviembre" },
      { url: "https://www.instagram.com/reel/Third/", title: "Reel del 19 de noviembre" },
    ]);
    const [lastUrl, config] = fetchMock.mock.calls[2];
    expect(lastUrl.hostname).toBe("graph.facebook.com");
    expect(lastUrl.searchParams.get("after")).toBe("next-page");
    expect(lastUrl.searchParams.has("access_token")).toBe(false);
    expect(new Headers(config.headers).get("Authorization")).toBe("Bearer test-access");
  });

  it("conserva la selección de respaldo cuando la API falla o faltan credenciales", async () => {
    vi.stubEnv("YOUTUBE_SHORTS_CLIENT_ID", "");
    vi.stubEnv("INSTAGRAM_REELS_ACCOUNT_ID", "12345");
    vi.stubEnv("INSTAGRAM_REELS_ACCESS_TOKEN", "test-access");
    vi.stubEnv("STATIC_EXPORT", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(getLatestYoutubeShorts()).resolves.toBeNull();
    await expect(getLatestInstagramReels()).resolves.toEqual(featuredInstagramPosts);
  });
});
