import Link from "next/link";
export function AboutSection() {
  return <section id="quienes-somos" className="about-section podcast-wrap" aria-labelledby="about-title">
    <div><p className="section-eyebrow">Quiénes somos</p><h2 id="about-title">Historias reales.<br />Voces que importan.</h2></div>
    <div><p>Sin Anonimato es un podcast de conversaciones e historias de vida. Un espacio para escuchar, mirar de cerca y dar voz a experiencias que merecen ser compartidas.</p>
      <p>Puedes ver los capítulos completos aquí, con el reproductor de YouTube, o descubrirlos en nuestro canal oficial.</p>
      <Link className="editorial-link" href="/capitulos">Explorar los capítulos <span aria-hidden="true">→</span></Link>
    </div>
  </section>;
}
