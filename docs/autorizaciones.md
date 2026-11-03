# Autorizaciones de invitados

## Estado y alcance

Implementación para Next.js 16 con servidor Node.js y PostgreSQL. No se publica ni se ejecutan migraciones contra producción al instalar dependencias o compilar. El documento jurídico no viene precargado: administración debe incorporar y publicar el texto aprobado. La demostración usa contenido ficticio y no guarda ni envía información.

Los comandos de desarrollo y compilación usan Webpack, compatible con Next.js 16, para evitar problemas de la caché persistente de Turbopack en el volumen extraíble de este proyecto. Montserrat se incluye localmente con su licencia OFL; la compilación ya no necesita descargar fuentes de Google.

## Base aprovisionada el 3 de noviembre de 2026

- Cuenta y equipo: desarrolladorwebsp / desarrolladorwebsp-6136s-projects.
- Proyecto Vercel: `sin-anonimato`.
- Base: `sin-anonimato-authorizations-production`, Neon, plan Free, São Paulo (`gru1`).
- Recurso Vercel: `store_NZjDVsWJGyBLROjs`; proyecto Neon: `flat-thunder-65515993`.
- Conectada exclusivamente al entorno **Production**, con variables sensibles administradas por la integración. Preview y Development no comparten esta conexión.
- Esquema inicial aplicado y verificado: 11 tablas, cero documentos y cero autorizaciones. No se cargaron invitados, cuentas del panel ni aceptaciones de ejemplo.
- Auth y Realtime administrados de Neon no fueron habilitados: el módulo usa su propia configuración Better Auth.
- La configuración `vercel.json` fija la región de funciones en `gru1` para ejecutar cerca de la base después de publicar el código. Next.js 16.4 marca `preferredRegion` como obsoleto; no se usa ese export.
- La URL pública canónica observada en Vercel es `https://www.sinanonimato.cl`; el dominio sin `www` redirige a ella. Al activar el módulo, configurar ese mismo origen en `APP_URL` y `BETTER_AUTH_URL`.
- Se configuraron los secretos de sesión, cifrado, cron y webhook como variables sensibles de Production. Administrador inicial aprobado: desarrolladorwebsp@gmail.com; avisos de producción: contacto@sinanonimato.cl. El dominio de Resend está verificado. La publicación se verifica por separado; no hay documento legal ni política de conservación aprobados y las invitaciones permanecen bloqueadas.

Las tablas iniciales se aplicaron desde el editor SQL de la integración en una única sentencia `DO` atómica, usando el esquema del repositorio y el SQL generado por Better Auth 1.7.15. El editor confirmó ejecución correcta; una consulta posterior comprobó las 11 tablas y el estado vacío. El editor volvió a modo de solo lectura. Para cambios posteriores usar `npm run db:migrate`, que prioriza `DATABASE_URL_UNPOOLED` para migraciones y mantiene la conexión agrupada para la aplicación.

- Invitado: `/autorizacion` y `/autorizacion/confirmar`.
- Demostración navegable: `/autorizacion/demo`.
- Panel: `/admin/autorizaciones`.
- API privada: `/api/authorizations/*`.
- Autenticación: `/api/auth/*`, Better Auth con código por correo y lista de acceso.

## Preparación del entorno

