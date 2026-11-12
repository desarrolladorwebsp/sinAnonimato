import type { MetadataRoute } from "next";
import { getEpisodes } from "@/lib/podcast";
import { siteUrl } from "@/lib/seo";
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const episodes = await getEpisodes();
  return ["/", "/capitulos", "/politica-de-privacidad"].map(path => ({ url: `${siteUrl}${path}` })).concat(
    episodes.map(episode => ({ url: `${siteUrl}/capitulos/${episode.id}` }))
  );
}
