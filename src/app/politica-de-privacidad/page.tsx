import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.sinanonimato.cl/politica-de-privacidad" },
  title: "Política de privacidad | Sin Anonimato",
  description: "Cómo Sin Anonimato trata los datos de quienes visitan el sitio, envían su historia o participan en el podcast.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader innerPage />
      <main id="contenido" className="px-5 py-16 md:px-8 md:py-24">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Política de privacidad</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75">
            Esta política explica cómo tratamos los datos que nos entregas al usar el sitio de Sin Anonimato.
          </p>

          <div className="mt-10 space-y-8 border-t border-white/15 pt-8 text-base leading-relaxed text-white/80 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white">
            <section>
              <h2>Responsable del tratamiento</h2>
              <p>Vilero Group SpA, con domicilio en Santa Elena 941 B, Santiago Centro, Chile, gestiona los datos personales de Sin Anonimato.</p>
            </section>
            <section>
              <h2>Datos que recibimos y para qué los usamos</h2>
              <ul className="ml-5 list-disc space-y-2">
                <li>Si nos cuentas tu historia, recibimos tu nombre, correo, teléfono si lo proporcionas y el contenido de tu mensaje. Usamos esos datos para responder y evaluar una posible participación.</li>
                <li>Si consultas por auspicios, usamos tus datos de contacto y el mensaje para responder y conversar sobre tu propuesta.</li>
                <li>Si participas en el podcast, usamos los datos de identificación y contacto que solicita el formulario, junto con el registro de aceptación y confirmación, para gestionar y respaldar tu autorización.</li>
              </ul>
              <p className="mt-3">El envío de una historia por el formulario sirve para iniciar el contacto. La autorización para publicar material se gestiona por separado con la persona invitada.</p>
            </section>
            <section>
              <h2>Acceso y servicios externos</h2>
              <p>El equipo autorizado usa estos datos para gestionar los mensajes, invitaciones y autorizaciones. Los servicios de alojamiento, almacenamiento y correo que operan el sitio pueden procesar datos para prestar sus servicios. Al abrir contenido integrado de Instagram o YouTube, esas plataformas pueden recibir información técnica de tu navegador y usar cookies según sus propias políticas.</p>
            </section>
            <section>
              <h2>Conservación y seguridad</h2>
              <p>Conservamos los datos de contacto mientras sean necesarios para atender la solicitud y darle seguimiento. Las autorizaciones y sus comprobantes se conservan según las condiciones informadas en el proceso de autorización y las obligaciones aplicables. El acceso a los registros de autorización está restringido.</p>
            </section>
            <section>
              <h2>Tus datos y cómo contactarnos</h2>
              <p>Para consultar qué datos tenemos sobre ti, solicitar una corrección o pedir su eliminación o bloqueo cuando corresponda, escribe a <a className="break-all underline underline-offset-4 hover:text-white" href="mailto:contacto@sinanonimato.cl">contacto@sinanonimato.cl</a>.</p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter innerPage />
    </>
  );
}
