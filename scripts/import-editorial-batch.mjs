import fs from 'node:fs';
import path from 'node:path';

const [sourceFile, outputDirectory] = process.argv.slice(2);
if (!sourceFile || !outputDirectory) {
  throw new Error('Usage: node scripts/import-editorial-batch.mjs <batch.md> <content-directory>');
}

const heroImages = [
  'dzeko-el-ultimo-dragon.png',
  'el-dia-que-nacio-el-gol-olimpico.png',
  'ser-prodigio-tambien-cansa.png',
  'dieciseis-dias-que-cambian-el-calendario.png',
  'football-leaks-manchester-city-recurso.png',
  'mundial-clubes-femenino-calendario-2028.png',
  'caicedo-shaw-city-real-madrid-tactica.png',
  'espana-campeona-mundo-continuidad-tactica.png',
  'zidane-francia-primeros-cambios.png',
  'real-madrid-corre-menos-dato-contexto.png',
  'fomboni-15-de-agosto-champions-africana.png',
  'caf-100000-dolares-previas.png',
  'argentina-despues-messi-repartir-funciones.png',
  'champions-africana-mapa-clubes-segunda-previa.png',
  'colores-camisetas-selecciones-historia.png',
];

const source = fs.readFileSync(sourceFile, 'utf8');
const entries = source.split(/^## \d+ — /m).slice(1);
if (entries.length !== heroImages.length) {
  throw new Error(`Expected ${heroImages.length} articles; found ${entries.length}.`);
}

const articles = entries.map((entry, index) => {
  const metadata = entry.match(/### Publication metadata\s*```yaml\s*([\s\S]*?)```/);
  const article = entry.match(/### Artículo\s*\r?\n([\s\S]*?)(?=\r?\n### Fuentes|\r?\n---\r?\n|$)/);
  if (!metadata || !article) throw new Error(`Could not parse article ${index + 1}.`);
  const slug = metadata[1].match(/^slug:\s*"([^"]+)"/m)?.[1];
  if (!slug) throw new Error(`Missing slug in article ${index + 1}.`);
  const frontmatter = metadata[1].trimEnd().replace(/\r?\n$/, '');
  const heroImage = `/images/articles/${heroImages[index]}`;
  return { slug, source: `---\n${frontmatter}\nheroImage: "${heroImage}"\nheroAlt: "Imagen editorial para ${slug}"\n---\n\n${article[1].trim()}\n` };
});

const slugs = new Set();
for (const article of articles) {
  if (slugs.has(article.slug)) throw new Error(`Duplicate slug: ${article.slug}`);
  slugs.add(article.slug);
}

fs.mkdirSync(outputDirectory, { recursive: true });
for (const file of fs.readdirSync(outputDirectory)) {
  if (file.endsWith('.md')) fs.unlinkSync(path.join(outputDirectory, file));
}
for (const article of articles) {
  fs.writeFileSync(path.join(outputDirectory, `${article.slug}.md`), article.source);
}
console.log(`Imported ${articles.length} articles.`);
