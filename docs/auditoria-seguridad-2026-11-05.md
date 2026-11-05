# Auditoría de seguridad de Sin Anonimato

Fecha: 5 de noviembre de 2026. Alcance: código del sitio publicado, dependencias de ejecución, formulario público, panel y autorizaciones. Revisión sin leer expedientes de clientes, enviar invitaciones reales ni modificar su evidencia. No sustituye una prueba de penetración independiente ni certifica ausencia total de vulnerabilidades.

## Correcciones

- Enlace Admin en el footer a `/admin/autorizaciones`, con foco visible y ajuste en pantallas pequeñas. El enlace público no concede permisos: la API mantiene sesión verificada y lista de acceso.
- Cabeceras generales contra inclusión en marcos, interpretación incorrecta de tipos y uso de cámara, micrófono, ubicación o pagos. Se oculta la cabecera identificadora de Next.js.
- En panel y autorización, CSP con nonce aleatorio nuevo por respuesta, sin scripts inline libres ni eval en producción, conexiones al propio origen, objetos bloqueados y ausencia de caché. Se sobrescribe cualquier nonce o política recibidos del visitante. Los estilos inline continúan permitidos para React y Motion.
- Contacto exige el origen canónico, JSON y un máximo de 24 000 bytes, comprobado durante lectura del cuerpo incluso sin Content-Length. Aplica cuotas persistentes: 10 solicitudes válidas por minuto para el formulario y 2 por destinatario cada 10 minutos. Un fallo de la base o cuota impide enviar. Las claves de cuota se guardan como huellas, sin IP ni correo en claro; no se presentan como anonimización irreversible.
- El acceso por correo limita el cuerpo a 8 192 bytes y las solicitudes de código a 3 por destinatario cada 5 minutos, además de los controles de Better Auth. La cuota no depende de que el visitante mantenga una dirección IP.
- La respuesta al invitado proyecta explícitamente los campos del documento y excluye el correo interno de quien lo aprobó y otros metadatos de administración.
- La fecha de la demostración se formatea tras hidratar, evitando diferencias entre las bibliotecas de internacionalización del servidor y navegador.

## Controles existentes comprobados

- Administrador de Production: `smartproagencia@gmail.com`. El correo anterior fue retirado de la lista. Cada solicitud al panel vuelve a comprobar el rol; conservar una sesión no permite eludir la revocación.
- Código de acceso de seis dígitos con vencimiento de 5 minutos, máximo de 3 intentos y almacenamiento mediante hash. Las cuentas no autorizadas y el registro público están bloqueados. El control del buzón es un factor único; protegerlo con MFA es una obligación operativa del equipo.
- Nombre, correo, RUT, comprobantes PDF y cargas de correo pendientes se cifran con AES-256-GCM; la autenticación del cifrado se vincula al expediente y a su propósito. La clave se obtiene del entorno del servidor y no se envía al navegador.
- Los tokens usan 32 bytes aleatorios y se guardan mediante SHA-256. Invitaciones y confirmaciones son de uso único, vencen y se invalidan al reenviar o anular. Viajan en fragmentos y la interfaz los retira del historial al abrirlos.
- Cookie de invitado HttpOnly, Secure en producción, SameSite Strict y limitada a las rutas de la API. No se guarda su sesión en localStorage.
- Las acciones de escritura verifican Origin en el servidor. Las consultas de datos usan parámetros SQL. Los textos se escapan al construir correos y React no inserta HTML arbitrario del documento.
- La aceptación exige casilla explícita y huella de la versión. La confirmación genera el PDF y registra la evidencia dentro de una transacción. El PDF conserva una huella de integridad y requiere sesión; no se escribe en public.
- Trabajador con secreto y comparación de tiempo constante; webhook con firma Svix, control de tamaño e idempotencia. Los registros de errores no incluyen relatos, direcciones, RUT ni enlaces privados.
- La eliminación de expedientes exige vencimiento y ausencia de bloqueo legal. El vencimiento no equivale a borrado automático: el equipo debe ejecutar la política y considerar las copias de respaldo.

## Evidencia y límites de verificación

Estado al terminar la revisión: correcciones preparadas y validadas localmente; publicación pendiente de autorización explícita solicitada por la revisión automática de aprobación. Pasaron 36 pruebas, ESLint, TypeScript y la compilación.

- `npm audit --omit=dev`: cero avisos conocidos en dependencias de producción al consultar el registro npm el 5 de noviembre de 2026. Esto no equivale a ausencia de fallos desconocidos ni cubre por sí solo las herramientas de desarrollo.
- Pruebas automatizadas con PostgreSQL aislado y correo simulado: autenticación, roles y revocación, tokens únicos, caducidad, aceptación expresa, cifrado y aislamiento entre expedientes, integridad de PDF, conservación, cola y límites de solicitudes.
- Compilación de producción, ESLint y TypeScript; comprobación en navegador de Admin y del recorrido de demostración con la nueva CSP. Sin envíos a invitados ni creación de autorizaciones reales durante la auditoría.
- Sondeo público inicial: API administrativa, PDF de invitado y trabajador responden 401 sin credenciales; `/.env` y `/.git/config` responden 404. Las áreas privadas tienen no-store, noindex y no-referrer. Vercel entrega HSTS sobre HTTPS.
- Revisión de patrones de credenciales en los archivos versionados: sin coincidencias de claves Resend, claves AWS, claves privadas ni conexiones PostgreSQL con contraseña. No es un escaneo exhaustivo de todo el historial Git.
- La publicación y el sondeo posterior se registran en `.preview/security/` sin datos de clientes ni valores secretos.

## Pendientes operativos

1. Completar y aprobar las condiciones legales, los plazos de publicación y la política de conservación. El documento cargado en producción continúa como borrador. Esta auditoría no habilita invitaciones ni aprueba ese texto.
2. Sustituir los enlaces de privacidad y términos que hoy apuntan a Contacto por documentos definitivos aprobados, incluyendo finalidades, contacto para derechos, proveedores y transferencias. No se inventó ni publicó una política legal durante esta revisión.
3. Comprobar en las cuentas de Vercel, Neon y Resend los permisos mínimos, MFA, regiones, cifrado administrado, conservación de logs y restricciones de los operadores. No se inspeccionaron credenciales ni se alteraron estas integraciones durante la auditoría.
4. Definir y probar respaldo y restauración de la base junto con recuperación de la clave de cifrado, con una copia protegida separada. El código no demuestra que exista un respaldo recuperable ni que se borren automáticamente respaldos antiguos.
5. Revisar periódicamente avisos de dependencias, entregas y rebotes, alertas del proveedor, solicitudes de derechos y expedientes vencidos. Las cuotas reducen abuso; no sustituyen una revisión operativa ni eliminan por completo ataques de denegación de servicio.

## Referencias técnicas

- [Next.js sobre CSP y nonces](https://nextjs.org/docs/app/guides/content-security-policy). Se contrastó además con la guía incluida en la versión instalada 16.4.4.
- [Better Auth sobre límites de peticiones](https://better-auth.com/docs/concepts/rate-limit).
