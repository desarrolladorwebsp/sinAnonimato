"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { BrushMark } from "@/components/brush-mark";
import { SocialLinks } from "@/components/social-links";
import { StoryForm } from "@/components/story-form";

export function ContactSection() {
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const active = useInView(section, { amount: 0.15, once: false });
  const introMotion = {
    hidden: { opacity: 1, x: -72 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.14 } },
  } as const;
  const itemMotion = {
    hidden: { opacity: 1, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  } as const;

  return (
    <section ref={section} id="contacto" className="contact-section bg-black px-5 md:px-8">
      <div className="contact-grid mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <motion.div
          className="contact-intro"
          variants={introMotion}
          initial={false}
          animate={reduce || active ? "visible" : "hidden"}
        >
          <motion.div variants={itemMotion}>
            <p className="section-eyebrow flex items-center gap-3">
              Contáctanos
              <span className="h-px w-10 bg-accent" aria-hidden="true" />
            </p>
          </motion.div>
          <motion.div variants={itemMotion}>
            <h2
              aria-label="Envíanos tu caso"
              className="contact-title mt-5 font-black uppercase"
            >
              <span className="block">Envíanos</span>
              <BrushMark active={active} className="mt-2">
                Tu caso
              </BrushMark>
            </h2>
          </motion.div>
          <motion.div variants={itemMotion}>
            <p className="contact-copy mt-7 max-w-sm text-base leading-relaxed text-white/75">
              Si tienes una historia que contar, queremos escucharte.
            </p>
          </motion.div>
          <motion.div variants={itemMotion}>
            <div className="mt-9">
              <SocialLinks variant="cues" />
            </div>
          </motion.div>
        </motion.div>
        <motion.div
          initial={false}
          animate={reduce || active ? { opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1 } : { opacity: 1, x: 64, y: 0, rotateX: 2, scale: 0.99 }}
          transition={{ duration: reduce ? 0 : 0.9, delay: active ? 0.18 : 0, ease: [0.16, 1, 0.3, 1] }}
        >
          <StoryForm />
        </motion.div>
      </div>
    </section>
  );
}
