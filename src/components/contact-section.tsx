"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { BrushMark } from "@/components/brush-mark";
import { SocialLinks } from "@/components/social-links";
import { StoryForm } from "@/components/story-form";

export function ContactSection() {
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const active = useInView(section, { amount: 0.25 });

  return (
    <section ref={section} id="contacto" className="contact-section bg-black px-5 md:px-8">
      <div className="contact-grid mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
        <div className="contact-intro">
          <p className="section-eyebrow flex items-center gap-3">
            Contáctanos
            <span className="h-px w-10 bg-accent" aria-hidden="true" />
          </p>
          <h2
            aria-label="Envíanos tu caso"
            className="contact-title mt-5 font-black uppercase"
          >
            <span className="block">Envíanos</span>
            <BrushMark active={active} className="mt-2">
              Tu caso
            </BrushMark>
          </h2>
          <p className="contact-copy mt-7 max-w-sm text-base leading-relaxed text-white/75">
            Si tienes una historia que contar, queremos escucharte.
          </p>
          <div className="mt-9">
            <SocialLinks variant="cues" />
          </div>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={reduce || active ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 24, filter: "blur(6px)" }}
          transition={{ duration: reduce ? 0 : 0.65, delay: active ? 0.12 : 0, ease: [0.16, 1, 0.3, 1] }}
        >
          <StoryForm />
        </motion.div>
      </div>
    </section>
  );
}
