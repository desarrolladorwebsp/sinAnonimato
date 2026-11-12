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
          initial={reduce ? false : { opacity: 0, x: -36, skewX: 5 }}
          animate={reduce || active ? { opacity: 1, x: 0, skewX: 0 } : { opacity: 0, x: -36, skewX: 5 }}
          transition={{ duration: 0.8, delay: active ? 0.34 : 0, ease }}
        >
          Tu historia puede hacer la diferencia
        </motion.p>
        <motion.p
          className="hero-copy mt-5 max-w-xl text-white/75"
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
          animate={reduce || active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.85, delay: active ? 0.56 : 0, ease }}
        >
          Un espacio para escuchar, visibilizar y dar voz a las historias que importan.
        </motion.p>
        <motion.a
          href="#contacto"
          className="editorial-link hero-cta mt-8"
          initial={reduce ? false : { opacity: 0, y: 22, scale: 0.94 }}
          animate={reduce || active ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 22, scale: 0.94 }}
          whileHover={reduce ? undefined : { scale: 1.045, y: -3 }}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={{ duration: 0.7, delay: active ? 0.78 : 0, ease }}
        >
          Cuéntanos tu historia <ArrowUpRight size={20} aria-hidden="true" />
        </motion.a>
      </div>
    </section>
  );
}
