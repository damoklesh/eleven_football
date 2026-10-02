import fs from 'node:fs';
import path from 'node:path';

const [sourceFile, imageDirectory, contentDirectory, publicImageDirectory] = process.argv.slice(2);
if (!sourceFile || !imageDirectory || !contentDirectory || !publicImageDirectory) {
  throw new Error('Usage: node scripts/import-incremental-editorial.mjs <batch.md> <image-directory> <content-directory> <public-image-directory>');
}

const source = fs.readFileSync(sourceFile, 'utf8');
const entries = source.split(/^## \d+ — /m).slice(1);
if (!entries.length) throw new Error('No editorial entries found.');

const articles = entries.map((entry, index) => {
  const metadata = entry.match(/### Publication metadata\s*```yaml\s*([\s\S]*?)```/);
  const article = entry.match(/### Artículo\s*\r?\n([\s\S]*?)(?=\r?\n### Fuentes|\r?\n---\r?\n|$)/);
  if (!metadata || !article) throw new Error(`Could not parse article ${index + 1}.`);

  const frontmatter = metadata[1].trim().replace(/\r?\n---\s*$/, '');
  const slug = frontmatter.match(/^slug:\s*"([^"]+)"/m)?.[1];
  const heroImage = frontmatter.match(/^heroImage:\s*"([^"]+)"/m)?.[1];
  const heroAlt = frontmatter.match(/^heroAlt:\s*"([^"]+)"/m)?.[1] || `Imagen editorial para ${slug}`;
  if (!slug || !heroImage) throw new Error(`Missing slug or heroImage in article ${index + 1}.`);

  const imageName = path.basename(heroImage);
  const normalizedFrontmatter = frontmatter
    .replace(/^heroImage:\s*"[^"]+"/m, `heroImage: "/images/articles/${imageName}"`)
    .replace(/^heroAlt:\s*"[^"]+"/m, `heroAlt: "${heroAlt}"`);

  return {
    slug,
    source: `---\n${normalizedFrontmatter}\n---\n\n${article[1].trim()}\n`,
    imageName,
  };
});

const seen = new Set();
for (const article of articles) {
  if (seen.has(article.slug)) throw new Error(`Duplicate slug in batch: ${article.slug}`);
  seen.add(article.slug);
  const target = path.join(contentDirectory, `${article.slug}.md`);
  if (fs.existsSync(target)) throw new Error(`Article already exists: ${article.slug}`);
}

fs.mkdirSync(contentDirectory, {recursive: true});
fs.mkdirSync(publicImageDirectory, {recursive: true});
for (const article of articles) {
  const sourceImage = path.join(imageDirectory, article.imageName);
  const targetImage = path.join(publicImageDirectory, article.imageName);
  if (!fs.existsSync(sourceImage)) throw new Error(`Missing image: ${sourceImage}`);
  fs.copyFileSync(sourceImage, targetImage);
  fs.writeFileSync(path.join(contentDirectory, `${article.slug}.md`), article.source);
}

console.log(`Imported ${articles.length} incremental articles and images.`);
