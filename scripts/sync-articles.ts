import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {and, eq} from 'drizzle-orm';
import {db} from '../lib/db/client';
import {getArticleRelations, ArticleFrontmatterSchema} from '../lib/articles';
import {articleRelations, articleSources, articleTags, articleTranslations, articles, articleStats, categories, tags} from '../lib/db/schema';
import {locales, type Locale} from '../lib/i18n';

if (!db) throw new Error('DATABASE_URL is required to sync articles.');
const root = path.join(process.cwd(), 'content', 'articles');
const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function getCategoryId(name: string) {
  const slug = slugify(name);
  await db!.insert(categories).values({slug, name}).onConflictDoUpdate({target: categories.slug, set: {name}});
  const row = await db!.select({id: categories.id}).from(categories).where(eq(categories.slug, slug)).limit(1);
  return row[0]!.id;
}

async function getArticleId(canonicalSlug: string) {
  const row = await db!.select({id: articles.id}).from(articles).where(eq(articles.canonicalSlug, canonicalSlug)).limit(1);
  if (!row[0]) throw new Error(`Missing article ${canonicalSlug}.`);
  return row[0].id;
}

async function syncFile(locale: Locale, file: string) {
  const relative = path.join('content', 'articles', locale, file).replaceAll('\\', '/');
  const canonicalSlug = file.replace(/\.md$/, '');
  const parsed = matter(fs.readFileSync(path.join(root, locale, file), 'utf8'));
  const article = ArticleFrontmatterSchema.parse(parsed.data);
  const categoryId = await getCategoryId(article.category);
  const publishedAt = new Date(article.date);
  await db!.insert(articles).values({canonicalSlug, categoryId, author: article.author, publishedAt, updatedAt: article.updatedAt ? new Date(article.updatedAt) : undefined, firstPublishedAt: publishedAt, heroImage: article.heroImage, featured: article.featured, breaking: article.breaking, homepagePriority: article.homepagePriority, readingTime: article.readingTime, storyState: article.storyState}).onConflictDoUpdate({target: articles.canonicalSlug, set: {categoryId, author: article.author, publishedAt, updatedAt: article.updatedAt ? new Date(article.updatedAt) : undefined, heroImage: article.heroImage, featured: article.featured, breaking: article.breaking, homepagePriority: article.homepagePriority, readingTime: article.readingTime, storyState: article.storyState}});
  const articleId = await getArticleId(canonicalSlug);
  await db!.insert(articleTranslations).values({articleId, locale, slug: article.slug, title: article.title, seoTitle: article.seoTitle, description: article.description, heroAlt: article.heroAlt, contentPath: relative}).onConflictDoUpdate({target: [articleTranslations.articleId, articleTranslations.locale], set: {slug: article.slug, title: article.title, seoTitle: article.seoTitle, description: article.description, heroAlt: article.heroAlt, contentPath: relative, updatedAt: new Date()}});
  await db!.insert(articleStats).values({articleId}).onConflictDoNothing();
  await db!.delete(articleTags).where(eq(articleTags.articleId, articleId));
  for (const name of article.tags) {
    const slug = slugify(name);
    await db!.insert(tags).values({slug, name}).onConflictDoUpdate({target: tags.slug, set: {name}});
    const tag = await db!.select({id: tags.id}).from(tags).where(eq(tags.slug, slug)).limit(1);
    if (tag[0]) await db!.insert(articleTags).values({articleId, tagId: tag[0].id}).onConflictDoNothing();
  }
  if (locale === 'es') {
    await db!.delete(articleSources).where(eq(articleSources.articleId, articleId));
    for (const [position, source] of article.sources.entries()) await db!.insert(articleSources).values({articleId, name: source.name, url: source.url, position: position + 1}).onConflictDoNothing();
  }
}

async function syncRelations() {
  const spanishDirectory = path.join(root, 'es');
  for (const file of fs.readdirSync(spanishDirectory).filter((candidate) => candidate.endsWith('.md'))) {
    const canonicalSlug = file.replace(/\.md$/, '');
    const parsed = matter(fs.readFileSync(path.join(spanishDirectory, file), 'utf8'));
    const article = ArticleFrontmatterSchema.parse(parsed.data);
    const articleId = await getArticleId(canonicalSlug);
    for (const relationType of ['update_of', 'related_published'] as const) await db!.delete(articleRelations).where(and(eq(articleRelations.articleId, articleId), eq(articleRelations.relationType, relationType)));
    for (const relation of getArticleRelations(article)) {
      const relatedArticleId = await getArticleId(relation.slug);
      await db!.insert(articleRelations).values({articleId, relatedArticleId, relationType: relation.type, position: 0}).onConflictDoNothing();
    }
  }
}

async function main() {
  for (const locale of locales) {
    const directory = path.join(root, locale);
    for (const file of fs.readdirSync(directory).filter((candidate) => candidate.endsWith('.md'))) await syncFile(locale, file);
  }
  await syncRelations();
  console.log('Synced Markdown index, story states and relations to Neon.');
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
