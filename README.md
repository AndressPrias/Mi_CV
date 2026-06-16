# Portfolio Andres Prias

Sitio estatico en HTML, CSS y JavaScript vanilla para el portfolio profesional de Andres Prias.

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

- `index.html`: pagina de inicio con hero.
- `sobre-mi.html`: pagina de perfil profesional y tabs interactivos.
- `proyectos.html`: pagina de proyectos y acceso al Mini Juego.
- `servicios.html`: pagina de servicios.
- `metodo.html`: pagina de metodo de trabajo.
- `contacto.html`: pagina de contacto.
- `mini-juego.html`: pagina independiente del Mini Juego.
- `styles.css`: estilos visuales, temas claro/oscuro, responsive, menu movil y componentes.
- `script.js`: interacciones compartidas: fondo animado, tabs de Sobre mi, cambio de tema, menu movil, Swup y Mini Juego.
- `page-transitions.js`: fallback local compatible con Swup para mantener transiciones aunque el CDN no cargue.
- `assets/`: imagen de perfil, logo de marca y favicon.

## Cambios frecuentes

- Nombre, descripcion principal y botones del inicio: busca `section class="hero"` en `index.html`.
- Texto de Sobre mi: busca `about-section` en `sobre-mi.html`.
- Proyectos: busca `project-card` en `proyectos.html`.
- Mini Juego: busca `id="bug-hunter"` en `mini-juego.html` y `rankingKey` en `script.js`.
- Servicios: busca `id="servicios"` en `servicios.html`.
- Metodo: busca `id="metodo"` en `metodo.html`.
- Contacto: busca `id="contacto"` en `contacto.html`.
- Correo y WhatsApp: busca `anpriasca@gmail.com` y `wa.me/573197265704`.
- Colores y temas: variables de `:root` y `body[data-theme="light"]` al inicio de `styles.css`.
- Menu movil: CSS dentro de `@media (max-width: 900px)` y logica `updateMobileNavByScroll` en `script.js`.
- Transiciones entre paginas: Swup se carga al final de cada HTML y usa el contenedor `#swup`; `page-transitions.js` cubre el modo sin internet.
- Favicon y logo: archivos dentro de `assets/`.

## Guia de mantenimiento

- Mantener los textos editables en sus paginas HTML; evitar escribir textos visibles desde `script.js` salvo estados dinamicos del Mini Juego.
- Todas las paginas deben conservar el mismo marco: header, nav, `main id="swup"` y footer.
- Antes de agregar una nueva seccion, crear primero el HTML y luego agrupar sus estilos con un comentario en `styles.css`.
- Reutilizar clases existentes como `section`, `section-heading`, `btn`, `project-card` y `eyebrow` para conservar consistencia visual.
- Si cambias colores, hazlo desde las variables CSS, no desde cada componente.
- Si agregas imagenes, colocalas en `assets/` y usa nombres descriptivos en minusculas o con guiones.
- Probar siempre escritorio y movil despues de tocar `styles.css` o `script.js`.

## Notas

El sitio no requiere build, dependencias ni framework. Puede publicarse como pagina estatica en GitHub Pages, Netlify, Vercel o cualquier hosting que sirva archivos HTML/CSS/JS.
