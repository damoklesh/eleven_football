import path from 'node:path';
import {validateBatch} from './import-manifest-editorial.mjs';

const [batchDirectory] = process.argv.slice(2);
if (!batchDirectory) throw new Error('USAGE: tsx scripts/validate-editorial-batch.mjs <batch-directory>');
const result = validateBatch(batchDirectory, path.join(process.cwd(), 'content/articles/es'), path.join(process.cwd(), 'public/images/articles'));
const counts = result.manifest.articles.reduce((accumulator, article) => ({...accumulator, [article.storyState]: (accumulator[article.storyState] ?? 0) + 1}), {});
console.log(JSON.stringify({batchId: result.manifest.batchId, date: result.manifest.date, articles: result.prepared.length, states: counts, status: 'VALID'}));
