import { ArrowUpRight, InstagramLogo } from "@phosphor-icons/react/ssr";
import { getInstagramPostUrl, instagramProfile, type InstagramPost } from "@/content/instagram-reels";
import { StreamReveal } from "@/components/stream-reveal";

function InstagramPostCard({ permalink, title }: { permalink: string; title: string }) {
  return (
    <StreamReveal as="li" className="reel-card" direction="right">
      <div className="reel-video">
        <iframe
          src={`${permalink}embed/`}
          title={`Instagram de Sin Anonimato: ${title}`}
          loading="lazy"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <div className="reel-caption">
        <h3>{title}</h3>
        <a href={permalink} target="_blank" rel="noopener noreferrer" aria-label={`Abrir en Instagram: ${title}`}>
          Abrir en Instagram <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </StreamReveal>
  );
}

export function InstagramReels({ items }: { items: readonly InstagramPost[] }) {
  const posts = Array.from(new Map(items.flatMap(({ url, title }) => {
    const permalink = getInstagramPostUrl(url);
    return permalink ? [[permalink, { permalink, title }] as const] : [];
  })).values());

  return (
    <section id="reels" className="reels-section" aria-labelledby="reels-title">
      <div className="podcast-wrap">
        <div className="reels-heading">
          <div>
            <p className="section-eyebrow">Destacados de Instagram</p>
            <h2 id="reels-title">Momentos de Sin Anonimato</h2>
            <p className="reels-intro">Reels y publicaciones de nuestro perfil oficial, @sinanonimato.cl.</p>
          </div>
          <a className="reels-profile" href={instagramProfile} target="_blank" rel="noopener noreferrer">
            <InstagramLogo size={20} aria-hidden="true" /> Ver perfil oficial <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        {posts.length > 0 ? (
          <ul className="reels-grid" aria-label="Publicaciones destacadas de Instagram" tabIndex={0}>
            {posts.map(post => <InstagramPostCard key={post.permalink} {...post} />)}
          </ul>
        ) : (
          <div className="reels-empty">
            <InstagramLogo size={28} aria-hidden="true" />
            <p>Pronto podrás ver aquí publicaciones de Sin Anonimato.</p>
          </div>
        )}
      </div>
    </section>
  );
}
