import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import {EditorialManifestSchema, readPngMetadata} from '../lib/editorial-batch.ts';
import {ArticleFrontmatterSchema} from '../lib/articles.ts';
import {countWords, isReasonableWordCount, readingTimeFromWordCount} from '../lib/editorial-metrics.ts';

const allowedTopLevel = new Set(['manifest.json', 'editorial-report.md', 'articles', 'images']);
const fail = (code, message) => { throw new Error(`${code}: ${message}`); };
const assertRegularFile = (file, code = 'INVALID_FILE') => {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(code, file);
};
const readUtf8 = (file) => { try { assertRegularFile(file); return fs.readFileSync(file, 'utf8'); } catch (error) { if ((error?.message ?? '').startsWith('INVALID_FILE:')) throw error; return fail('MISSING_FILE', file); } };
const assertDirectory = (directory, label) => { if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) fail('MISSING_DIRECTORY', `${label}: ${directory}`); };

function resolveInside(root, relative) {
  if (path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').includes('..')) fail('PATH_TRAVERSAL', relative);
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) fail('PATH_TRAVERSAL', relative);
  return target;
}

function listFiles(directory) { return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => { const target = path.join(directory, entry.name); if (entry.isSymbolicLink() || !entry.isDirectory() && !entry.isFile()) fail('UNEXPECTED_BATCH_FILE', target); return entry.isDirectory() ? listFiles(target) : [target]; }); }

