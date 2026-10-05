# Operación técnica de publicación editorial

Esta guía describe el flujo técnico actual para publicar un lote editorial de ELEVEN. El contenido se mantiene como Markdown local y las imágenes como archivos estáticos; Next.js genera las rutas del sitio y Neon conserva el índice utilizado por analítica y tendencias.

## Qué recibe el sistema

Un lote debe llegar descomprimido con esta estructura:

```text
lote-editorial/
├── manifest.json
├── editorial.md
└── images/
    ├── articulo-a.png
    └── articulo-b.png
```

El nombre real de `editorial.md` puede variar. El manifest es la fuente de verdad para los artículos que se van a importar. Cada entrada debe incluir, como mínimo:

```json
{
  "title": "Título del artículo",
  "slug": "titulo-del-articulo",
  "status": "READY_TO_PUBLISH",
  "storyState": "NEW",
  "category": "Táctica",
  "homepagePriority": 90,
  "imageFile": "images/titulo-del-articulo.png"
}
```

Los valores `UPDATE` y `EVERGREEN_REVISIT` describen la intención editorial. Con el modelo actual se publican como artículos nuevos: no se elimina ni se sobrescribe automáticamente la pieza histórica señalada por `updateOf` o `relatedPublishedSlug`.

## Dónde termina cada archivo

| Recurso del lote | Destino en el repositorio | Uso en la app |
| --- | --- | --- |
| Artículo Markdown en español | `content/articles/es/<slug>.md` | Ruta `/es/article/<slug>` |
| Imagen indicada por `imageFile` | `public/images/articles/<archivo>` | `heroImage` del artículo |
| Frontmatter del artículo | Mismo Markdown | Portada, secciones, SEO, RSS, sitemap y Neon |
| Fuentes del frontmatter | Mismo Markdown | Bloque de fuentes y sincronización con Neon |

Los contenidos en inglés y francés están en `content/articles/en` y `content/articles/fr`. Un lote que solo incluya texto español se publica solo en `/es`; no se inventan traducciones durante la importación.

## Paso a paso local

### 1. Extraer e inspeccionar el lote

Antes de escribir en el repositorio se comprueba que el ZIP contiene un manifest, el Markdown editorial y todas las imágenes referenciadas.

```powershell
Expand-Archive -LiteralPath 'C:\ruta\ELEVEN-YYYY-MM-DD.zip' -DestinationPath "$env:TEMP\eleven-batch" -Force
Get-Content -Raw "$env:TEMP\eleven-batch\manifest.json"
Get-ChildItem "$env:TEMP\eleven-batch\images"
```

Comprobaciones realizadas:

- Cada `slug` del manifest es único.
- El título, categoría, prioridad e imagen del Markdown coinciden con su entrada de manifest.
- Las imágenes existen y su nombre coincide con `imageFile`.
- No existe ya un archivo de artículo con el mismo slug; así se evita sustituir accidentalmente una publicación anterior.

### 2. Importar artículos e imágenes desde el manifest

El importador reutilizable es `scripts/import-manifest-editorial.mjs`. Valida primero todo el lote y solo después copia imágenes y genera Markdown.

```powershell
node scripts/import-manifest-editorial.mjs `
  'C:\ruta\lote\editorial.md' `
  'C:\ruta\lote\manifest.json' `
  'C:\ruta\lote\images' `
  'content/articles/es' `
  'public/images/articles'
