export const instagramProfile = "https://www.instagram.com/sinanonimato.cl/";

type InstagramPost = {
  url: string;
  title: string;
};

// Publicaciones destacadas del perfil oficial, en el orden de aparición.
export const featuredInstagramPosts: readonly InstagramPost[] = [
  { url: "https://www.instagram.com/sinanonimato.cl/reel/DfiDp1qgyKN/", title: "Reel del 9 de noviembre" },
  { url: "https://www.instagram.com/sinanonimato.cl/reel/DfH2_JyRgDg/", title: "Reel del 30 de octubre" },
  { url: "https://www.instagram.com/p/DfkWVoGAQo0/", title: "Publicación destacada" },
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
