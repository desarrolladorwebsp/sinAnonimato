"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
  index?: number;
  direction?: "left" | "right";
};

export function StreamReveal({ children, className = "", as = "div", index = 0, direction = "left" }: RevealProps) {
  const reducedMotion = useReducedMotion();
  const Element = as === "li" ? motion.li : motion.div;

  return (
    <Element
      className={`stream-reveal ${className}`}
      initial={false}
      whileInView={reducedMotion ? undefined : { opacity: [0.35, 1], x: [direction === "left" ? -64 : 64, 0] }}
      viewport={{ once: false, amount: 0.12 }}
      transition={{ duration: reducedMotion ? 0 : 0.72, delay: reducedMotion ? 0 : Math.min(index, 4) * 0.065, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Element>
  );
}
