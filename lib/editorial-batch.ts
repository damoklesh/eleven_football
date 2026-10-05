import crypto from 'node:crypto';
import fs from 'node:fs';
import {z} from 'zod';

export const categories = ['Actualidad', 'Táctica', 'Historias', 'Archivo', 'Cultura', 'Jugadores', 'Clubes', 'Datos'] as const;
export const StoryStateSchema = z.enum(['NEW', 'UPDATE', 'EVERGREEN_REVISIT']);
export const WritingProfileSchema = z.enum(['REPORTERO_CAMPO', 'ANALISTA_PIZARRA', 'CRONISTA', 'EXPLICADOR_NITIDO', 'FILO_ELEVEN']);
// Opening formats evolve with the editorial desk. Keep the contract explicit
// without making an otherwise valid batch depend on a code release.
export const OpeningTypeSchema = z.string().regex(/^[A-Z]+(?:_[A-Z]+)*$/, 'openingType must be an uppercase identifier.');
export const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case.');

export const StyleVectorSchema = z.object({
  reporting: z.number().int().min(0).max(100),
  analysis: z.number().int().min(0).max(100),
  narrative: z.number().int().min(0).max(100),
  wit: z.number().int().min(0).max(100),
  edge: z.number().int().min(0).max(100),
  lyricism: z.number().int().min(0).max(100),
}).strict();

export const EditorialManifestArticleSchema = z.object({
  title: z.string().min(1),
  slug: SlugSchema,
  status: z.literal('READY_TO_PUBLISH'),
  storyState: StoryStateSchema,
  category: z.enum(categories),
  homepagePriority: z.number().int().min(0).max(100),
  articleFile: z.string().min(1),
  imageFile: z.string().min(1),
  wordCount: z.number().int().positive(),
  writingProfile: WritingProfileSchema,
  styleVector: StyleVectorSchema,
  openingType: OpeningTypeSchema,
  researchConfidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  factCheck: z.enum(['PASS', 'PASS_WITH_CAVEATS']),
  updateOf: SlugSchema.optional(),
  relatedPublishedSlug: SlugSchema.optional(),
}).strict().superRefine((article, context) => {
  if (article.articleFile !== `articles/${article.slug}.md`) context.addIssue({code: z.ZodIssueCode.custom, path: ['articleFile'], message: 'articleFile must be articles/<slug>.md.'});
  if (article.imageFile !== `images/${article.slug}.png`) context.addIssue({code: z.ZodIssueCode.custom, path: ['imageFile'], message: 'imageFile must be images/<slug>.png.'});
  if (article.storyState === 'UPDATE' && !article.updateOf) context.addIssue({code: z.ZodIssueCode.custom, path: ['updateOf'], message: 'UPDATE articles require updateOf.'});
  if (article.storyState === 'EVERGREEN_REVISIT' && !article.relatedPublishedSlug) context.addIssue({code: z.ZodIssueCode.custom, path: ['relatedPublishedSlug'], message: 'EVERGREEN_REVISIT articles require relatedPublishedSlug.'});
  if (article.storyState === 'NEW' && (article.updateOf || article.relatedPublishedSlug)) context.addIssue({code: z.ZodIssueCode.custom, message: 'NEW articles cannot declare published-story relations.'});
  if (article.updateOf === article.slug || article.relatedPublishedSlug === article.slug) context.addIssue({code: z.ZodIssueCode.custom, message: 'An article cannot relate to itself.'});
});

export const EditorialManifestSchema = z.object({
  schemaVersion: z.literal(2),
  batchId: z.string().regex(/^ELEVEN-\d{4}-\d{2}-\d{2}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locale: z.literal('es'),
  archiveCheck: z.enum([
    'ARCHIVE_CHECK_OK_WEB_CRAWL',
    'ARCHIVE_CHECK_OK_FEED',
    'ARCHIVE_CHECK_OK_SITEMAP',
    'ARCHIVE_CHECK_UNAVAILABLE',
  ]),
  sourceSite: z.string().url(),
  articles: z.array(EditorialManifestArticleSchema).min(1),
}).strict().superRefine((manifest, context) => {
  if (manifest.batchId !== `ELEVEN-${manifest.date}`) context.addIssue({code: z.ZodIssueCode.custom, path: ['batchId'], message: 'batchId must match the batch date.'});
  const seen = new Set<string>();
  for (const [index, article] of manifest.articles.entries()) {
    if (seen.has(article.slug)) context.addIssue({code: z.ZodIssueCode.custom, path: ['articles', index, 'slug'], message: 'Duplicate slug in manifest.'});
    seen.add(article.slug);
  }
});

export type EditorialManifest = z.infer<typeof EditorialManifestSchema>;
export type EditorialManifestArticle = z.infer<typeof EditorialManifestArticleSchema>;
export type StoryState = z.infer<typeof StoryStateSchema>;

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function readPngMetadata(file: string) {
  const header = fs.readFileSync(file);
  if (header.length < 24 || !header.subarray(0, 8).equals(pngSignature)) throw new Error(`INVALID_PNG_SIGNATURE: ${file}`);
  if (header.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`INVALID_PNG_HEADER: ${file}`);
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
    sha256: crypto.createHash('sha256').update(header).digest('hex'),
  };
}
