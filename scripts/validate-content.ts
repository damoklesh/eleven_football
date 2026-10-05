import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {getArticleRelations, ArticleFrontmatterSchema} from '../lib/articles';
import {locales} from '../lib/i18n';
import {readPngMetadata} from '../lib/editorial-batch';

const root = path.join(process.cwd(), 'content', 'articles');

function fail(message: string): never { throw new Error(message); }

try {
  const spanishSlugs = new Set(fs.readdirSync(path.join(root, 'es')).filter((file) => file.endsWith('.md')).map((file) => path.basename(file, '.md')));
  let count = 0;
  for (const locale of locales) {
    const directory = path.join(root, locale);
    const slugs = new Set<string>();
    for (const file of fs.readdirSync(directory).filter((candidate) => candidate.endsWith('.md'))) {
      const parsed = matter(fs.readFileSync(path.join(directory, file), 'utf8'));
      const article = ArticleFrontmatterSchema.parse(parsed.data);
      const filenameSlug = path.basename(file, '.md');
      if (article.slug !== filenameSlug) fail(`${locale}/${file}: slug must match filename.`);
      if (slugs.has(article.slug)) fail(`${locale}/${file}: duplicate slug.`);
      slugs.add(article.slug);
      if (!parsed.content.trim()) fail(`${locale}/${file}: empty article body.`);
      if (article.heroImage) {
        const image = path.join(process.cwd(), 'public', article.heroImage.replace(/^\//, ''));
        if (!fs.existsSync(image)) fail(`${locale}/${file}: missing hero image ${article.heroImage}.`);
        const metadata = readPngMetadata(image);
        if (Object.hasOwn(parsed.data, 'storyState') && (metadata.width !== 1536 || metadata.height !== 864)) fail(`${locale}/${file}: v2 hero image must be 1536x864.`);
      }
      if (locale === 'es') for (const relation of getArticleRelations(article)) {
        if (!spanishSlugs.has(relation.slug)) fail(`${locale}/${file}: missing ${relation.type} target ${relation.slug}.`);
      }
      count += 1;
    }
  }
  if (!count) fail('No articles found.');
  console.log(`Validated ${count} localized articles.`);
} catch (error) {
  console.error(`Content validation failed: ${(error as Error).message}`);
  process.exit(1);
}
