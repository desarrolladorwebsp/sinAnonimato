import Image from "next/image";
import logo from "../../public/images/sin-anonimato-logo.webp";

type LogoProps = {
  variant?: "header" | "footer";
  href?: string;
};

export function Logo({ variant = "header", href = "#inicio" }: LogoProps) {
  const footer = variant === "footer";

  return (
    <a
      href={href}
      aria-label="Sin Anonimato"
      className={`live-logo relative inline-flex shrink-0 ${footer ? "live-logo-footer" : ""}`}
    >
      <Image
        src={logo}
        alt=""
        unoptimized
        preload={!footer}
        className={footer ? "h-24 w-auto max-w-full sm:h-28" : "h-14 w-auto md:h-[4.5rem]"}
      />
    </a>
  );
}
