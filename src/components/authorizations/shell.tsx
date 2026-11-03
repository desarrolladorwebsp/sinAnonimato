import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/images/sin-anonimato-logo.png";
import type { ReactNode } from "react";

export function AuthorizationShell({ children, admin = false, demo = false }: { children: ReactNode; admin?: boolean; demo?: boolean }) {
  return <div className={`authorization-shell ${admin ? "authorization-admin" : ""}`}>
    <header className="authorization-header"><Link href="/" aria-label="Sin Anonimato, inicio"><Image src={logo} alt="Sin Anonimato" priority className="authorization-logo" /></Link><span>{admin ? "Producción / Autorizaciones" : "Autorización de participación"}</span></header>
    {demo && <div className="authorization-demo">Vista de demostración · Datos ficticios · No registra aceptaciones ni envía correos</div>}
    <main className="authorization-main">{children}</main>
    <footer className="authorization-footer"><span>Sin Anonimato</span><a href="mailto:contacto@sinanonimato.cl">¿Necesitas ayuda? Contacta al equipo</a></footer>
  </div>;
}
