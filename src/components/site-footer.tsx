import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SocialLinks } from "@/components/social-links";
import { navItems } from "@/content/site";

import studioLogo from "../../public/images/smartstudio-footer.webp";

export function SiteFooter({ innerPage = false }: { innerPage?: boolean }) {

  return (
    <footer id="comunidad" className="site-footer bg-black px-5 md:px-8">
      <div
        className="footer-main mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(22rem,1.1fr)] lg:items-center"
      >
        <div>
          <Logo variant="footer" href={innerPage ? "/#inicio" : undefined} />
          <p className="mt-6 max-w-[20rem] text-sm leading-relaxed font-medium tracking-[0.08em] text-white/70 uppercase">
            Historias reales. Voces que importan.
          </p>
        </div>
        <nav aria-label="Pie" className="grid grid-cols-2 gap-x-5 gap-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={innerPage && item.href.startsWith("#") ? `/${item.href}` : item.href}
              className="footer-nav-link py-1 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/politica-de-privacidad"
            className="footer-nav-link py-1 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition-colors hover:text-white"
          >
            Política de privacidad
          </Link>
        </nav>
        <div>
          <p className="section-eyebrow text-white/65">
            Síguenos en
          </p>
          <div className="mt-5">
            <SocialLinks variant="names" />
          </div>
        </div>
      </div>
      <div
        className="footer-legal mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-[10px] leading-relaxed tracking-[0.08em] text-white/60 uppercase"
      >
        <p className="normal-case">Copyright © 2026 Sin Anonimato. Todos los derechos reservados.</p>
        <div className="flex items-center gap-3 normal-case">
          <span className="text-xs text-white/65">Creado por</span>
          <a
            href="https://smartstudio.cl/"
            className="inline-flex min-h-11 items-center rounded-sm transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Image src={studioLogo} alt="SmartStudio by Smart Pro" unoptimized className="h-auto w-[8.5rem] sm:w-[9.5rem]" />
          </a>
        </div>
        <p className="flex flex-wrap gap-3">
          <a href={innerPage ? "/#contacto" : "#contacto"}>Contacto</a>
          <span aria-hidden="true">|</span>
          <a href="/admin/autorizaciones" className="rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Admin</a>
        </p>
      </div>
    </footer>
  );
}
