# ELEVEN Football

Publicación editorial de fútbol construida con Next.js, contenido local Markdown y generación estática. Las piezas de muestra son ficción editorial; no son noticias verificadas.

## Desarrollo

```bash
npm install
npm run dev
```

## Validación

```bash
npm test
npm run build
```

`npm run validate:content` comprueba frontmatter requerido, categorías admitidas, fechas y slugs duplicados.

## Publicar un artículo

1. Crea `content/articles/mi-articulo.md`.
2. Añade el frontmatter obligatorio: `title`, `slug`, `description`, `date` (ISO con zona horaria) y `category`.
3. Opcionalmente añade una imagen en `public/images/articles/` y referencia la ruta mediante `heroImage`.
4. Ejecuta `npm test` y haz push. Las rutas, portada, categorías, RSS y sitemap descubren el artículo automáticamente.

## Despliegue

Conecta el repositorio de GitHub a un nuevo proyecto Vercel llamado `eleven-football`. Cada push a la rama de producción desplegará el sitio.

La guía completa de importación editorial, sincronización con Neon y automatización con GitHub Actions está en [docs/operacion-publicacion-editorial.md](docs/operacion-publicacion-editorial.md).

## Futuro newsroom AI

La automatización puede modificar exclusivamente `content/articles/**` y `public/images/articles/**`; no necesita tocar código de aplicación.
