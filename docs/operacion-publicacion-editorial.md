# Pipeline editorial automático v2

## Flujo de producción

```text
ChatGPT Scheduled Task
        ↓
newsroom/YYYY-MM-DD + editorial-inbox/YYYY-MM-DD
        ↓
Validate editorial batch (sin secretos)
        ↓
Publish editorial batch (un único lote cada vez)
        ↓
main → migración Neon → sync Neon → Vercel → health checks
```

No hay una tarea diaria de Codex, revisión humana, extracción manual de ZIP ni push directo desde `newsroom/**` a `main`.

## Contrato del lote v2

Las ramas de newsroom aportan datos no confiables en esta forma:

```text
editorial-inbox/YYYY-MM-DD/
├── manifest.json
├── editorial-report.md
├── articles/
│   └── <slug>.md
└── images/
    └── <slug>.png
```

El manifest debe declarar `schemaVersion: 2`, `batchId`, fecha, `locale: "es"`, `archiveCheck`, `sourceSite` y artículos `READY_TO_PUBLISH`. Cada artículo especifica archivo, imagen, word count, perfil de escritura, vector de estilo, opening type, fact-check y estado editorial.

Los artículos se entregan ya como Markdown independiente. El pipeline nunca extrae artículos desde encabezados de un informe único.

## Validación e importación

Los scripts se ejecutan siempre desde la copia confiable de `main`:

```bash
npm run validate:editorial-batch -- ../incoming/editorial-inbox/YYYY-MM-DD
npm run import:editorial-batch -- ../incoming/editorial-inbox/YYYY-MM-DD content/articles/es public/images/articles
```

La validación comprueba, entre otros:

- El schema Zod compartido de `lib/editorial-batch.ts`.
- El nombre de directorio, fecha y batch ID.
- Paths exactos: `articles/<slug>.md`, `images/<slug>.png` y `/images/articles/<slug>.png`.
- Frontmatter, slug, título, categoría, prioridad y `storyState` contra el manifest.
- Relaciones `UPDATE` y `EVERGREEN_REVISIT` contra la hemeroteca local.
- Word count y tiempo de lectura calculados desde el cuerpo Markdown.
- Firma PNG, dimensiones 1536×864 y hash SHA-256 único por lote.
- Ausencia de path traversal, archivos inesperados o tipos ejecutables.

El importador valida el lote completo antes de escribir. Si falla una pieza, no importa ninguna. En recuperación, `--allow-existing-identical` permite únicamente archivos destino byte a byte idénticos; una diferencia produce `EXISTING_ARTICLE_CONFLICT` y nunca se sobrescribe una publicación.

Las imágenes históricas no se regeneran ni se modifican. La validación estricta 1536×864 aplica a los artículos v2 que declaran `storyState`; los archivos heredados siguen siendo compatibles.

## Validaciones locales

```bash
npm test
npm run build
```

`validate:content` comprueba todos los idiomas, slugs, fechas, categorías, fuentes, imágenes, relaciones y cuerpos. Los tests no dependen de un número fijo de artículos.

## Neon y relaciones

Después de que el contenido entra en `main`, el workflow ejecuta:

```bash
npm run db:migrate
npm run sync:articles
```

La migración añade `articles.story_state` con valor por defecto `NEW`. La sincronización persiste contenido, traducciones, categorías, etiquetas, fuentes, estadísticas y, en una segunda pasada, `article_relations`:

- `updateOf` → `update_of`
- `relatedPublishedSlug` → `related_published`

`DATABASE_URL_UNPOOLED` debe apuntar a la conexión directa para migraciones. `DATABASE_URL` se utiliza para sincronizar los datos con Drizzle.

## Workflows

`validate-editorial.yml` se activa con un push a `newsroom/**` que toque `editorial-inbox/**`. Hace dos checkouts: `main` en `trusted/` y el SHA de newsroom en `incoming/`. Solo instala y ejecuta scripts desde `trusted/`; el inbox se trata exclusivamente como datos. No recibe secretos de producción.

`publish-editorial.yml` se activa solo cuando la validación anterior termina correctamente para una rama newsroom. Usa concurrencia exclusiva, vuelve a importar el lote sobre el `main` más reciente, restringe el diff a Markdown e imágenes españolas y hace commit automático. Si `main` avanza, reintenta hasta tres veces sin force push.

El orden de producción es obligatorio:

1. Commit de contenido a `main`.
2. Migración y sincronización Neon.
3. Build y deploy precompilado de Vercel mediante CLI.
4. Health check de portada y de cada `/es/article/<slug>`.
5. Borrado de la rama newsroom solo cuando todo lo anterior ha pasado.

Vercel no debe mantener simultáneamente su auto-deploy GitHub y el deploy de `publish-editorial.yml`: se debe desactivar el primero para conservar este orden.

## Secretos de GitHub Actions

| Secret | Uso |
| --- | --- |
| `DATABASE_URL` | Sincronización de artículos con Neon |
| `DATABASE_URL_UNPOOLED` | Migraciones Drizzle con conexión directa |
| `VERCEL_TOKEN` | CLI de Vercel |
| `VERCEL_ORG_ID` | CLI de Vercel |
| `VERCEL_PROJECT_ID` | CLI de Vercel |

El environment usado por la publicación no debe requerir aprobadores humanos. El `GITHUB_TOKEN` necesita permiso de escritura sobre contenidos y la protección de `main` debe permitir el commit del bot.
