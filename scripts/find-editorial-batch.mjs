import fs from 'node:fs';
import path from 'node:path';
import {EditorialManifestSchema} from '../lib/editorial-batch.ts';

const [inboxDirectory] = process.argv.slice(2);
if (!inboxDirectory) throw new Error('USAGE: tsx scripts/find-editorial-batch.mjs <editorial-inbox-directory>');
const inbox = path.resolve(inboxDirectory);
if (!fs.existsSync(inbox)) throw new Error(`MISSING_EDITORIAL_INBOX: ${inbox}`);
const batches = fs.readdirSync(inbox, {withFileTypes: true})
  .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
  .map((entry) => {
    const directory = path.join(inbox, entry.name);
    const manifestPath = path.join(directory, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error(`MISSING_MANIFEST: ${directory}`);
    const manifest = EditorialManifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
    if (manifest.date !== entry.name || manifest.batchId !== `ELEVEN-${entry.name}`) throw new Error(`BATCH_ID_MISMATCH: ${directory}`);
    return {directory, manifest};
  });
if (batches.length !== 1) throw new Error(`AMBIGUOUS_EDITORIAL_BATCH: expected exactly 1 batch, found ${batches.length}.`);
console.log(JSON.stringify({directory: batches[0].directory, date: batches[0].manifest.date, batchId: batches[0].manifest.batchId, articleCount: batches[0].manifest.articles.length}));