function assertBatchShape(batchDirectory, manifest) {
  for (const name of fs.readdirSync(batchDirectory)) if (!allowedTopLevel.has(name)) fail('UNEXPECTED_BATCH_FILE', name);
  const report = path.join(batchDirectory, 'editorial-report.md');
  if (!fs.existsSync(report)) fail('MISSING_EDITORIAL_REPORT', report);
  const articleDirectory = path.join(batchDirectory, 'articles');
  const imageDirectory = path.join(batchDirectory, 'images');
  assertDirectory(articleDirectory, 'articles'); assertDirectory(imageDirectory, 'images');
  for (const file of listFiles(articleDirectory)) if (path.extname(file) !== '.md' || path.dirname(file) !== articleDirectory) fail('UNEXPECTED_BATCH_FILE', path.relative(batchDirectory, file));
  for (const file of listFiles(imageDirectory)) if (path.extname(file) !== '.png' || path.dirname(file) !== imageDirectory) fail('UNEXPECTED_BATCH_FILE', path.relative(batchDirectory, file));
  const articleFiles = new Set(manifest.articles.map((article) => article.articleFile));
  const imageFiles = new Set(manifest.articles.map((article) => article.imageFile));
  for (const file of fs.readdirSync(articleDirectory)) if (!articleFiles.has(`articles/${file}`)) fail('UNEXPECTED_BATCH_FILE', `articles/${file}`);
  for (const file of fs.readdirSync(imageDirectory)) if (!imageFiles.has(`images/${file}`)) fail('UNEXPECTED_BATCH_FILE', `images/${file}`);
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const filesIdentical = (left, right) => fs.existsSync(left) && fs.existsSync(right) && fs.statSync(left).size === fs.statSync(right).size && sha256(left) === sha256(right);
const existingSlugs = (contentDirectory) => fs.existsSync(contentDirectory) ? new Set(fs.readdirSync(contentDirectory).filter((file) => file.endsWith('.md')).map((file) => path.basename(file, '.md'))) : new Set();

export function validateBatch(batchDirectory, contentDirectory, imageDestination) {
  const batchRoot = path.resolve(batchDirectory); const contentRoot = path.resolve(contentDirectory); const imageRoot = path.resolve(imageDestination);
  assertDirectory(batchRoot, 'batch');
  const manifest = EditorialManifestSchema.parse(JSON.parse(readUtf8(path.join(batchRoot, 'manifest.json'))));
  if (path.basename(batchRoot) !== manifest.date) fail('BATCH_DATE_MISMATCH', `${path.basename(batchRoot)} != ${manifest.date}`);
  assertBatchShape(batchRoot, manifest);
  const publishedSlugs = existingSlugs(contentRoot); const duplicateHashes = new Map();
  const prepared = manifest.articles.map((entry) => {
    const articlePath = resolveInside(batchRoot, entry.articleFile); const imagePath = resolveInside(batchRoot, entry.imageFile);
    if (!fs.existsSync(articlePath)) fail('MISSING_ARTICLE', entry.articleFile); if (!fs.existsSync(imagePath)) fail('MISSING_IMAGE', entry.imageFile);
    assertRegularFile(articlePath); assertRegularFile(imagePath);
    if (path.basename(articlePath) !== `${entry.slug}.md`) fail('ARTICLE_FILENAME_MISMATCH', entry.articleFile); if (path.basename(imagePath) !== `${entry.slug}.png`) fail('IMAGE_FILENAME_MISMATCH', entry.imageFile);
    const rawArticle = readUtf8(articlePath); const parsed = matter(rawArticle); const frontmatter = ArticleFrontmatterSchema.parse(parsed.data);
    if (!parsed.content.trim()) fail('EMPTY_ARTICLE_BODY', entry.slug);
    for (const field of ['slug', 'title', 'category', 'homepagePriority', 'storyState']) if (frontmatter[field] !== entry[field]) fail('MANIFEST_FRONTMATTER_MISMATCH', `${entry.slug}.${field}`);
    if (frontmatter.heroImage !== `/images/articles/${entry.slug}.png`) fail('HERO_IMAGE_MISMATCH', entry.slug);
    const wordCount = countWords(parsed.content);
    if (!isReasonableWordCount(entry.wordCount, wordCount)) fail('WORD_COUNT_MISMATCH', `${entry.slug}: manifest ${entry.wordCount}, actual ${wordCount}`);
    if (frontmatter.readingTime !== readingTimeFromWordCount(wordCount)) fail('READING_TIME_MISMATCH', entry.slug);
    for (const relatedSlug of [frontmatter.updateOf, frontmatter.relatedPublishedSlug]) if (relatedSlug && !publishedSlugs.has(relatedSlug)) fail('MISSING_RELATED_PUBLISHED_SLUG', `${entry.slug} -> ${relatedSlug}`);
    const png = readPngMetadata(imagePath);
    if (png.width !== 1536 || png.height !== 864) fail('INVALID_IMAGE_DIMENSIONS', `${entry.slug}: ${png.width}x${png.height}`);
    if (duplicateHashes.has(png.sha256)) fail('DUPLICATE_IMAGE', `${entry.slug} and ${duplicateHashes.get(png.sha256)}`); duplicateHashes.set(png.sha256, entry.slug);
    return {entry, rawArticle, articlePath, imagePath, articleTarget: path.join(contentRoot, `${entry.slug}.md`), imageTarget: path.join(imageRoot, `${entry.slug}.png`)};
  });
  return {manifest, prepared};
}

export function importBatch(batchDirectory, contentDirectory, imageDestination, {allowExistingIdentical = false} = {}) {
  const result = validateBatch(batchDirectory, contentDirectory, imageDestination);
  for (const article of result.prepared) {
    const articleExists = fs.existsSync(article.articleTarget); const imageExists = fs.existsSync(article.imageTarget);
    if (!articleExists && !imageExists) continue;
    if (!allowExistingIdentical || !filesIdentical(article.articlePath, article.articleTarget) || !filesIdentical(article.imagePath, article.imageTarget)) fail('EXISTING_ARTICLE_CONFLICT', article.entry.slug);
  }
  fs.mkdirSync(contentDirectory, {recursive: true}); fs.mkdirSync(imageDestination, {recursive: true});
  const stagingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eleven-editorial-'));
  try {
    for (const article of result.prepared) { fs.writeFileSync(path.join(stagingDirectory, `${article.entry.slug}.md`), article.rawArticle); fs.copyFileSync(article.imagePath, path.join(stagingDirectory, `${article.entry.slug}.png`)); }
    for (const article of result.prepared) { if (!fs.existsSync(article.articleTarget)) fs.copyFileSync(path.join(stagingDirectory, `${article.entry.slug}.md`), article.articleTarget); if (!fs.existsSync(article.imageTarget)) fs.copyFileSync(path.join(stagingDirectory, `${article.entry.slug}.png`), article.imageTarget); }
  } finally { fs.rmSync(stagingDirectory, {recursive: true, force: true}); }
  return result;
}

function parseCli(argumentsList) {
  const allowExistingIdentical = argumentsList.includes('--allow-existing-identical'); const values = argumentsList.filter((argument) => argument !== '--allow-existing-identical');
  if (values.length !== 3) fail('USAGE', 'tsx scripts/import-manifest-editorial.mjs <batch-directory> <content-directory> <image-directory> [--allow-existing-identical]');
  return {batchDirectory: values[0], contentDirectory: values[1], imageDirectory: values[2], allowExistingIdentical};
}

// tsx does not preserve import.meta.url for this .mjs entrypoint on every
// supported platform. argv[1] remains stable and keeps library imports inert.
if (process.argv[1] && path.basename(process.argv[1]) === 'import-manifest-editorial.mjs') { const options = parseCli(process.argv.slice(2)); const result = importBatch(options.batchDirectory, options.contentDirectory, options.imageDirectory, options); console.log(JSON.stringify({batchId: result.manifest.batchId, articles: result.prepared.length, status: 'IMPORTED'})); }
