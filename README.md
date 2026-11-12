# Sin Anonimato

Inicio del proyecto. Next.js, Tailwind CSS y Motion.

```bash
npm run dev
npm run lint
npm test
npm run typecheck
```

## Autorizaciones de invitados

- Demostración sin envíos: `/autorizacion/demo`.
- Acceso del equipo: `/admin/autorizaciones`.
- Configuración, migraciones, cron, pruebas y conservación: [guía de autorizaciones](docs/autorizaciones.md).
- El proceso real requiere Node.js, PostgreSQL, correos autorizados y documento legal aprobado.

## Destacados de Instagram

Agrega, edita o reordena los elementos de `featuredInstagramPosts` en [src/content/instagram-reels.ts](src/content/instagram-reels.ts). La selección es manual y admite publicaciones públicas (`/p/`) y reels (`/reel/`). Cada tarjeta conserva el enlace al original.