```

El script normaliza la fecha simple del lote a una fecha ISO con zona horaria (`T08:00:00+02:00`) y deja las rutas de imagen en la forma pública requerida por Next.js:

```yaml
heroImage: "/images/articles/mi-imagen.png"
```

No se deben copiar imágenes directamente en componentes ni usar URLs externas para este flujo. Los archivos dentro de `public/` se sirven desde la raíz del sitio y los componentes existentes usan `next/image` para las tarjetas y portada.

### 3. Validar contenido, tipos y rutas estáticas

```powershell
npm test
npm run build
```

`npm test` ejecuta `validate:content` y las pruebas de descubrimiento de artículos. `npm run build` comprueba TypeScript y genera todas las rutas estáticas, incluyendo `/es/article/<slug>`.

Si se añade un lote, se actualiza el número esperado del test de contenido en `tests/articles.test.ts` y se añade una comprobación representativa de un slug nuevo.

### 4. Sincronizar el índice de Neon

La web se puede construir desde Markdown, pero la capa de tendencias y los eventos de lectura usan Neon. Después de validar el contenido, hay que sincronizarlo:

```powershell
# DATABASE_URL debe existir en el entorno del proceso.
npm run sync:articles
```

La sincronización recorre los tres directorios de idioma y realiza actualizaciones idempotentes en Neon mediante Drizzle:

- `articles`: artículo canónico, fecha, imagen, prioridad, destacado y urgente.
- `article_translations`: título, descripción, slug y ruta por idioma.
- `categories`, `tags` y `article_tags`.
- `article_sources` para las fuentes de la edición española.
- `article_stats`, creando la fila inicial de estadísticas si todavía no existe.

En local, si la conexión está solo en `.env.local`, hay que cargarla sin imprimir secretos. GitHub Actions debe recibir `DATABASE_URL` desde GitHub Secrets; nunca se debe versionar ese valor.

```powershell
$line = Get-Content .env.local | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$env:DATABASE_URL = $line.Substring('DATABASE_URL='.Length).Trim('"')
npm run sync:articles
```

## Despliegue actual

Después de las validaciones y la sincronización, el despliegue manual actual es:

```powershell
npx vercel --prod --yes
```

El comando crea un build remoto y asigna el resultado a `https://eleven-football.vercel.app`. La publicación se considera completada únicamente si Vercel informa de estado `READY`.

## Automatización recomendada con GitHub Actions

El flujo recomendado separa validación y publicación:

```text
ZIP editorial → importación/commit → pull request → CI de validación
                                         ↓ merge a main
                                  sincronización Neon → despliegue Vercel
```

### Flujo de validación en pull requests

Se ejecuta cuando cambian `content/articles/**`, `public/images/articles/**`, scripts editoriales o tests:

```yaml
name: Validate editorial content

on:
  pull_request:
    paths:
      - 'content/articles/**'
      - 'public/images/articles/**'
      - 'scripts/**'
      - 'tests/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
```

### Flujo de publicación al hacer merge en `main`

La sincronización de Neon debe ocurrir antes de publicar el frontend, de manera que los artículos nuevos puedan recibir eventos y entrar en las tendencias desde el primer despliegue.

```yaml
name: Publish editorial batch

on:
  push:
    branches: [main]
    paths:
      - 'content/articles/**'
      - 'public/images/articles/**'
      - 'scripts/**'
      - 'lib/db/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run sync:articles
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Para el frontend hay dos alternativas, y se debe escoger solo una:

1. Conectar el repositorio a Vercel. Cada `push` a `main` activa el deploy de producción automáticamente. Es la opción preferida y no requiere un token de Vercel en GitHub.
2. Desplegar desde la propia Action con `vercel pull`, `vercel build --prod` y `vercel deploy --prebuilt --prod`. Esta opción requiere `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` como secrets.

No se deben ejecutar ambas alternativas: producirían dos despliegues por el mismo commit.

## Secretos y permisos necesarios

| Secret o configuración | Dónde se usa | Finalidad |
| --- | --- | --- |
| `DATABASE_URL` | Acción de publicación | Sincronizar índices y estadísticas con Neon |
| Integración GitHub–Vercel | Vercel | Deploy automático tras el merge |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Solo si se usa Vercel CLI en Actions | Desplegar desde GitHub Actions |

El workflow de pull request no necesita acceso a producción ni a Neon. Mantenerlo sin secretos reduce el riesgo y permite validar contribuciones sin permisos de publicación.

## Lista de comprobación de publicación

- [ ] El manifest está presente y todos los artículos están en `READY_TO_PUBLISH`.
- [ ] Todas las imágenes indicadas por el manifest existen.
- [ ] `npm test` termina correctamente.
- [ ] `npm run build` termina correctamente.
- [ ] `npm run sync:articles` termina correctamente en producción.
- [ ] El deployment de Vercel termina en `READY`.
- [ ] Una URL de artículo nuevo carga, por ejemplo `/es/article/<slug>`.
