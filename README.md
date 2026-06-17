# Portfolio Andrés Prias

Sitio estático en HTML, CSS y JavaScript vanilla para el portfolio profesional de Andrés Prias.

## Ejecutar en local

Desde esta carpeta:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Luego abre:

```text
http://127.0.0.1:4173/
```

## Estructura

- `index.html`: redirección de compatibilidad hacia `sobre-mi.html`.
- `sobre-mi.html`: presentación principal, perfil profesional y tabs interactivos.
- `proyectos.html`: página de proyectos y acceso al Mini Juego.
- `servicios.html`: servicios y método de trabajo en una sola página.
- `metodo.html`: redirección de compatibilidad hacia `servicios.html`.
- `contacto.html`: página de contacto.
- `mini-juego.html`: página independiente del Mini Juego.
- `styles.css`: estilos visuales, temas claro/oscuro, responsive, menú móvil y componentes.
- `script.js`: interacciones compartidas: fondo animado, tabs de Sobre mí, cambio de tema, menú móvil, Swup y Mini Juego.
- `page-transitions.js`: fallback local compatible con Swup para mantener transiciones aunque el CDN no cargue.
- `assets/`: imagen de perfil, logo de marca y favicon.

## Cambios frecuentes

- Nombre, descripción principal y botones de presentación: busca `section class="hero"` en `sobre-mi.html`.
- Texto de Sobre mí: busca `about-section` en `sobre-mi.html`.
- Proyectos: busca `project-card` en `proyectos.html`.
- Mini Juego: busca `id="defensa-cosmica"` en `mini-juego.html` y `rankingKey` en `script.js`.
- Servicios: busca `id="servicios"` en `servicios.html`.
- Método: busca `id="metodo"` en `servicios.html`.
- Contacto: busca `id="contacto"` en `contacto.html`.
- Correo y WhatsApp: busca `anpriasca@gmail.com` y `wa.me/573197265704`.
- Colores y temas: variables de `:root` y `body[data-theme="light"]` al inicio de `styles.css`.
- Menú móvil: CSS dentro de `@media (max-width: 900px)` y lógica `updateMobileNavByScroll` en `script.js`.
- Transiciones entre páginas: Swup se carga al final de cada HTML y usa el contenedor `#swup`; `page-transitions.js` cubre el modo sin internet.
- Favicon y logo: archivos dentro de `assets/`.

## Guía de mantenimiento

- Mantener los textos editables en sus páginas HTML; evitar escribir textos visibles desde `script.js` salvo estados dinámicos del Mini Juego.
- Las cinco páginas principales deben conservar el mismo marco: header, nav, `main id="swup"` y footer. Las redirecciones son la excepción.
- Antes de agregar una nueva sección, crear primero el HTML y luego agrupar sus estilos con un comentario en `styles.css`.
- Reutilizar clases existentes como `section`, `section-heading`, `btn`, `project-card` y `eyebrow` para conservar consistencia visual.
- Si cambias colores, hazlo desde las variables CSS, no desde cada componente.
- Si agregas imágenes, colócalas en `assets/` y usa nombres descriptivos en minúsculas o con guiones.
- Probar siempre escritorio y móvil después de tocar `styles.css` o `script.js`.

## Notas

El sitio no requiere build, dependencias ni framework. Puede publicarse como página estática en GitHub Pages, Netlify, Vercel o cualquier hosting que sirva archivos HTML/CSS/JS.







