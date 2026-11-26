/** Add only approved Shorts. The empty state links to the official channel. */
export type YoutubeShort = { id: string; title: string; embeddable?: boolean };
export const youtubeShorts: YoutubeShort[] = [
  { id: "RwTFPXLQ0co", title: "¿Quién es responsable del desencanto de la política?" },
  { id: "-YaL2bGQ6OI", title: "Luis Gastón muestra su libro a Marcelo Bielsa" },
  { id: "2By86SfLqs0", title: "¿Cómo sobrellevaron la vida en pareja?" },
];

// Previously featured Shorts still belong outside the full-episode catalog.
export const knownYoutubeShortIds = new Set([
  "nkqIhbNKGX8",
  "QDn41D6XRrA",
  "MUCz8n6lCkw",
  ...youtubeShorts.map(({ id }) => id),
]);

export const shortsChannel = "https://www.youtube.com/@SinAnonimato/shorts";
