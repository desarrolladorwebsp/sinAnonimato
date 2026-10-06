"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

type BrushMarkProps = {
  children: string;
  className?: string;
  active?: boolean;
};

const stroke =
  "M18 57 Q32 51 50 51 C87 51 106 46 145 47 L205 48 254 45 310 48 367 46 421 49 476 46 533 49 591 46 650 48 706 45 752 49 Q773 50 789 57 L778 65 795 72 779 79 789 86 Q775 96 752 98 L704 96 653 101 599 98 545 102 489 98 431 102 376 98 320 102 263 98 208 102 151 98 98 102 55 97 Q30 94 13 86 L31 78 9 72 30 65Z";

const highlight =
  "M80 56 Q139 52 194 55 L268 53 344 56 420 53 495 56 569 53 644 56 713 55 755 58 710 64 653 62 590 66 523 63 460 67 395 64 328 67 265 64 199 67 142 63 98 65Z";

export function BrushMark({ children, className = "", active }: BrushMarkProps) {
  const filterId = `brush-${useId().replace(/:/g, "")}`;
  const grainId = `${filterId}-grain`;
  const reduce = useReducedMotion();
  const letters = Array.from(children);

  return (
    <span className={`brush-mark relative inline-block whitespace-nowrap px-12 py-3 ${className}`}>
      <span
        aria-hidden="true"
        className="brush-mark-paint pointer-events-none absolute top-1/2 left-1/2 h-[185%] w-[114%] -translate-x-1/2 -translate-y-[58%] -rotate-1"
      >
      <svg aria-hidden="true" viewBox="0 0 800 160" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <pattern id={grainId} width="126" height="58" patternUnits="userSpaceOnUse">
          <g fill="#4b080b" opacity="0.48">
              <path d="m4 8 12-2-6 4-9 1zm22 18 7-3-2 5-8 2zm17-15 4-1-2 3-5 1zm24 39 12-2-7 4-8 1zm10-32 5-2-1 4-6 1zm24 10 8-3-3 5-8 1zm18-19 6-1-2 3-7 1zm-5 43 13-3-7 5-9 1z" />
              <circle cx="14" cy="39" r="1.6" />
              <circle cx="55" cy="8" r="1.2" />
              <circle cx="83" cy="48" r="1.8" />
              <circle cx="111" cy="27" r="1.3" />
            </g>
          </pattern>
          <filter id={filterId} x="-6%" y="-35%" width="112%" height="170%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045 0.22"
              numOctaves="2"
              seed="6"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="7"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`}>
          <path fill="#9d0808" opacity="0.36" transform="translate(0 7)" d={stroke} />
          <path fill="#f20d18" opacity="0.42" d={stroke} />
          <path fill="#ff453b" opacity="0.16" d={highlight} />
          <path fill={`url(#${grainId})`} opacity="0.38" d={stroke} />
          <g fill="#ff342d" opacity="0.58">
            <path d="m22 48 36-5-26 7-20 2zm21 54 48 5-31 2-27-4zm672-54 56 4-34 3-32-3zm-19 56 51-7-28 9-37 2zM8 60l20-5-12 7-15 2zm783 34 16-7-9 9-14 4zm-744-47 17-3-9 4-12 2zm697 70 23-4-14 6-16 2z" />
          </g>
        </g>
      </svg>
      </span>
      <span className="relative font-black tracking-[-0.035em] text-white uppercase italic">
        <span className="sr-only">{children}</span>
        <span aria-hidden="true">
          {letters.map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={active === undefined ? undefined : reduce || active ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 14, filter: "blur(6px)" }}
              whileInView={active === undefined ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
              viewport={{ once: false, amount: 0.6 }}
              transition={{
                duration: 0.38,
                delay: active === false ? 0 : 0.12 + index * 0.045,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {letter === " " ? "\u00a0" : letter}
            </motion.span>
          ))}
        </span>
      </span>
    </span>
  );
}
