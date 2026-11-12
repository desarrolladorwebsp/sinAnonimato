export type Episode = {
  id: string;
  title: string;
  description: string;
  duration: string;
  publishedAt: string;
  embeddable: boolean;
  viewCount?: number;
  thumbnailSize?: "maxresdefault" | "sddefault" | "hqdefault" | "mqdefault";
};


/** Unknown statistics never rank ahead of verified counts. Keep newest order for ties. */
export function recommendedEpisodes(episodes: Episode[], excludeId?: string) {
  return episodes.filter(episode => episode.id !== excludeId).sort((a, b) =>
    (b.viewCount ?? -1) - (a.viewCount ?? -1) || b.publishedAt.localeCompare(a.publishedAt));
}
export function durationMinutes(duration: string) {
  const time = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  return Number(time?.[1] ?? 0) * 60 + Number(time?.[2] ?? 0);
}
