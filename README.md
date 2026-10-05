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

## Publicación editorial

La publicación diaria es automática: una Scheduled Task entrega un lote v2 en una rama `newsroom/YYYY-MM-DD`, GitHub Actions lo valida sin secretos, lo promueve automáticamente a `main`, sincroniza Neon y despliega Vercel. No se hace push directo de newsroom a producción.

El contrato de entrada y la operación completa están documentados en [docs/operacion-publicacion-editorial.md](docs/operacion-publicacion-editorial.md). El único directorio permitido para lotes de newsroom es [editorial-inbox/](editorial-inbox/README.md).

## Despliegue

`publish-editorial.yml` es la única estrategia de publicación de lotes. Configura los secretos de Neon y Vercel descritos en la guía y desactiva el auto-deploy GitHub→Vercel para no generar dos despliegues por el mismo commit.
