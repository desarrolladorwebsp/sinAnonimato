import Image from "next/image";
import logo from "../../public/images/sin-anonimato-logo.png";

type LogoProps = {
  variant?: "header" | "footer";
};

export function Logo({ variant = "header" }: LogoProps) {
  const footer = variant === "footer";

  return (
    <a
      href="#inicio"
      aria-label="Sin Anonimato"
      className={`live-logo relative inline-flex shrink-0 ${footer ? "live-logo-footer" : ""}`}
    >
      <Image
        src={logo}
        alt=""
        priority={!footer}
        className={footer ? "h-24 w-auto max-w-full sm:h-28" : "h-14 w-auto md:h-[4.5rem]"}
      />
    </a>
  );
}
