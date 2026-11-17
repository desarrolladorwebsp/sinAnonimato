export const navItems = [
  { href: "#inicio", label: "Inicio" },
  { href: "/capitulos", label: "Capítulos" },
  { href: "#shorts", label: "YouTube Shorts" },
  { href: "#reels", label: "Instagram" },
  { href: "#auspiciadores", label: "Auspiciadores" },
  { href: "#quienes-somos", label: "Quiénes somos" },
  { href: "#contacto", label: "Contacto" },
] as const;

export const socials = [
  {
    href: "https://www.instagram.com/sinanonimato.cl/",
    platform: "Instagram",
    cue: "Síguenos",
  },
  {
    href: "https://www.facebook.com/profile.php?id=61595175120899",
    platform: "Facebook",
    cue: "Visítanos",
  },
  {
    href: "https://www.youtube.com/@SinAnonimato",
    platform: "YouTube",
    cue: "Míranos",
  },
  {
    href: "https://www.tiktok.com/@sinanonimato.cl",
    platform: "TikTok",
    cue: "Síguenos",
  },
] as const;
