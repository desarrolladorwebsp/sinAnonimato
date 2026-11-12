import { ArrowUpRight, YoutubeLogo } from "@phosphor-icons/react/ssr";
import { youtubeShorts, shortsChannel } from "@/content/youtube-shorts";
import { StreamReveal } from "./stream-reveal";
export function YoutubeShorts() {
  const shorts = youtubeShorts.filter(short => /^[\w-]{11}$/.test(short.id));
  return <section id="shorts" className="shorts-section podcast-wrap" aria-labelledby="shorts-title">
    <div className="reels-heading"><div><p className="section-eyebrow">En formato breve</p><h2 id="shorts-title">Historias en pocos minutos.</h2><p className="reels-intro">Otra forma de encontrarnos. Descubre Sin Anonimato en YouTube Shorts.</p></div>
      <a className="reels-profile" href={shortsChannel} target="_blank" rel="noopener noreferrer"><YoutubeLogo size={20} /> Ver Shorts <ArrowUpRight size={16} /></a></div>
    {shorts.length > 0 ? <ul className="reels-grid" aria-label="YouTube Shorts" tabIndex={0}>{shorts.map((short, index) => <StreamReveal as="li" key={short.id} index={index} direction={index % 2 ? "right" : "left"} className="reel-card"><div className="reel-video"><iframe src={`https://www.youtube-nocookie.com/embed/${short.id}?playsinline=1&rel=0`} title={short.title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div><div className="reel-caption"><h3>{short.title}</h3></div></StreamReveal>)}</ul> :
      <a className="shorts-channel-card" href={shortsChannel} target="_blank" rel="noopener noreferrer"><span className="shorts-symbol" aria-hidden="true"><YoutubeLogo weight="fill" size={54} /></span><span><strong>Un momento. Una historia.</strong><span>Explora nuestro canal de Shorts</span></span><ArrowUpRight size={28} aria-hidden="true" /></a>}
  </section>;
}
