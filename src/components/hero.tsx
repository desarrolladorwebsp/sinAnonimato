"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import Image from "next/image";
import { BrushMark } from "@/components/brush-mark";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const active = useInView(section, { amount: 0.3 });

  return (
    <section ref={section} id="inicio" className="hero-section relative">
      <Image
        src="/hero-studio.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="hero-shade pointer-events-none absolute inset-0" />
      <div className="hero-content relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="hero-title">
          <BrushMark active={active}>Próximamente</BrushMark>
        </h1>
        <motion.p
          className="hero-kicker mt-8 max-w-3xl font-semibold uppercase"
          initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(5px)" }}
          animate={reduce || active ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 10, filter: "blur(5px)" }}
          transition={{ duration: 0.7, delay: active ? 0.6 : 0, ease }}
        >
          Tu historia puede hacer la diferencia
        </motion.p>
        <motion.p
          className="hero-copy mt-5 max-w-xl text-white/75"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce || active ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.7, delay: active ? 0.85 : 0, ease }}
        >
          Un espacio para escuchar, visibilizar y dar voz a las historias que importan.
        </motion.p>
        <motion.a
          href="#contacto"
          className="editorial-link hero-cta mt-8"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce || active ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.6, delay: active ? 1.05 : 0, ease }}
        >
          Cuéntanos tu historia <ArrowUpRight size={20} aria-hidden="true" />
        </motion.a>
      </div>
    </section>
  );
}
