import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {countWords, readingTimeFromWordCount} from '../lib/editorial-metrics';
import {importBatch} from '../scripts/import-manifest-editorial.mjs';

function png(width = 1536, height = 864, seed = 'a') {
  const image = Buffer.alloc(32); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image); image.writeUInt32BE(13, 8); image.write('IHDR', 12); image.writeUInt32BE(width, 16); image.writeUInt32BE(height, 20); image.write(seed, 24);
  return image;
}

function setup(slugs = ['primera-pieza'], archiveCheck = 'ARCHIVE_CHECK_OK_WEB_CRAWL') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eleven-import-test-')); const batch = path.join(root, '2026-10-06'); const articles = path.join(batch, 'articles'); const images = path.join(batch, 'images'); const destination = path.join(root, 'content'); const imageDestination = path.join(root, 'public-images');
  fs.mkdirSync(articles, {recursive: true}); fs.mkdirSync(images, {recursive: true}); fs.writeFileSync(path.join(batch, 'editorial-report.md'), '# Report');
  const manifest = {schemaVersion: 2, batchId: 'ELEVEN-2026-10-06', date: '2026-10-06', locale: 'es', archiveCheck, sourceSite: 'https://eleven-football.vercel.app/', articles: slugs.map((slug, index) => createArticle({slug, index, articles, images}))};
  writeManifest(batch, manifest); return {root, batch, articles, images, destination, imageDestination, manifest};
}

function createArticle({slug, index, articles, images}: {slug: string; index: number; articles: string; images: string}) {
  const body = `Esta es una pieza editorial de prueba sobre fútbol, contexto, táctica y una conclusión proporcionada número ${index + 1}.`;
  const entry = {title: `Pieza ${index + 1}`, slug, status: 'READY_TO_PUBLISH', storyState: 'NEW', category: 'Táctica', homepagePriority: 90 - index, articleFile: `articles/${slug}.md`, imageFile: `images/${slug}.png`, wordCount: countWords(body), writingProfile: 'ANALISTA_PIZARRA', styleVector: {reporting: 40, analysis: 90, narrative: 20, wit: 5, edge: 20, lyricism: 5}, openingType: 'TACTICAL_OBSERVATION', researchConfidence: 'HIGH', factCheck: 'PASS'};
  const frontmatter = `---\ntitle: "${entry.title}"\nslug: "${slug}"\ndescription: "Descripción de prueba."\ndate: "2026-10-06T08:00:00+02:00"\ncategory: "Táctica"\ntags: ["prueba"]\nauthor: "ELEVEN"\nfeatured: false\nbreaking: false\ntrending: false\nhomepagePriority: ${entry.homepagePriority}\nreadingTime: ${readingTimeFromWordCount(entry.wordCount)}\nstoryState: "NEW"\nheroImage: "/images/articles/${slug}.png"\nheroAlt: "Prueba"\nsources:\n  - name: "Fuente"\n    url: "https://example.com/source"\n---\n\n${body}\n`;
  fs.writeFileSync(path.join(articles, `${slug}.md`), frontmatter); fs.writeFileSync(path.join(images, `${slug}.png`), png(1536, 864, String(index)));
  return entry;
}

function writeManifest(batch: string, manifest: unknown) { fs.writeFileSync(path.join(batch, 'manifest.json'), JSON.stringify(manifest, null, 2)); }
function run(fixture: ReturnType<typeof setup>, ...extra: string[]) { try { importBatch(fixture.batch, fixture.destination, fixture.imageDestination, {allowExistingIdentical: extra.includes('--allow-existing-identical')}); return {status: 0, stderr: ''}; } catch (error) { return {status: 1, stderr: String(error)}; } }
function cleanup(fixture: ReturnType<typeof setup>) { fs.rmSync(fixture.root, {recursive: true, force: true}); }

test('valid v2 batch imports all articles and images', () => { const fixture = setup(['primera-pieza', 'segunda-pieza']); try { const result = run(fixture); assert.equal(result.status, 0, result.stderr); for (const article of fixture.manifest.articles) { assert.ok(fs.existsSync(path.join(fixture.destination, `${article.slug}.md`))); assert.ok(fs.existsSync(path.join(fixture.imageDestination, `${article.slug}.png`))); } } finally { cleanup(fixture); } });

test('all supported archive check outcomes are valid', () => {
  for (const archiveCheck of ['ARCHIVE_CHECK_OK_WEB_CRAWL', 'ARCHIVE_CHECK_OK_FEED', 'ARCHIVE_CHECK_OK_SITEMAP', 'ARCHIVE_CHECK_UNAVAILABLE']) {
    const fixture = setup(['primera-pieza'], archiveCheck);
    try { assert.equal(run(fixture).status, 0, archiveCheck); } finally { cleanup(fixture); }
  }
});

