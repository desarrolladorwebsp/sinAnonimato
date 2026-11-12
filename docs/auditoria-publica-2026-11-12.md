# Auditoría y plan — Sin Anonimato

Alcance: sitio público local. El administrador y producción quedan fuera de esta entrega.

## Hallazgos
- Escalas tipográficas, anchos y espacios distintos entre capítulos, Instagram, anuncios y footer.
- Scroll vertical con snap y secciones de altura completa dificultan recorrer el contenido.
- Animaciones repetidas ocultan contenido del footer; portada depende de animación de entrada.
- Catálogo obtiene videos pero no estadísticas: no permite afirmar cuál es el más visto.
- Metadatos generales sin canonical por página, sitemap ni datos estructurados de episodios.
- CSS conserva reglas del diseño anterior de patrocinadores; catálogo importa toda la portada.

## Plan aprobado
1. Mantener negro, rojo y Montserrat; unificar contenedores, jerarquías, superficies y espacios.
2. Portada: último capítulo → catálogo → Shorts → Instagram → comunidad → publicidad → contacto.
3. Extraer tarjetas y modelo de episodios; recomendaciones por estadísticas reales, sin inventar vistas.
4. Shorts configurables con enlaces verificados. Mientras no existan, mostrar acceso al canal oficial, sin videos ficticios.
5. Animación breve de entrada, profundidad CSS al interactuar y respeto a movimiento reducido; evitar WebGL y dependencias nuevas.
6. SEO: canonical, Open Graph, sitemap, robots, PodcastSeries y VideoObject solo con datos válidos. Contenido visible que responda qué es el podcast y cómo verlo.
7. Verificar código, capturas a 390/768/1440 px, navegación, desbordamiento, carruseles y reproductor. Iterar según evidencia.

## Fuentes técnicas
- https://developers.google.com/youtube/data/reference/rest/v3/videos/list
- https://developers.google.com/search/docs/appearance/video
- https://developers.google.com/search/docs/appearance/ai-features
- Documentación local de Next.js instalada (metadata, sitemap y robots).

SEO/AEO mejora comprensión e indexabilidad; no garantiza posiciones ni citas en respuestas de IA. No agregar reseñas ficticias a datos estructurados.

## Resultado y verificación
- Implementados: prioridad al último capítulo, tarjetas compartidas, orden por reproducciones cuando existen estadísticas, Shorts configurables, sección informativa visible y footer compacto.
- Separado CSS por capítulos, comunidad, patrocinadores y elementos editoriales. Eliminado el wrapper de diálogos obsoleto y estilos antiguos de patrocinadores. Conservada la portada antigua oculta por la instrucción previa de no eliminarla.
- Guía de diseño del proyecto simplificada y adaptada a esta web.
- Sitemap y robots consultados por HTTP local; canonical y JSON-LD inspeccionados en navegador. No se incluyen rutas privadas en sitemap.
- Lint correcto, compilación de producción y TypeScript correctos; 64 pruebas pasan. Actualizadas cuatro pruebas que seguían esperando la portada «Próximamente».
- Navegador: revisados anchos efectivos 320, 390, 768 y 1440 px, sin desbordamiento horizontal de página en las comprobaciones realizadas. Búsqueda por texto sin acento y estado sin resultados comprobados.
- Carrusel publicitario: observada rotación de Cotízalo Antes a Isapres Premium sin intervención, cambio manual y apertura/cierre del formulario. No se enviaron consultas reales.
- Movimiento reducido emulado y verificado: animación publicitaria desactivada. Emulación retirada al terminar.
- Iteración visual: se compactó el footer en dos columnas y se amplió el carrusel de Instagram hasta tablet, porque los embeds en tres columnas quedaban demasiado estrechos.

## Pendientes de contenido y servicios
1. En el entorno local no hay YOUTUBE_API_KEY. La lógica de sincronización y estadísticas está implementada pero no se verificó contra una cuenta API configurada. Sin clave se muestra el capítulo previamente proporcionado.
2. El reproductor del video xNfdDPhmEMU muestra «Este video es privado». El propietario debe habilitar su visualización; el sitio no puede modificar esa condición.
3. Faltan los enlaces aprobados de Shorts. Agregarlos en src/content/youtube-shorts.ts; hasta entonces la sección dirige al canal oficial, sin videos ficticios.
4. No se publicó en producción ni se modificó el panel administrativo. Las métricas reales de Core Web Vitals y la indexación requieren medición posterior en producción.
5. Los testimonios de muestra continúan limitados a desarrollo. No se incorporaron como reseñas verificadas a los datos estructurados.

## Capturas
Guardadas en la carpeta de visualizaciones de esta conversación: publica-desktop-final.jpg, publica-movil-final.jpg, publica-tablet-final.jpg, publica-footer-movil-final.jpg, publica-publicidad-movil.jpg y publica-shorts-movil.jpg.
