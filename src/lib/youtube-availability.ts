import type { ScheduledEpisode } from "./episode";

type VideoStatus = {
  id: string;
  status: { privacyStatus: string; embeddable: boolean };
  snippet: { liveBroadcastContent: string };
};

async function playableVideos(ids: string[], apiKey?: string): Promise<Set<string>> {
  if (apiKey) {
    try {
      const query = new URLSearchParams({ id: ids.join(","), part: "status,snippet", fields: "items(id,status(privacyStatus,embeddable),snippet(liveBroadcastContent))" });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${query}`, {
        headers: { "x-goog-api-key": apiKey }, next: { revalidate: 90 }, signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        const { items } = await response.json() as { items: VideoStatus[] };
        return new Set(items.filter(({ status, snippet }) =>
          status.embeddable && ["public", "unlisted"].includes(status.privacyStatus) && snippet.liveBroadcastContent !== "upcoming"
        ).map(video => video.id));
      }
    } catch { /* Fall back to YouTube's public embed metadata. */ }
  }

  const verified = await Promise.all(ids.map(async id => {
    const query = new URLSearchParams({ url: `https://www.youtube.com/watch?v=${id}`, format: "json" });
    try {
      const response = await fetch(`https://www.youtube.com/oembed?${query}`, {
        next: { revalidate: 90 }, signal: AbortSignal.timeout(4000),
      });
      return response.ok && (await response.json()).type === "video" ? id : null;
    } catch { return null; }
  }));
  return new Set(verified.filter(id => id !== null));
}

export async function verifyScheduledAvailability(schedule: ScheduledEpisode[], now = Date.now()) {
  const due = schedule.filter(item => !item.removedAt && Date.parse(item.publishAt) <= now);
  const available = new Set<string>();
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  const batchSize = apiKey ? 50 : 10;
  for (let offset = 0; offset < due.length; offset += batchSize) {
    const ids = due.slice(offset, offset + batchSize).map(item => item.youtubeId);
    for (const id of await playableVideos(ids, apiKey)) available.add(id);
  }
  return schedule.map(item => ({ ...item, available: available.has(item.youtubeId) }));
}
