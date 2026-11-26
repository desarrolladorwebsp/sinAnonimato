export const instagramProfile = "https://www.instagram.com/sinanonimato.cl/";

export type InstagramPost = {
  url: string;
  title: string;
};

// Publicaciones del perfil oficial, de la más reciente a la más antigua.
export const featuredInstagramPosts: readonly InstagramPost[] = [
  { url: "https://www.instagram.com/reel/DgLMf3bgQEx/", title: "Reel del 25 de noviembre" },
  { url: "https://www.instagram.com/reel/DgI6zqBhlbP/", title: "Reel del 24 de noviembre" },
  { url: "https://www.instagram.com/reel/Df8KK7ngOMr/", title: "Reel del 19 de noviembre" },
];

export function getInstagramPostUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.host) || url.username || url.password) return null;
    const match = /^\/(?:[\w.]+\/)?(p|reels?)\/([\w-]+)\/?$/.exec(url.pathname);
    if (!match) return null;
    const [, kind, code] = match;
    return `https://www.instagram.com/${kind === "p" ? "p" : "reel"}/${code}/`;
  } catch {
    return null;
  }
}
