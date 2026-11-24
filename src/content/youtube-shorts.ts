/** Add only approved Shorts. The empty state links to the official channel. */
export type YoutubeShort = { id: string; title: string; embeddable?: boolean };
export const youtubeShorts: YoutubeShort[] = [
  { id: "nkqIhbNKGX8", title: "Short de Sin Anonimato 1" },
  { id: "QDn41D6XRrA", title: "Short de Sin Anonimato 2" },
  { id: "MUCz8n6lCkw", title: "Short de Sin Anonimato 3" },
];
export const shortsChannel = "https://www.youtube.com/@SinAnonimato/shorts";
