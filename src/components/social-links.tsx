"use client";

import {
  FacebookLogo,
  InstagramLogo,
  TiktokLogo,
  YoutubeLogo,
  type Icon,
} from "@phosphor-icons/react";
import { socials } from "@/content/site";

const icons: Record<(typeof socials)[number]["platform"], Icon> = {
  Instagram: InstagramLogo,
  Facebook: FacebookLogo,
  YouTube: YoutubeLogo,
  TikTok: TiktokLogo,
};

type SocialLinksProps = {
  variant: "header" | "cues" | "names";
};

export function SocialLinks({ variant }: SocialLinksProps) {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {socials.map((social) => {
        const Icon = icons[social.platform];
        const label = variant === "cues" ? social.cue : social.platform;
        const external = social.href.startsWith("http");

        return (
          <li key={social.platform}>
            <a
              href={social.href}
              aria-label={variant === "cues" ? `${social.cue} en ${social.platform}` : social.platform}
              className="group flex flex-col items-center gap-2 text-white"
              {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
            >
              <span className={`social-icon social-icon-${variant}`}>
                <Icon size={variant === "header" ? 18 : 23} weight="regular" aria-hidden="true" />
              </span>
              {variant === "header" ? null : (
                <span className="text-[10px] font-semibold tracking-[0.16em] uppercase">
                  {label}
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
