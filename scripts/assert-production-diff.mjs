import {execFileSync} from 'node:child_process';

const [repository] = process.argv.slice(2);
if (!repository) throw new Error('USAGE: node scripts/assert-production-diff.mjs <repository>');
const changed = execFileSync('git', ['-C', repository, 'status', '--porcelain'], {encoding: 'utf8'}).split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
const allowed = (file) => /^content\/articles\/es\/[a-z0-9-]+\.md$/.test(file) || /^public\/images\/articles\/[a-z0-9-]+\.png$/.test(file);
const unexpected = changed.filter((file) => !allowed(file));
if (unexpected.length) throw new Error(`UNEXPECTED_PRODUCTION_DIFF: ${unexpected.join(', ')}`);
if (!changed.length) throw new Error('EMPTY_PRODUCTION_DIFF');
console.log(JSON.stringify({changed}));
