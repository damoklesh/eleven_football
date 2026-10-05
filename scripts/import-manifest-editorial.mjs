import fs from 'node:fs';
import path from 'node:path';

const [batchFile, manifestFile, imageDirectory, contentDirectory, publicImageDirectory] = process.argv.slice(2);
if (!batchFile || !manifestFile || !imageDirectory || !contentDirectory || !publicImageDirectory) {
  throw new Error('Usage: node scripts/import-manifest-editorial.mjs <batch.md> <manifest.json> <images> <content-directory> <public-images>');
}

const source = fs.readFileSync(batchFile, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const entries = source.split(/^# \d+\. /m).slice(1);
if (entries.length !== manifest.articles.length) {
  throw new Error(`Manifest has ${manifest.articles.length} articles; editorial file has ${entries.length}.`);
}

function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*["']?([^"'\\r\\n]+)`,'m'));
  return match?.[1]?.trim();
}

const articles = entries.map((entry, index) => {
  const metadata = entry.match(/\n---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*?)(?=\r?\n## Fuentes|$)/);
  if (!metadata) throw new Error(`Could not parse article ${index + 1}.`);
  const frontmatter = metadata[1].trim();
  const body = metadata[2].trim();
  const expected = manifest.articles[index];
  const slug = field(frontmatter, 'slug');
  const imageName = path.basename(field(frontmatter, 'heroImage') ?? '');
  const date = field(frontmatter, 'date');
  if (!slug || !imageName || !date) throw new Error(`Missing slug, date or heroImage in article ${index + 1}.`);
  if (slug !== expected.slug) throw new Error(`Slug mismatch at article ${index + 1}: ${slug} != ${expected.slug}`);
  if (field(frontmatter, 'title') !== expected.title) throw new Error(`Title mismatch for ${slug}.`);
  if (field(frontmatter, 'category') !== expected.category) throw new Error(`Category mismatch for ${slug}.`);
  if (Number(field(frontmatter, 'homepagePriority')) !== expected.homepagePriority) throw new Error(`Priority mismatch for ${slug}.`);
  if (imageName !== path.basename(expected.imageFile)) throw new Error(`Image mismatch for ${slug}.`);
  const normalizedFrontmatter = frontmatter
    .replace(/^date:\s*["']?\d{4}-\d{2}-\d{2}["']?\s*$/m, `date: "${date}T08:00:00+02:00"`)
    .replace(/^heroImage:\s*["'][^"']+["']/m, `heroImage: "/images/articles/${imageName}"`);
  return {slug, imageName, source: `---\n${normalizedFrontmatter}\n---\n\n${body}\n`};
});

const seen = new Set();
for (const article of articles) {
  if (seen.has(article.slug)) throw new Error(`Duplicate slug: ${article.slug}`);
  seen.add(article.slug);
  const target = path.join(contentDirectory, `${article.slug}.md`);
  if (fs.existsSync(target)) throw new Error(`Article already exists: ${article.slug}`);
  const sourceImage = path.join(imageDirectory, article.imageName);
  if (!fs.existsSync(sourceImage)) throw new Error(`Missing image: ${sourceImage}`);
}

fs.mkdirSync(contentDirectory, {recursive: true});
fs.mkdirSync(publicImageDirectory, {recursive: true});
for (const article of articles) {
  fs.copyFileSync(path.join(imageDirectory, article.imageName), path.join(publicImageDirectory, article.imageName));
  fs.writeFileSync(path.join(contentDirectory, `${article.slug}.md`), article.source);
}
console.log(`Imported ${articles.length} manifest articles and images.`);
