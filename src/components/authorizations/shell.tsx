import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/images/sin-anonimato-logo.webp";
import type { ReactNode } from "react";

export function AuthorizationBrand() {
  return <Link href="/" aria-label="Sin Anonimato, inicio">
    <Image src={logo} alt="Sin Anonimato" unoptimized preload className="authorization-logo" />
  </Link>;
}

export function AuthorizationShell({ children, admin = false, demo = false, workspace = false }: { children: ReactNode; admin?: boolean; demo?: boolean; workspace?: boolean }) {
  return <div className={`authorization-shell ${admin ? "authorization-admin" : ""}${workspace ? " authorization-workspace-shell" : ""}`}>
    {!workspace && <header className="authorization-header"><AuthorizationBrand /><span>{admin ? "Producción / Autorizaciones" : "Autorización de participación"}</span></header>}
    {demo && <div className="authorization-demo">Vista de demostración · Datos ficticios · No registra aceptaciones ni envía correos</div>}
    <main className="authorization-main">{children}</main>
    {!workspace && <footer className="authorization-footer"><span>Sin Anonimato</span><a href="mailto:contacto@sinanonimato.cl">¿Necesitas ayuda? Contacta al equipo</a></footer>}
  </div>;
}