test('invalid batches fail before any target is written', () => {
  const cases: Array<[string, (fixture: ReturnType<typeof setup>) => void]> = [
    ['duplicate slug', (fixture) => { fixture.manifest.articles.push({...fixture.manifest.articles[0]}); writeManifest(fixture.batch, fixture.manifest); }],
    ['missing article', (fixture) => fs.rmSync(path.join(fixture.articles, 'primera-pieza.md'))],
    ['missing image', (fixture) => fs.rmSync(path.join(fixture.images, 'primera-pieza.png'))],
    ['wrong image filename', (fixture) => { fixture.manifest.articles[0].imageFile = 'images/other.png'; writeManifest(fixture.batch, fixture.manifest); }],
    ['wrong article filename', (fixture) => { fixture.manifest.articles[0].articleFile = 'articles/other.md'; writeManifest(fixture.batch, fixture.manifest); }],
    ['wrong resolution', (fixture) => fs.writeFileSync(path.join(fixture.images, 'primera-pieza.png'), png(1200, 675))],
    ['manifest frontmatter slug mismatch', (fixture) => { const article = path.join(fixture.articles, 'primera-pieza.md'); fs.writeFileSync(article, fs.readFileSync(article, 'utf8').replace('slug: "primera-pieza"', 'slug: "otra-pieza"')); }],
    ['title mismatch', (fixture) => { const article = path.join(fixture.articles, 'primera-pieza.md'); fs.writeFileSync(article, fs.readFileSync(article, 'utf8').replace('title: "Pieza 1"', 'title: "Otro título"')); }],
    ['category mismatch', (fixture) => { const article = path.join(fixture.articles, 'primera-pieza.md'); fs.writeFileSync(article, fs.readFileSync(article, 'utf8').replace('category: "Táctica"', 'category: "Datos"')); }],
    ['invalid story state', (fixture) => { fixture.manifest.articles[0].storyState = 'INVALID'; writeManifest(fixture.batch, fixture.manifest); }],
    ['invalid updateOf', (fixture) => { fixture.manifest.articles[0].storyState = 'UPDATE'; (fixture.manifest.articles[0] as {updateOf?: string}).updateOf = 'Not a slug'; writeManifest(fixture.batch, fixture.manifest); }],
    ['path traversal', (fixture) => { fixture.manifest.articles[0].articleFile = '../outside.md'; writeManifest(fixture.batch, fixture.manifest); }],
  ];
  for (const [label, mutate] of cases) { const fixture = setup(); try { mutate(fixture); const result = run(fixture); assert.notEqual(result.status, 0, label); assert.ok(!fs.existsSync(fixture.destination), `${label} must not create content destination`); assert.ok(!fs.existsSync(fixture.imageDestination), `${label} must not create image destination`); } finally { cleanup(fixture); } }
});

test('duplicate image hashes and existing conflicting content fail', () => {
  const duplicate = setup(['primera-pieza', 'segunda-pieza']); try { fs.copyFileSync(path.join(duplicate.images, 'primera-pieza.png'), path.join(duplicate.images, 'segunda-pieza.png')); assert.notEqual(run(duplicate).status, 0); } finally { cleanup(duplicate); }
  const conflict = setup(); try { fs.mkdirSync(conflict.destination, {recursive: true}); fs.writeFileSync(path.join(conflict.destination, 'primera-pieza.md'), 'different'); assert.notEqual(run(conflict).status, 0); } finally { cleanup(conflict); }
});

test('existing identical article and image are allowed only in recovery mode', () => { const fixture = setup(); try { assert.equal(run(fixture).status, 0); assert.notEqual(run(fixture).status, 0); assert.equal(run(fixture, '--allow-existing-identical').status, 0); } finally { cleanup(fixture); } });

test('UPDATE validates its published relation', () => { const fixture = setup(); try { fixture.manifest.articles[0].storyState = 'UPDATE'; (fixture.manifest.articles[0] as {updateOf?: string}).updateOf = 'published-piece'; const article = path.join(fixture.articles, 'primera-pieza.md'); fs.writeFileSync(article, fs.readFileSync(article, 'utf8').replace('storyState: "NEW"', 'storyState: "UPDATE"\nupdateOf: "published-piece"')); writeManifest(fixture.batch, fixture.manifest); assert.notEqual(run(fixture).status, 0); fs.mkdirSync(fixture.destination, {recursive: true}); fs.writeFileSync(path.join(fixture.destination, 'published-piece.md'), '---\ntitle: "Old"\nslug: "published-piece"\ndescription: "Old"\ndate: "2026-01-01T08:00:00+02:00"\ncategory: "Táctica"\n---\nOld'); assert.equal(run(fixture).status, 0); } finally { cleanup(fixture); } });