1. Verificar que el hosting puede ejecutar `next start` con Node.js compatible y conexiones PostgreSQL. La exportación estática no ejecuta este módulo. En cPanel hace falta una aplicación Node.js; subir `out/` no es suficiente.
2. Crear una base exclusiva para el entorno. PostgreSQL debe usar conexión privada o TLS con certificado verificado. No desactivar la validación de certificados. En producción exigir cifrado y respaldos en el proveedor; el cifrado de aplicación no reemplaza estas medidas.
3. Completar las variables en `.env.example`. `APP_URL` debe ser el origen canónico; en producción exige HTTPS. Configurar el proxy para preservar el protocolo y los encabezados de la aplicación.
4. Generar por separado `BETTER_AUTH_SECRET`, `AUTHORIZATION_ENCRYPTION_KEY` (32 bytes en hexadecimal) y `AUTHORIZATION_CRON_SECRET`. Guardarlos en el gestor de secretos del entorno. La clave de cifrado es necesaria para restaurar los expedientes; mantener una copia protegida separada del respaldo de base de datos. No rotarla sin migrar los datos cifrados.
5. Definir las cuentas individuales en `AUTHORIZATION_ADMIN_EMAILS` y `AUTHORIZATION_PRODUCTION_EMAILS`. No hay registro público de cuentas. Las cuentas permitidas se crean al verificar el primer código. Quitar un correo de la lista revoca su acceso aun si conserva una sesión. El método implementado es acceso por código de correo; no se presenta como autenticación de dos factores. Proteger también esos buzones con MFA.
6. Configurar `PRODUCTION_EMAIL`, el remitente autorizado y Resend. Validar dominio, SPF, DKIM y DMARC. Desactivar seguimiento de enlaces/aperturas para estos mensajes de autorización. No se usa la apertura o el clic del proveedor como prueba de consentimiento.
7. Definir `AUTHORIZATION_RETENTION_DAYS` y `AUTHORIZATION_RETENTION_POLICY` con el responsable legal. El plazo se calcula desde la grabación y el texto informado se conserva con cada expediente. Cambiar las variables no altera expedientes previos.
8. Ejecutar `npm run db:migrate` en la base del entorno de desarrollo o preproducción; revisar el resultado antes de aplicarlo en producción. El comando crea las tablas del módulo y las de Better Auth. Es repetible y no elimina tablas. El usuario de ejecución habitual debe tener permisos mínimos; usar una cuenta de migración para cambios de esquema.
9. Ejecutar pruebas, compilar e iniciar con `npm run build` y `npm start`.

## Documentos y operación

Administración crea una versión con título, versión única, condiciones completas, aviso de privacidad y declaración de aceptación. Revisar el texto en el panel y confirmar expresamente que fue aprobado por el equipo responsable antes de publicarlo. No existe edición del contenido publicado; una corrección requiere otra versión. Retirar un documento bloquea nuevas aceptaciones y confirmaciones pendientes; las confirmadas conservan el original.

Producción crea una invitación por participación con nombre, correo, episodio, grabación y versión legal. Los enlaces duran hasta 7 días o hasta la grabación, lo que ocurra primero. El enlace inicial se intercambia por una cookie HttpOnly y se consume una vez. Para abrirlo en otro dispositivo, producción puede reenviarlo; esto invalida el acceso anterior. El correo de destino no puede ser sustituido por el invitado: corregirlo requiere anular y crear otra invitación.

El invitado completa nombre y RUT, lee las condiciones y marca una casilla inicialmente vacía. El servidor valida el RUT, la aceptación booleana y la huella de la versión mostrada. La autorización queda pendiente. El enlace posterior de correo dura hasta 30 minutos y exige pulsar el botón de confirmación: una petición GET no confirma nada. Los enlaces usan fragmentos para evitar enviarlos en la URL de las peticiones HTTP; no incorporan datos personales.

La confirmación consume el token, registra la fecha del servidor y genera el PDF en la misma transacción. Un fallo de generación revierte la confirmación para permitir reintentar con el enlace vigente. El PDF, su SHA-256 y los datos del participante se conservan cifrados mediante AES-256-GCM en PostgreSQL, ligados al identificador del expediente. Los documentos legales se conservan íntegros y versionados. El comprobante es un respaldo electrónico; no es una firma electrónica avanzada ni una verificación de identidad civil. No se recopilan IP ni agente de navegador como evidencia predeterminada.

Se encolan por separado la copia PDF del invitado y el aviso a producción con acceso al panel. Un fallo de correo no revierte una autorización confirmada. La cookie posterior permite descargar el comprobante durante 7 días como máximo; después, el equipo puede facilitar una copia desde el panel. Los PDF nunca se guardan en `public/` ni tienen URL pública.

## Envíos, reintentos y seguimiento

La cola es persistente, con bloqueo de filas, reintentos y una clave de idempotencia por mensaje. `after()` intenta procesarla al terminar una solicitud, pero es obligatorio programar un trabajador cada minuto:

```sh
npm run authorizations:worker
```

