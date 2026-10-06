"use client";

import { List, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { navItems } from "@/content/site";
import { Logo } from "@/components/logo";
import { SocialLinks } from "@/components/social-links";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#inicio");

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(`#${visible.target.id}`);
    }, { rootMargin: "-80px 0px 0px 0px", threshold: [0.25, 0.5, 0.75] });
    document.querySelectorAll("main > section, footer[id]").forEach((section) => observer.observe(section));
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => { observer.disconnect(); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  return (
    <header className="site-header sticky top-0 z-20 bg-black/90 backdrop-blur-md">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-5 md:px-8">
        <Logo />
        <nav className="col-start-2 hidden items-center justify-center gap-6 lg:flex" aria-label="Principal">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.href === active ? "location" : undefined}
              className="site-nav-link"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="col-start-3 flex items-center justify-end">
          <div className="hidden lg:block">
            <SocialLinks variant="header" />
          </div>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white lg:hidden"
          aria-expanded={open}
          aria-controls="menu-movil"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
        </button>
        </div>
      </div>
      {open ? (
        <div id="menu-movil" className="mobile-menu absolute inset-x-0 top-full border-t border-white/10 bg-black px-5 py-6 lg:hidden">
          <nav className="flex flex-col gap-4" aria-label="Móvil">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={item.href === active ? "location" : undefined}
                className="site-nav-link py-2 text-sm"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-6">
            <SocialLinks variant="header" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
