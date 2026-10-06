"use client";

import { motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/logo";
import { SocialLinks } from "@/components/social-links";
import { navItems } from "@/content/site";

export function SiteFooter() {
  const reduce = useReducedMotion();

  return (
    <footer id="comunidad" className="site-footer bg-black px-5 md:px-8">
      <motion.div
        className="footer-main mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1.2fr_0.8fr_1fr] md:items-center"
        initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: false, amount: 0.25 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <Logo variant="footer" />
          <p className="mt-6 max-w-[20rem] text-sm leading-relaxed font-medium tracking-[0.08em] text-white/70 uppercase">
            Historias reales. Voces que importan.
          </p>
        </div>
        <nav aria-label="Pie" className="flex flex-col gap-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="footer-nav-link py-1 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div>
          <p className="section-eyebrow text-white/65">
            Síguenos en
          </p>
          <div className="mt-5">
            <SocialLinks variant="names" />
          </div>
        </div>
      </motion.div>
      <motion.div
        className="footer-legal mx-auto flex w-full max-w-6xl flex-col gap-4 border-t border-white/15 pt-6 text-[10px] leading-relaxed tracking-[0.08em] text-white/60 uppercase md:flex-row md:items-center md:justify-between"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.4 }}
        transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        <p>© 2025 Sin Anonimato · Live. Todos los derechos reservados.</p>
        <p className="flex gap-3">
          <a href="#contacto">Política de privacidad</a>
          <span aria-hidden="true">|</span>
          <a href="#contacto">Términos y condiciones</a>
        </p>
      </motion.div>
    </footer>
  );
}