Vercel tiene un cron cada minuto en `vercel.json`: invoca GET `/api/internal/authorizations` y autentica con `CRON_SECRET`. La ruta también admite POST para trabajadores externos. Ambos métodos exigen el encabezado `Authorization: Bearer <secreto>`; no ponerlo en la URL. `AUTHORIZATION_CRON_SECRET` se conserva como alternativa cuando no existe `CRON_SECRET`. El trabajador admite varios procesos usando `FOR UPDATE SKIP LOCKED`.

Los intentos fallidos usan espera exponencial con máximo de 60 minutos y 8 intentos. Los enlaces vencidos se cancelan sin enviarse. Mensajes con más de 23 horas dejan de reintentarse para permanecer dentro de la ventana de idempotencia del proveedor. Tras agotar intentos, producción debe revisar el estado, resolver la causa y solicitar un nuevo enlace. No eliminar la cola como mecanismo de reintento.

Configurar un webhook Resend dedicado en `/api/internal/authorizations/delivery`, con `RESEND_AUTHORIZATION_WEBHOOK_SECRET`. Escuchar enviados, entregados, retrasados, rebotados, fallidos, suprimidos y quejas. Se verifican las firmas Svix, se descartan categorías ajenas, se deduplican eventos y se conserva solo el estado técnico, sin copiar el contenido ni los destinatarios. El panel distingue el registro de aceptación de los problemas de entrega. La aceptación de Resend no demuestra entrega al destinatario.

## Conservación, eliminación y respaldos

El panel permite aplicar un bloqueo de eliminación por conservación legal. No permite editar una aceptación confirmada, anular silenciosamente su evidencia ni borrar un expediente antes de su plazo. Al vencer el plazo sin bloqueo, administración puede eliminar definitivamente el participante, PDF, cola, eventos y eventos de entrega de la base activa, con advertencia explícita. El vencimiento deshabilita el acceso público; no borra automáticamente evidencia. Revisar periódicamente los expedientes vencidos y aplicar la política, sin acumularlos indefinidamente.

Definir por escrito responsable, finalidad, contacto para derechos, destinatarios/proveedores, ubicación del tratamiento, plazo de conservación, excepciones y ciclo de eliminación de respaldos. Las solicitudes anticipadas de supresión o retiro necesitan evaluación del responsable legal; no hay borrado anticipado genérico desde el panel. Documentar la resolución y aplicar una migración controlada si corresponde. Para menores de edad hace falta un flujo de representación aprobado; no utilizar este flujo como sustituto.

Los respaldos del proveedor requieren cifrado, acceso limitado, plazos y pruebas periódicas de restauración con sus claves. Eliminar de la base activa no elimina inmediatamente copias antiguas: aplicar su ciclo aprobado y volver a ejecutar las eliminaciones pendientes después de una restauración. Estas obligaciones son operativas y no las completa por sí sola esta implementación.

## Validación antes de habilitar participantes reales

- `npm test`, `npm run lint`, `npm run typecheck` y `npm run build`.
- Las pruebas del servicio usan PostgreSQL embebido aislado (PGlite), datos ficticios y transporte simulado. No contactan Resend ni producción. Generan un PDF de muestra en `.preview/authorizations/`.
- Revisar visualmente el invitado en móvil y escritorio, el documento largo, casilla vacía, estados de error y descarga de PDF.
- En preproducción: verificar login de una cuenta permitida y rechazo de otra, permisos de producción, invitación, aceptación, confirmación en otro dispositivo, entrega real y eventos del proveedor, anulación, reenvío, caducidad, respaldo/restauración y eliminación según política.
- No hay envío real, base productiva, políticas aprobadas ni despliegue confirmado por el hecho de que pasen las pruebas locales.

## Activación sin documento legal

El panel usa únicamente el origen de la aplicación, la sesión y la lista de acceso; no requiere inventar una política legal para abrirse. Mientras no se publiquen las condiciones y no se configure el plazo/texto de conservación aprobado, el servidor rechaza invitaciones y el panel muestra los requisitos pendientes. No se precargan textos legales de ejemplo en Production.

La credencial de Resend existente se reutilizó exclusivamente para este proyecto. Se creó un webhook dedicado en el dominio canónico; no se modificó el dominio ni se enviaron correos de prueba a invitados.
