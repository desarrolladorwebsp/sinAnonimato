import type { Metadata } from "next";
export const siteUrl = "https://www.sinanonimato.cl";
export function publicMetadata(title: string, description: string, path: string, image = "/hero-studio.jpg"): Metadata {
  return {
    title, description, alternates: { canonical: `${siteUrl}${path}` },
    openGraph: { title, description, url: `${siteUrl}${path}`, siteName: "Sin Anonimato", locale: "es_CL", type: "website", images: [{ url: image, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
